import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trash2, Star, AlertCircle, Zap, Pencil, Check, X, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CardBrandIcon from "./CardBrandIcon";
import ChargeCardDialog from "./ChargeCardDialog";

interface PaymentCard {
  id: string;
  card_type: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  bank: string | null;
  brand: string | null;
  is_default: boolean;
  nickname: string | null;
}

interface SavedCardsSectionProps {
  onCardCharged?: (amount: number) => void;
}

const SavedCardsSection = ({ onCardCharged }: SavedCardsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<PaymentCard | null>(null);
  const [editingNicknameId, setEditingNicknameId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [cardToCharge, setCardToCharge] = useState<PaymentCard | null>(null);

  useEffect(() => {
    if (user) {
      fetchCards();
    }
  }, [user]);

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_cards")
        .select("*")
        .eq("user_id", user?.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    setSettingDefaultId(cardId);
    try {
      await supabase
        .from("payment_cards")
        .update({ is_default: false })
        .eq("user_id", user?.id);

      const { error } = await supabase
        .from("payment_cards")
        .update({ is_default: true })
        .eq("id", cardId);

      if (error) throw error;

      toast({
        title: "Default Card Updated",
        description: "Your default payment card has been changed",
      });

      fetchCards();
    } catch (error: any) {
      console.error("Error setting default card:", error);
      toast({
        title: "Error",
        description: "Failed to update default card",
        variant: "destructive",
      });
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;

    setDeletingId(cardToDelete.id);
    try {
      const { error } = await supabase
        .from("payment_cards")
        .delete()
        .eq("id", cardToDelete.id);

      if (error) throw error;

      toast({
        title: "Card Removed",
        description: `Card ending in ${cardToDelete.last4} has been removed`,
      });

      setCards(cards.filter((c) => c.id !== cardToDelete.id));
    } catch (error: any) {
      console.error("Error deleting card:", error);
      toast({
        title: "Error",
        description: "Failed to remove card",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setCardToDelete(null);
    }
  };

  const handleStartEditNickname = (card: PaymentCard) => {
    setEditingNicknameId(card.id);
    setNicknameInput(card.nickname || "");
  };

  const handleSaveNickname = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from("payment_cards")
        .update({ nickname: nicknameInput.trim() || null })
        .eq("id", cardId);

      if (error) throw error;

      setCards(cards.map(c => 
        c.id === cardId ? { ...c, nickname: nicknameInput.trim() || null } : c
      ));

      toast({
        title: "Card Updated",
        description: "Card nickname has been saved",
      });
    } catch (error) {
      console.error("Error saving nickname:", error);
      toast({
        title: "Error",
        description: "Failed to save nickname",
        variant: "destructive",
      });
    } finally {
      setEditingNicknameId(null);
      setNicknameInput("");
    }
  };

  const handleChargeCard = (card: PaymentCard) => {
    setCardToCharge(card);
    setChargeDialogOpen(true);
  };

  const handleChargeSuccess = (amount: number) => {
    toast({
      title: "Card Charged Successfully! 🎉",
      description: `₦${amount.toLocaleString()} has been added to your wallet`,
    });
    onCardCharged?.(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Payment Methods</CardTitle>
          <CardDescription>Your saved cards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="w-12 h-8 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="w-20 h-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Payment Methods</CardTitle>
          <CardDescription>
            {cards.length > 0
              ? "Manage your saved payment cards"
              : "Cards are saved automatically when you make a payment"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No saved cards yet</p>
              <p className="text-sm text-muted-foreground">
                Your cards will appear here after making a payment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <CardBrandIcon brand={card.brand} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingNicknameId === card.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={nicknameInput}
                            onChange={(e) => setNicknameInput(e.target.value)}
                            placeholder="Enter nickname..."
                            className="h-8 text-sm max-w-[200px]"
                            maxLength={30}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleSaveNickname(card.id)}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingNicknameId(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {card.nickname || `•••• ${card.last4}`}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleStartEditNickname(card)}
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </Button>
                          {card.is_default && (
                            <Badge variant="default" className="gap-1">
                              <Star className="w-3 h-3" />
                              Default
                            </Badge>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {card.brand} •••• {card.last4} · Expires {card.exp_month}/{card.exp_year}
                        {card.bank && ` · ${card.bank}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleChargeCard(card)}
                      className="gap-1"
                    >
                      <Zap className="w-4 h-4" />
                      <span className="hidden sm:inline">Quick Top-up</span>
                      <span className="sm:hidden">Top-up</span>
                    </Button>
                    {!card.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(card.id)}
                        disabled={settingDefaultId === card.id}
                      >
                        {settingDefaultId === card.id ? "..." : "Set Default"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCardToDelete(card)}
                      disabled={deletingId === card.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Remove Payment Card
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the card{" "}
              <strong>{cardToDelete?.nickname || `ending in ${cardToDelete?.last4}`}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Charge Card Dialog */}
      <ChargeCardDialog
        open={chargeDialogOpen}
        onOpenChange={setChargeDialogOpen}
        card={cardToCharge}
        email={user?.email || ""}
        onSuccess={handleChargeSuccess}
      />
    </>
  );
};

export default SavedCardsSection;
