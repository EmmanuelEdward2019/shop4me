import { useState, useEffect } from "react";
import { Star, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PostDeliveryReviewDialogProps {
  orderId: string;
  agentId: string;
  buyerId: string;
  locationName: string;
  onReviewSubmitted?: () => void;
}

const PostDeliveryReviewDialog = ({
  orderId,
  agentId,
  buyerId,
  locationName,
  onReviewSubmitted,
}: PostDeliveryReviewDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    const checkAndPrompt = async () => {
      if (!orderId || !buyerId || !agentId) return;

      const { data } = await supabase
        .from("agent_reviews")
        .select("id")
        .eq("order_id", orderId)
        .eq("buyer_id", buyerId)
        .maybeSingle();

      if (data) {
        setAlreadyReviewed(true);
        return;
      }

      // Show dialog after a short delay for a smooth experience
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    };

    checkAndPrompt();
  }, [orderId, buyerId, agentId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("agent_reviews").insert({
        order_id: orderId,
        agent_id: agentId,
        buyer_id: buyerId,
        rating,
        review_text: reviewText.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Thank You! 🎉",
        description: "Your review helps us improve our service.",
      });
      setOpen(false);
      onReviewSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit review.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyReviewed) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center font-display text-xl">
            Your Order Has Been Delivered! 🎉
          </DialogTitle>
          <DialogDescription className="text-center">
            How was your shopping experience from <strong>{locationName}</strong>? 
            Your feedback helps our agents serve you better.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Star Rating */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-125 focus:outline-none"
              >
                <Star
                  className={cn(
                    "w-10 h-10 transition-colors",
                    (hoveredRating || rating) >= star
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm font-medium text-primary">
              {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
            </p>
          )}

          {/* Review Text */}
          <Textarea
            placeholder="Tell us more about your experience (optional)..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            className="resize-none"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostDeliveryReviewDialog;
