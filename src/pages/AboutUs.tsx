import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/support/WhatsAppButton";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Users, Target, Heart, Zap } from "lucide-react";
import aboutTeamImage from "@/assets/about-team.jpg";

const values = [
  {
    icon: Users,
    title: "Community First",
    description: "We empower local agents and connect them with customers who need their expertise.",
  },
  {
    icon: Target,
    title: "Reliability",
    description: "Every order is handled with care, ensuring your items arrive exactly as requested.",
  },
  {
    icon: Heart,
    title: "Trust",
    description: "Transparent pricing and verified agents build lasting relationships with our customers.",
  },
  {
    icon: Zap,
    title: "Efficiency",
    description: "From order to delivery, we optimize every step to save you time and effort.",
  },
];

const AboutUs = () => {
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
                  About Us
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                  Making Shopping <span className="text-gradient">Accessible</span> for Everyone
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Shop4Me bridges the gap between busy lives and traditional markets, 
                  bringing Nigeria's vibrant marketplaces to your doorstep.
                </p>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <ScrollAnimation>
                <div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                    Our Story
                  </h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Shop4Me was born from a simple observation: Nigerian markets offer the freshest 
                      produce, best prices, and most authentic goods—but not everyone has the time 
                      to visit them.
                    </p>
                    <p>
                      We started in Port Harcourt with a mission to connect skilled local shoppers 
                      with busy professionals, families, and anyone who values their time. Our 
                      agents know every corner of the markets, negotiate the best prices, and 
                      deliver with care.
                    </p>
                    <p>
                      Today, we're expanding across Nigeria, bringing the convenience of personal 
                      shopping to more cities while creating meaningful employment opportunities 
                      for thousands of agents.
                    </p>
                  </div>
                </div>
              </ScrollAnimation>
              <ScrollAnimation delay={0.2}>
                <div className="relative">
                  <img 
                    src={aboutTeamImage} 
                    alt="Shop4Me team collaborating in our office" 
                    className="w-full aspect-[4/3] object-cover rounded-3xl"
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm rounded-xl p-4 text-center">
                    <div className="text-3xl font-display font-bold text-primary mb-1">2024</div>
                    <p className="text-sm text-muted-foreground">Founded in Port Harcourt</p>
                  </div>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Our Values
                </h2>
                <p className="text-lg text-muted-foreground">
                  The principles that guide everything we do
                </p>
              </div>
            </ScrollAnimation>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <ScrollAnimation key={value.title} delay={index * 0.1}>
                  <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                    <p className="text-muted-foreground text-sm">{value.description}</p>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: "500+", label: "Active Agents" },
                { number: "10K+", label: "Orders Delivered" },
                { number: "50+", label: "Markets Covered" },
                { number: "4.8", label: "Average Rating" },
              ].map((stat, index) => (
                <ScrollAnimation key={stat.label} delay={index * 0.1}>
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-display font-bold text-primary mb-2">
                      {stat.number}
                    </div>
                    <p className="text-muted-foreground">{stat.label}</p>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default AboutUs;
