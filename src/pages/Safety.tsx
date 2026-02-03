import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/support/WhatsAppButton";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Shield, 
  UserCheck, 
  Lock, 
  Eye, 
  AlertTriangle, 
  MessageCircle,
  CheckCircle,
  CreditCard
} from "lucide-react";
import safetyVerificationImage from "@/assets/safety-verification.jpg";

const safetyFeatures = [
  {
    icon: UserCheck,
    title: "Verified Agents",
    description: "All agents undergo thorough background checks, ID verification, and training before joining our platform.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    description: "Your payment information is encrypted and processed through trusted payment providers. We never store your card details.",
  },
  {
    icon: Eye,
    title: "Real-Time Tracking",
    description: "Track your agent's location in real-time during delivery. Know exactly when your order will arrive.",
  },
  {
    icon: CreditCard,
    title: "Protected Transactions",
    description: "Payments are held securely until you confirm delivery. Disputes are handled fairly and promptly.",
  },
];

const safetyTips = [
  "Only make payments through the Shop4Me app or website",
  "Never share your account password with anyone",
  "Verify agent identity through the app before accepting delivery",
  "Report any suspicious activity immediately",
  "Keep your delivery address updated and accurate",
  "Review your order details before confirming payment",
];

const Safety = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-3xl mx-auto">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                  Safety & Trust
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                  Your <span className="text-gradient">Safety</span> is Our Priority
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  We've built Shop4Me with multiple layers of protection to ensure every 
                  shopping experience is safe, secure, and reliable.
                </p>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Safety Features */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  How We Keep You Safe
                </h2>
              </div>
            </ScrollAnimation>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {safetyFeatures.map((feature, index) => (
                <ScrollAnimation key={feature.title} delay={index * 0.1}>
                  <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* Agent Verification */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
              <ScrollAnimation>
                <div>
                  <Shield className="w-12 h-12 text-primary mb-4" />
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                    Our Agent Verification Process
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Government-issued ID verification</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Background check and reference verification</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Mandatory training on platform policies</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Ongoing performance monitoring and reviews</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">Community rating system for accountability</p>
                    </div>
                  </div>
                </div>
              </ScrollAnimation>

              <ScrollAnimation delay={0.2}>
                <div className="space-y-6">
                  <img 
                    src={safetyVerificationImage} 
                    alt="Verified agent with ID badge ensuring safe delivery" 
                    className="w-full aspect-[16/9] object-cover rounded-3xl"
                  />
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 text-center">
                    <div className="text-4xl font-display font-bold text-primary mb-1">100%</div>
                    <p className="text-muted-foreground text-sm">Verified Agents</p>
                  </div>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* Safety Tips */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <ScrollAnimation>
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                    Safety Tips for Users
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Follow these best practices for a safe shopping experience
                  </p>
                </div>
              </ScrollAnimation>

              <div className="space-y-3">
                {safetyTips.map((tip, index) => (
                  <ScrollAnimation key={tip} delay={index * 0.05}>
                    <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground">{tip}</span>
                    </div>
                  </ScrollAnimation>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Report Issue */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto p-8 rounded-3xl bg-card border border-border">
                <AlertTriangle className="w-12 h-12 text-secondary mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                  Report a Safety Concern
                </h2>
                <p className="text-muted-foreground mb-6">
                  If you experience any safety issues or suspicious activity, please report it immediately. 
                  Our team is available 24/7 to assist you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Report on WhatsApp
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/contact">Contact Support</Link>
                  </Button>
                </div>
              </div>
            </ScrollAnimation>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Safety;
