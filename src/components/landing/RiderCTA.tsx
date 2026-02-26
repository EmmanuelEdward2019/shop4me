import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bike, MapPin, Zap, ShieldCheck } from "lucide-react";
import { ScrollAnimation, StaggerContainer, StaggerItem } from "@/components/ui/scroll-animation";

const perks = [
  {
    icon: Bike,
    title: "Ride & Earn",
    description: "Pick up orders from agents and deliver to customers.",
  },
  {
    icon: Zap,
    title: "Instant Alerts",
    description: "Get real-time pickup notifications nearby.",
  },
  {
    icon: MapPin,
    title: "GPS Verified",
    description: "Geofenced pickups ensure accuracy and trust.",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Supported",
    description: "Insurance, training, and 24/7 support included.",
  },
];

const RiderCTA = () => {
  return (
    <section className="py-20 md:py-32 bg-muted/50 relative overflow-hidden">
      <div className="absolute top-10 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Benefits Grid */}
          <StaggerContainer className="grid sm:grid-cols-2 gap-4 order-2 lg:order-1" staggerDelay={0.1}>
            {perks.map((perk) => (
              <StaggerItem key={perk.title}>
                <div className="bg-card rounded-xl p-5 border border-border hover:shadow-glow transition-all duration-300 h-full">
                  <perk.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="text-lg font-display font-bold text-foreground mb-1">
                    {perk.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {perk.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Content */}
          <ScrollAnimation direction="right" className="order-1 lg:order-2">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                Now Hiring Riders
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
                Deliver With <span className="text-gradient">Shop4Me</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Own a bike, keke, or car? Join our rider network and earn by delivering 
                orders across Port Harcourt. GPS-verified pickups, flexible hours, daily pay.
              </p>

              <Button asChild size="xl">
                <Link to="/rider-application">
                  <Bike className="w-5 h-5 mr-2" />
                  Apply as Rider
                </Link>
              </Button>
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
};

export default RiderCTA;
