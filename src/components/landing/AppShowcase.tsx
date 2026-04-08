import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { motion } from "framer-motion";
import appDashboard from "@/assets/app-screenshot-dashboard.jpg";
import appShopping from "@/assets/app-screenshot-shopping.jpg";

const AppShowcase = () => {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollAnimation>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Mobile App
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Shop4Me in Your <span className="text-gradient">Pocket</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Place orders, track deliveries, and manage your wallet — all from our beautifully crafted mobile app.
            </p>
          </div>
        </ScrollAnimation>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-5xl mx-auto">
          {/* Dashboard Screenshot */}
          <ScrollAnimation direction="left">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-xl opacity-50" />
              <img
                src={appDashboard}
                alt="Shop4Me app dashboard showing wallet balance, quick actions, and active orders"
                className="relative rounded-2xl shadow-2xl w-full max-w-[360px] mx-auto"
                loading="lazy"
              />
              <div className="absolute -bottom-4 -right-4 bg-card border border-border rounded-xl px-4 py-2 shadow-lg">
                <p className="text-xs text-muted-foreground">Meet Your</p>
                <p className="text-sm font-display font-bold text-foreground">Personal Shoppers</p>
              </div>
            </motion.div>
          </ScrollAnimation>

          {/* Shopping List Screenshot */}
          <ScrollAnimation direction="right">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-br from-accent/20 to-primary/20 rounded-3xl blur-xl opacity-50" />
              <img
                src={appShopping}
                alt="Shop4Me shopping list interface showing item entry with quantities and units"
                className="relative rounded-2xl shadow-2xl w-full max-w-[360px] mx-auto"
                loading="lazy"
              />
              <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl px-4 py-2 shadow-lg">
                <p className="text-xs text-muted-foreground">Built on</p>
                <p className="text-sm font-display font-bold text-foreground">Trust & Transparency</p>
              </div>
            </motion.div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
};

export default AppShowcase;
