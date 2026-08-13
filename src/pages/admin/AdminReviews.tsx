import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star, MessageSquareText, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

interface ReviewRow {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  order_id: string;
  buyer_id: string;
  agent_id: string;
  buyer_name?: string;
  buyer_email?: string;
  agent_name?: string;
  agent_email?: string;
  location_name?: string;
}

const Stars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`h-4 w-4 ${
          n <= rating
            ? "fill-amber-400 text-amber-400"
            : "text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

const AdminReviews = () => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [avg, setAvg] = useState<number | null>(null);

  // Summary (total + average) — page-independent, one lightweight column.
  const fetchSummary = useCallback(async () => {
    const { data, count } = await supabase
      .from("agent_reviews")
      .select("rating", { count: "exact" });
    const ratings = (data ?? []).map((r) => Number(r.rating)).filter((n) => !Number.isNaN(n));
    setTotal(count ?? ratings.length);
    setAvg(ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null);
  }, []);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("agent_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;

      const list = (rows ?? []) as ReviewRow[];

      // Resolve buyer/agent names + order location in bulk.
      const userIds = Array.from(
        new Set(list.flatMap((r) => [r.buyer_id, r.agent_id]).filter(Boolean)),
      );
      const orderIds = Array.from(new Set(list.map((r) => r.order_id).filter(Boolean)));

      const [profilesRes, ordersRes] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        orderIds.length
          ? supabase.from("orders").select("id, location_name").in("id", orderIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profiles = profilesRes.data ?? [];
      const orders = ordersRes.data ?? [];

      setReviews(
        list.map((r) => {
          const buyer = profiles.find((p: any) => p.user_id === r.buyer_id);
          const agent = profiles.find((p: any) => p.user_id === r.agent_id);
          const order = orders.find((o: any) => o.id === r.order_id);
          return {
            ...r,
            buyer_name: buyer?.full_name,
            buyer_email: buyer?.email,
            agent_name: agent?.full_name,
            agent_email: agent?.email,
            location_name: order?.location_name,
          };
        }),
      );
    } catch (err) {
      console.error("Error loading reviews:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchReviews();
    fetchSummary();

    // Live updates — new reviews land as customers complete orders.
    const channel = supabase
      .channel("admin-agent-reviews")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_reviews" },
        () => {
          fetchReviews();
          fetchSummary();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReviews, fetchSummary]);

  const avgRating = avg !== null ? avg.toFixed(1) : "—";
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const hasNext = (page + 1) * PAGE_SIZE < total;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Reviews</h1>
          <p className="text-muted-foreground">
            Feedback customers leave after a completed order — use it to improve service.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reviews</CardDescription>
              <CardTitle className="text-3xl">{total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Rating</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                {avgRating}
                {avgRating !== "—" && (
                  <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Reviews</CardTitle>
            <CardDescription>Most recent first.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquareText className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No customer reviews yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rating</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Stars rating={Number(r.rating)} />
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                          {r.review_text ? (
                            <p className="text-sm text-foreground/90">{r.review_text}</p>
                          ) : (
                            <span className="text-xs text-muted-foreground">No comment</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{r.buyer_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.buyer_email}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{r.agent_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.agent_email}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">#{String(r.order_id).slice(0, 8)}</p>
                          {r.location_name && (
                            <p className="text-xs text-muted-foreground">{r.location_name}</p>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {total > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {from}–{to} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNext || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminReviews;
