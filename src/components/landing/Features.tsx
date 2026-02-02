import { Shield, Clock, Receipt, Users, TrendingUp, HeadphonesIcon } from "lucide-react";
import { ScrollAnimation, StaggerContainer, StaggerItem } from "@/components/ui/scroll-animation";

const features = [
  {
    icon: Shield,
    title: "Verified Pricing",
    description:
      "See item prices and photos before you pay. No hidden fees, no surprises.",
  },
  {
    icon: Clock,
    title: "Real-Time Tracking",
    description:
      "Follow your order from shopping to delivery with live status updates.",
  },
  {
    icon: Receipt,
    title: "Digital Receipts",
    description:
      "Get itemized receipts with photos for every purchase. Full transparency.",
  },
  {
    icon: Users,
    title: "Trusted Agents",
    description:
      "Our Shop4Me agents are trained, verified, and rated by customers.",
  },
  {
    icon: TrendingUp,
    title: "Price History",
    description:
      "Track market prices over time. We flag unusual markups automatically.",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support",
    description:
      "Need help? Our support team is always ready to assist you.",
  },
];

const Features = () => {
  return (
    <section className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <ScrollAnimation>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent-foreground text-sm font-semibold mb-4">
              Why Shop4Me
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Built on{" "}
              <span className="text-gradient">Trust & Transparency</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              We've reimagined shopping to give you complete control and confidence.
            </p>
          </div>
        </ScrollAnimation>

        {/* Features Grid */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1}>
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-soft transition-all duration-300 group h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default Features;
