import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, ShoppingCart, Clock } from "lucide-react";
import heroImage from "@/assets/hero-agent.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Shop4Me Agent at Nigerian Market"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/40" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-6 animate-fade-up">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-sm font-medium text-primary-foreground">
              Now serving Lagos, Abuja & Port Harcourt
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-tight mb-6 animate-fade-up [animation-delay:100ms]">
            Shop From{" "}
            <span className="relative inline-block">
              Any Market
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 200 12"
                fill="none"
              >
                <path
                  d="M2 10C50 4 150 4 198 10"
                  stroke="hsl(var(--accent))"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <br />
            Without Leaving Home
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-xl animate-fade-up [animation-delay:200ms]">
            Send your shopping list. Our trusted agents shop for you in real-time 
            from malls, shops, and local markets across Nigeria.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-up [animation-delay:300ms]">
            <Button variant="hero-outline" size="xl">
              Start Shopping
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="xl"
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              Become an Agent
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap gap-6 animate-fade-up [animation-delay:400ms]">
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <MapPin className="w-5 h-5" />
              <span className="text-sm">50+ Markets</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm">10,000+ Orders</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <Clock className="w-5 h-5" />
              <span className="text-sm">Same-Day Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
};

export default Hero;
