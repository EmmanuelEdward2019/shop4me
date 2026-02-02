import { useState } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, CheckCircle, Gift, Bell, Sparkles } from "lucide-react";

const benefits = [
  {
    icon: Gift,
    title: "Exclusive Offers",
    description: "Get access to special discounts and promotions only for subscribers",
  },
  {
    icon: Bell,
    title: "New Features First",
    description: "Be the first to know about new features and service expansions",
  },
  {
    icon: Sparkles,
    title: "Shopping Tips",
    description: "Receive tips on getting the best deals from markets and stores",
  },
];

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .insert({
          email: email.trim().toLowerCase(),
          full_name: fullName.trim() || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("This email is already subscribed!");
        } else {
          throw error;
        }
        return;
      }

      setIsSubscribed(true);
      toast.success("Successfully subscribed to our newsletter!");
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <section className="pt-32 pb-16 md:pt-40 md:pb-24">
            <div className="container mx-auto px-4">
              <div className="max-w-xl mx-auto text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  You're Subscribed!
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Thank you for subscribing to the Shop4Me newsletter. 
                  We'll keep you updated with the latest news and exclusive offers.
                </p>
                <Button asChild>
                  <a href="/">Back to Home</a>
                </Button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-3xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                  Stay in the <span className="text-gradient">Loop</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Subscribe to our newsletter for exclusive deals, shopping tips, 
                  and the latest updates from Shop4Me.
                </p>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Newsletter Form */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto">
              <ScrollAnimation>
                <div className="p-8 rounded-3xl bg-card border border-border">
                  <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
                    Subscribe to Our Newsletter
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name (Optional)</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Subscribing..." : "Subscribe Now"}
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      We respect your privacy. Unsubscribe at any time.
                    </p>
                  </form>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-12">
                Why Subscribe?
              </h2>
            </ScrollAnimation>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {benefits.map((benefit, index) => (
                <ScrollAnimation key={benefit.title} delay={index * 0.1}>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Newsletter;
