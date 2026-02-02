import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AgentReviewFormProps {
  orderId: string;
  agentId: string;
  buyerId: string;
  onReviewSubmitted?: () => void;
}

const AgentReviewForm = ({
  orderId,
  agentId,
  buyerId,
  onReviewSubmitted,
}: AgentReviewFormProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating before submitting.",
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
        title: "Review Submitted",
        description: "Thank you for rating your shopping experience!",
      });
      onReviewSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Rate Your Experience</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            How was your shopping experience with this agent?
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
              >
                <Star
                  className={cn(
                    "w-8 h-8 transition-colors",
                    (hoveredRating || rating) >= star
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-primary font-medium">
              {rating === 5
                ? "Excellent!"
                : rating === 4
                ? "Great!"
                : rating === 3
                ? "Good"
                : rating === 2
                ? "Fair"
                : "Poor"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="review-text" className="text-sm font-medium">
            Write a review (optional)
          </label>
          <Textarea
            id="review-text"
            placeholder="Share details about your experience with this agent..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgentReviewForm;
