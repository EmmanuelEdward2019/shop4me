import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, CheckCircle2 } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import AppDownloadButtons from "./AppDownloadButtons";

const perks = [
  "No hidden fees",
  "Real-time order updates",
  "Cancel anytime",
  "Verified agents",
];

const FinalCTA = () => {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <ScrollAnimation>
          <div className="relative bg-gradient-to-br from-primary/8 via-muted to-secondary/10 rounded-3xl border border-primary/20 p-8 md:p-16 text-center overflow-hidden shadow-soft">
            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/15 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <div className="relative z-10">
              {/* Badge */}
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                Get Started Today
              </span>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
                Ready to Shop Smarter?
              </h2>
              <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
                Join thousands of Nigerians getting their groceries, fashion, and more
                delivered from any market — without stepping outside.
              </p>

              {/* Perks */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
                {perks.map((perk) => (
                  <div key={perk} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    {perk}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button asChild variant="hero" size="xl">
                  <Link to="/get-started">
                    Start Shopping Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="xl">
                  <Link to="/contact">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Talk to Us
                  </Link>
                </Button>
              </div>

              {/* App downloads */}
              <div className="flex justify-center mb-5">
                <AppDownloadButtons variant="dark" />
              </div>

              <p className="text-sm text-muted-foreground">
                Free to join • No subscription • Pay only when you shop
              </p>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
};

export default FinalCTA;
