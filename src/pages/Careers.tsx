import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/support/WhatsAppButton";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, Clock, Users, Heart, Zap, TrendingUp, Shield } from "lucide-react";

const openPositions = [
  {
    title: "Senior Software Engineer",
    department: "Engineering",
    location: "Port Harcourt / Remote",
    type: "Full-time",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Port Harcourt / Remote",
    type: "Full-time",
  },
  {
    title: "Operations Manager",
    department: "Operations",
    location: "Port Harcourt",
    type: "Full-time",
  },
  {
    title: "Customer Support Lead",
    department: "Support",
    location: "Port Harcourt",
    type: "Full-time",
  },
];

const benefits = [
  { icon: Heart, title: "Health Insurance", description: "Comprehensive coverage for you and family" },
  { icon: TrendingUp, title: "Growth Opportunities", description: "Career development and learning budget" },
  { icon: Clock, title: "Flexible Hours", description: "Work when you're most productive" },
  { icon: Shield, title: "Paid Time Off", description: "Generous vacation and sick leave policy" },
];

const Careers = () => {
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
                  Careers
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                  Build the Future of <span className="text-gradient">Commerce</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  Join our team and help transform how Nigerians shop. 
                  We're looking for passionate people to shape the future of personal shopping.
                </p>
                <Button size="lg" asChild>
                  <a href="#positions">View Open Positions</a>
                </Button>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Why Join Us */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Why Join Shop4Me?
                </h2>
                <p className="text-lg text-muted-foreground">
                  We're building something meaningful while taking care of our team
                </p>
              </div>
            </ScrollAnimation>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <ScrollAnimation key={benefit.title} delay={index * 0.1}>
                  <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section id="positions" className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Open Positions
                </h2>
                <p className="text-lg text-muted-foreground">
                  Find your next opportunity with us
                </p>
              </div>
            </ScrollAnimation>

            <div className="max-w-3xl mx-auto space-y-4">
              {openPositions.map((position, index) => (
                <ScrollAnimation key={position.title} delay={index * 0.1}>
                  <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">{position.title}</h3>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {position.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {position.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {position.type}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline">Apply Now</Button>
                    </div>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* Become an Agent CTA */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                  Want to Become a Shopping Agent?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Earn money by helping people shop. Set your own hours and work in areas you know best.
                </p>
                <Button size="lg" asChild>
                  <Link to="/for-agents">Learn About Being an Agent</Link>
                </Button>
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

export default Careers;
