import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ScrollAnimation, StaggerContainer, StaggerItem } from "@/components/ui/scroll-animation";
import { MapPin, ListChecks, Camera, Truck, CheckCircle, Clock, Shield, CreditCard } from "lucide-react";
import VideoSection from "@/components/landing/VideoSection";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: MapPin,
    title: "1. Choose Your Location",
    description: "Select from malls, supermarkets, or local markets across Nigeria. We've got agents stationed everywhere.",
    details: [
      "Browse 50+ supported locations",
      "Filter by market type: Malls, Markets, Supermarkets",
      "See real-time agent availability",
    ],
  },
  {
    icon: ListChecks,
    title: "2. Submit Your Shopping List",
    description: "Tell us what you need - groceries, electronics, fashion, anything! No fixed catalog means unlimited choices.",
    details: [
      "Free-form shopping list",
      "Attach reference images or links",
      "Specify quantities and preferences",
    ],
  },
  {
    icon: Camera,
    title: "3. Approve Before Purchase",
    description: "Your agent confirms prices and sends photos. You approve each item before payment. Full transparency.",
    details: [
      "Real-time price confirmations",
      "Photo verification of every item",
      "Chat with your agent for clarifications",
    ],
  },
  {
    icon: CreditCard,
    title: "4. Make Secure Payment",
    description: "Pay securely using your preferred method. We hold payment until you confirm delivery.",
    details: [
      "Multiple payment options",
      "Wallet balance for quick checkout",
      "Transaction protection guaranteed",
    ],
  },
  {
    icon: Truck,
    title: "5. Receive Your Items",
    description: "Track your order in real-time. We deliver to your doorstep with digital receipts and proof of delivery.",
    details: [
      "Real-time order tracking",
      "Digital receipts included",
      "OTP-verified delivery",
    ],
  },
];

const guarantees = [
  {
    icon: Shield,
    title: "100% Secure",
    description: "Your payments and data are protected with bank-grade security",
  },
  {
    icon: CheckCircle,
    title: "Quality Guaranteed",
    description: "Not happy? We'll make it right with our satisfaction guarantee",
  },
  {
    icon: Clock,
    title: "Same-Day Delivery",
    description: "Orders placed before 2 PM are delivered the same day",
  },
];

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <ScrollAnimation>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6">
                How Shop4Me Works
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                From your shopping list to your doorstep in 5 simple steps. 
                No catalog limits, no compromises.
              </p>
            </ScrollAnimation>
          </div>
        </section>

        {/* Video Section */}
        <VideoSection />

        {/* Steps */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  The Complete Journey
                </h2>
                <p className="text-lg text-muted-foreground">
                  Every step designed for your convenience and peace of mind
                </p>
              </div>
            </ScrollAnimation>

            <div className="max-w-4xl mx-auto space-y-8">
              {steps.map((step, index) => (
                <ScrollAnimation key={step.title} delay={index * 0.1}>
                  <div className="bg-card rounded-2xl p-6 md:p-8 border border-border hover:shadow-glow transition-all duration-300">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-xl bg-hero-gradient flex items-center justify-center">
                          <step.icon className="w-8 h-8 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-2">
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {step.description}
                        </p>
                        <ul className="space-y-2">
                          {step.details.map((detail) => (
                            <li key={detail} className="flex items-center gap-2 text-sm text-foreground">
                              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* Guarantees */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Our Guarantees
                </h2>
              </div>
            </ScrollAnimation>

            <StaggerContainer className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {guarantees.map((guarantee) => (
                <StaggerItem key={guarantee.title}>
                  <div className="text-center p-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <guarantee.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h4 className="text-lg font-display font-bold text-foreground mb-2">
                      {guarantee.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {guarantee.description}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <ScrollAnimation delay={0.3}>
              <div className="text-center mt-12">
                <Button asChild size="xl" variant="hero">
                  <Link to="/">Start Shopping Now</Link>
                </Button>
              </div>
            </ScrollAnimation>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorksPage;
