import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <motion.img
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          src={heroImage}
          alt="Shop4Me Agent at Nigerian Market"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/40" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 py-16">
        <div className="max-w-2xl">
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white leading-tight mb-5 drop-shadow-sm"
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
                  transition={{ duration: 1, delay: 0.85 }}
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

          {/* Subheadline — hidden on mobile */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35 }}
            className="hidden md:block text-base md:text-lg text-white/90 mb-8 max-w-lg leading-relaxed"
          >
            Send your shopping list. Our verified agents shop for you in real-time
            from malls, supermarkets, and local markets across Nigeria — then deliver to your door.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.45 }}
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
              className="text-white hover:bg-white/10 border border-white/30"
            >
              <Link to="/agent-application">Become an Agent</Link>
            </Button>
          </motion.div>

          {/* App Download Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55 }}
            className="mb-8"
          >
            <p className="text-sm text-white/60 mb-3">Also available on</p>
            <AppDownloadButtons variant="light" className="justify-start" />
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.65 }}
            className="flex flex-wrap gap-5"
          >
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center gap-2 text-white/85">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-sm font-medium">{point}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
