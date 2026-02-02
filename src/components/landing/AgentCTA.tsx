import { Button } from "@/components/ui/button";
import { Briefcase, TrendingUp, Calendar, Award } from "lucide-react";

const benefits = [
  {
    icon: Briefcase,
    title: "Flexible Hours",
    description: "Work when you want, where you want.",
  },
  {
    icon: TrendingUp,
    title: "Earn More",
    description: "Competitive pay plus tips and bonuses.",
  },
  {
    icon: Calendar,
    title: "Weekly Payouts",
    description: "Get paid every week, directly to your account.",
  },
  {
    icon: Award,
    title: "Career Growth",
    description: "Top performers become team leads.",
  },
];

const AgentCTA = () => {
  return (
    <section id="agents" className="py-20 md:py-32 bg-hero-gradient relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-primary-foreground/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-semibold mb-4">
              Join Our Team
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-6">
              Become a Shop4Me Agent
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8 max-w-lg">
              Turn your knowledge of local markets into a rewarding career. 
              Help customers shop smarter while earning competitive pay.
            </p>

            <Button variant="hero-outline" size="xl">
              Apply Now
            </Button>
          </div>

          {/* Benefits Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-5 border border-primary-foreground/20 hover:bg-primary-foreground/15 transition-colors"
              >
                <benefit.icon className="w-8 h-8 text-secondary mb-3" />
                <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                  {benefit.title}
                </h3>
                <p className="text-sm text-primary-foreground/80">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AgentCTA;
