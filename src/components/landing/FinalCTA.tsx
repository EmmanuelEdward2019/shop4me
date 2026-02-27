import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import AppDownloadButtons from "./AppDownloadButtons";

const FinalCTA = () => {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <ScrollAnimation>
          <div className="relative bg-gradient-to-br from-primary/8 via-muted to-secondary/10 rounded-3xl border border-primary/20 p-8 md:p-16 text-center overflow-hidden shadow-soft">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/15 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
                Ready to Start Shopping?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of Nigerians who are already shopping smarter. 
                Your first order is on us – get ₦500 off!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button asChild variant="hero" size="xl">
                  <Link to="/get-started">
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="xl">
                  Talk to Sales
                </Button>
              </div>

              <div className="flex justify-center mb-6">
                <AppDownloadButtons variant="dark" />
              </div>

              <p className="text-sm text-muted-foreground">
                No credit card required • Start in under 2 minutes
              </p>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
};

export default FinalCTA;
