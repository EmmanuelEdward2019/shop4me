import { MapPin, ListChecks, Camera, Truck } from "lucide-react";
import { ScrollAnimation, StaggerContainer, StaggerItem } from "@/components/ui/scroll-animation";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: MapPin,
    title: "Pick a Store or Market",
    description:
      "Choose from malls, supermarkets, or local markets near you. Shoprite, Mile 3, Trade Fair — we have agents in them all.",
    color: "bg-primary",
  },
  {
    icon: ListChecks,
    title: "Send Your Shopping List",
    description:
      "Type anything you need — groceries, electronics, fashion, household items. No catalog limits. No minimum order.",
    color: "bg-secondary",
  },
  {
    icon: Camera,
    title: "Approve Items & Prices",
    description:
      "Your agent sends photos and real prices from the market. You approve each item before anything is bought. Zero surprises.",
    color: "bg-accent",
  },
  {
    icon: Truck,
    title: "Get It Delivered",
    description:
      "Track your order live as it moves from market to your door. Digital receipt included. Same-day delivery guaranteed.",
    color: "bg-primary",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <ScrollAnimation>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Shopping Made{" "}
              <span className="text-gradient">Effortless</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Four simple steps between your shopping list and your front door.{" "}
              <Link to="/how-it-works" className="text-primary hover:underline">
                Learn more →
              </Link>
            </p>
          </div>
        </ScrollAnimation>

        {/* Steps Grid */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-8" staggerDelay={0.15}>
          {steps.map((step, index) => (
            <StaggerItem key={step.title}>
              <div className="relative group h-full">
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-border to-transparent" />
                )}

                <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-glow transition-all duration-300 hover:-translate-y-1 h-full">
                  {/* Step Number */}
                  <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground border border-border">
                    {index + 1}
                  </span>

                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-xl ${step.color} flex items-center justify-center mb-4`}
                  >
                    <step.icon className="w-7 h-7 text-primary-foreground" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default HowItWorks;
