import { ScrollAnimation, StaggerContainer, StaggerItem } from "@/components/ui/scroll-animation";
import ImageCarousel from "./ImageCarousel";
import agentMarket from "@/assets/agent-market.jpg";
import agentVerifying from "@/assets/agent-verifying.jpg";
import deliveryAgent from "@/assets/delivery-agent.jpg";
import heroAgent from "@/assets/hero-agent.jpg";
import { Shield, Camera, Bike, UserCheck } from "lucide-react";

const agentImages = [
  {
    src: agentMarket,
    alt: "Shop4Me agent sourcing products at market",
    title: "Market Sourcing",
    subtitle: "Our agents find the best deals for you",
  },
  {
    src: agentVerifying,
    alt: "Shop4Me agent verifying products",
    title: "Product Verification",
    subtitle: "Photos sent for your approval before purchase",
  },
  {
    src: deliveryAgent,
    alt: "Shop4Me delivery agent on motorbike",
    title: "Swift Delivery",
    subtitle: "Same-day delivery to your doorstep",
  },
  {
    src: heroAgent,
    alt: "Shop4Me agent at Nigerian market",
    title: "Trusted Agents",
    subtitle: "Trained professionals in every location",
  },
];

const features = [
  {
    icon: Shield,
    title: "Verified & Trained",
    description: "All agents undergo rigorous background checks and training",
  },
  {
    icon: Camera,
    title: "Photo Verification",
    description: "Every item photographed for your approval before purchase",
  },
  {
    icon: Bike,
    title: "Fast Delivery",
    description: "Our delivery riders ensure same-day doorstep delivery",
  },
  {
    icon: UserCheck,
    title: "Dedicated Support",
    description: "Direct communication with your assigned shopping agent",
  },
];

const AgentsShowcase = () => {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <ScrollAnimation>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Our Agents
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Meet Your <span className="text-gradient">Personal Shoppers</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Dedicated Shop4Me agents ready to fulfill your orders with care and precision
            </p>
          </div>
        </ScrollAnimation>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollAnimation direction="left">
            <ImageCarousel images={agentImages} interval={4000} className="shadow-glow" />
          </ScrollAnimation>

          <div>
            <StaggerContainer className="grid sm:grid-cols-2 gap-6">
              {features.map((feature) => (
                <StaggerItem key={feature.title}>
                  <div className="bg-card rounded-xl p-5 border border-border hover:shadow-soft transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h4 className="text-lg font-display font-bold text-foreground mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AgentsShowcase;
