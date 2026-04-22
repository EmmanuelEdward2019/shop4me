import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, ShoppingCart, Clock, Star, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-agent.jpg";
import AppDownloadButtons from "./AppDownloadButtons";

const trustPoints = [
  "50+ Markets & Malls",
  "10,000+ Orders Delivered",
  "Same-Day Delivery",
];

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <motion.img
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          src={heroImage}
          alt="Shop4Me Agent at Nigerian Market"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/97 via-primary/85 to-primary/30" />
        {/* subtle bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: Main copy */}
          <div className="max-w-2xl">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium text-primary-foreground">
                Agents Online Now — Orders Being Fulfilled
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-tight mb-5"
            >
              Shop From{" "}
              <span className="relative inline-block">
                Any Market
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.9 }}
                    d="M2 10C50 4 150 4 198 10"
                    stroke="hsl(var(--accent))"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <br />
              Without Leaving Home
            </motion.h1>

            {/* Subheadline — visible on all sizes */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-base md:text-lg text-primary-foreground/85 mb-8 max-w-xl"
            >
              Send your shopping list. Our verified agents shop for you in real-time
              from malls, supermarkets, and local markets across Nigeria — then deliver to your door.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <Button asChild variant="hero-outline" size="xl" className="font-semibold">
                <Link to="/get-started">
                  Start Shopping Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="xl"
                className="text-primary-foreground hover:bg-primary-foreground/10 border border-primary-foreground/20"
              >
                <Link to="/agent-application">Become an Agent</Link>
              </Button>
            </motion.div>

            {/* App Download Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mb-8"
            >
              <p className="text-sm text-primary-foreground/60 mb-3">Also available on</p>
              <AppDownloadButtons variant="light" className="justify-start" />
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-wrap gap-4"
            >
              {trustPoints.map((point) => (
                <div key={point} className="flex items-center gap-2 text-primary-foreground/80">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm font-medium">{point}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Social proof / live order card — desktop only */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="hidden lg:flex flex-col gap-4 items-end"
          >
            {/* Rating card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 w-64 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-accent/80 flex items-center justify-center text-lg font-bold text-primary-foreground">
                  4.9
                </div>
                <div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-xs text-primary-foreground/70 mt-0.5">2,400+ happy buyers</p>
                </div>
              </div>
              <p className="text-sm text-primary-foreground/90 italic">
                "My agent got everything on my list from Mile 3 market and delivered in 2 hours!"
              </p>
              <p className="text-xs text-primary-foreground/60 mt-2">— Chisom A., Port Harcourt</p>
            </div>

            {/* Live order card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 w-64 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wide">Live Order</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-sm text-primary-foreground/90">Shoprite, Rumuola</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-sm text-primary-foreground/90">6 items • Agent shopping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-sm text-primary-foreground/90">Est. delivery: 1h 20m</span>
                </div>
              </div>
            </div>

            {/* Stats card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 w-64 shadow-xl">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-2xl font-display font-bold text-primary-foreground">50+</p>
                  <p className="text-xs text-primary-foreground/60">Markets</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-primary-foreground">10k+</p>
                  <p className="text-xs text-primary-foreground/60">Orders</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-primary-foreground">2h</p>
                  <p className="text-xs text-primary-foreground/60">Avg. Delivery</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-primary-foreground">100%</p>
                  <p className="text-xs text-primary-foreground/60">Transparent</p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
