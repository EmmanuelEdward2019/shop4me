import { Link } from "react-router-dom";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ScrollAnimation, StaggerContainer, StaggerItem } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  Clock, 
  MapPin, 
  Shield, 
  TrendingUp, 
  Smartphone,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import agentMarket from "@/assets/agent-market.jpg";
import deliveryAgent from "@/assets/delivery-agent.jpg";

const benefits = [
  {
    icon: Wallet,
    title: "Competitive Earnings",
    description: "Earn ₦3,000 - ₦15,000 daily depending on order volume and location",
  },
  {
    icon: Clock,
    title: "Flexible Hours",
    description: "Work when you want. Set your own availability and accept orders that fit your schedule",
  },
  {
    icon: MapPin,
    title: "Local Operations",
    description: "Shop at markets and malls in your area. No long commutes required",
  },
  {
    icon: Shield,
    title: "Full Support",
    description: "Training, equipment, and 24/7 support to help you succeed",
  },
  {
    icon: TrendingUp,
    title: "Growth Opportunities",
    description: "Top performers become team leads with additional bonuses",
  },
  {
    icon: Smartphone,
    title: "Easy-to-Use App",
    description: "Our agent app makes order management and communication seamless",
  },
];

const requirements = [
  "Valid Nigerian ID (NIN, Voter's Card, or Driver's License)",
  "Smartphone with data connection",
  "Good knowledge of local markets and malls",
  "Excellent communication skills",
  "Reliable and trustworthy",
  "Age 18 or above",
];

const roles = [
  {
    title: "Shopping Agent",
    description: "Source products from markets and malls based on customer orders",
    image: agentMarket,
    earnings: "₦5,000 - ₦15,000/day",
  },
  {
    title: "Delivery Rider",
    description: "Deliver purchased items to customers across the city",
    image: deliveryAgent,
    earnings: "₦3,000 - ₦10,000/day",
  },
];

const ForAgentsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-hero-gradient">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <ScrollAnimation>
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-semibold mb-4">
                  Join Our Team
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6">
                  Become a Shop4Me Agent
                </h1>
                <p className="text-lg md:text-xl text-primary-foreground/90 mb-8">
                  Turn your market knowledge into income. Help customers shop from anywhere 
                  while earning competitive pay with flexible hours.
                </p>
                <Button asChild variant="hero-outline" size="xl">
                  <Link to="/agent-application">
                    Apply Now
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </ScrollAnimation>

              <ScrollAnimation direction="right" delay={0.2}>
                <img 
                  src={agentMarket} 
                  alt="Shop4Me Agent" 
                  className="rounded-2xl shadow-glow w-full"
                />
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Choose Your Role
                </h2>
                <p className="text-lg text-muted-foreground">
                  Two ways to earn with Shop4Me
                </p>
              </div>
            </ScrollAnimation>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {roles.map((role, index) => (
                <ScrollAnimation key={role.title} delay={index * 0.1}>
                  <div className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-glow transition-all duration-300">
                    <img 
                      src={role.image} 
                      alt={role.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-6">
                      <h3 className="text-xl font-display font-bold text-foreground mb-2">
                        {role.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {role.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-primary font-semibold">
                          {role.earnings}
                        </span>
                        <Button size="sm" asChild>
                          <Link to={role.title === "Delivery Rider" ? "/rider-application" : "/agent-application"}>
                            Apply
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Why Join <span className="text-gradient">Shop4Me</span>?
                </h2>
              </div>
            </ScrollAnimation>

            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit) => (
                <StaggerItem key={benefit.title}>
                  <div className="bg-card rounded-xl p-6 border border-border h-full">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-lg font-display font-bold text-foreground mb-2">
                      {benefit.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Requirements */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
              <ScrollAnimation>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                  What You Need to Get Started
                </h2>
                <ul className="space-y-4">
                  {requirements.map((req) => (
                    <li key={req} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{req}</span>
                    </li>
                  ))}
                </ul>
              </ScrollAnimation>

              <ScrollAnimation direction="right" delay={0.2}>
                <div className="bg-card rounded-2xl p-8 border border-border">
                  <h3 className="text-xl font-display font-bold text-foreground mb-4">
                    Ready to Apply?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Fill out our application form and we'll get back to you within 48 hours.
                  </p>
                  <Button size="lg" className="w-full" asChild>
                    <Link to="/agent-application">
                      Start Application
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ForAgentsPage;
