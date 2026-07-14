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
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24">
      {/* Subtle brand glow — minimal, no full-bleed gradient */}
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left — copy */}
          <div className="max-w-xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl"
            >
              Shop from{" "}
              <span className="relative inline-block text-primary">
                any market
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, delay: 0.7 }}
                    d="M2 10C50 4 150 4 198 10"
                    stroke="hsl(var(--accent))"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              without leaving home.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
            >
              Send your shopping list and a verified agent shops for you in real
              time — from malls, supermarkets, and local markets — then delivers
              right to your door.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.25 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Button asChild variant="hero" size="xl" className="font-semibold">
                <Link to="/get-started">
                  Start Shopping Now
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/agent-application">Become an Agent</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.35 }}
              className="mt-8"
            >
              <p className="mb-3 text-sm text-muted-foreground">Also available on</p>
              <AppDownloadButtons variant="dark" className="justify-start" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.45 }}
              className="mt-8 flex flex-wrap gap-x-6 gap-y-3"
            >
              {trustPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-2 text-sm font-medium text-foreground/70"
                >
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-secondary" />
                  {point}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — framed image with a single floating stat */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="overflow-hidden rounded-[2rem] border border-border shadow-2xl">
              <img
                src={heroImage}
                alt="A Shop4Me agent shopping at a Nigerian market"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>

            <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-border bg-background/95 px-5 py-4 shadow-xl backdrop-blur sm:block">
              <p className="font-display text-2xl font-bold text-foreground">
                10,000+
              </p>
              <p className="text-xs text-muted-foreground">orders delivered</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
