import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedBalanceProps {
  value: number;
  formatter: (n: number) => string;
  className?: string;
}

const AnimatedBalance = ({ value, formatter, className }: AnimatedBalanceProps) => {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  const spring = useSpring(value, { stiffness: 80, damping: 20, mass: 0.5 });
  const display = useTransform(spring, (v) => formatter(v));
  const [rendered, setRendered] = useState(formatter(value));

  useEffect(() => {
    spring.set(value);

    if (prevValue.current !== value) {
      setFlash(value > prevValue.current ? "up" : "down");
      const timeout = setTimeout(() => setFlash(null), 1200);
      prevValue.current = value;
      return () => clearTimeout(timeout);
    }
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setRendered(v));
    return unsubscribe;
  }, [display]);

  return (
    <motion.span
      className={className}
      animate={
        flash
          ? {
              scale: [1, 1.05, 1],
              textShadow: flash === "up"
                ? ["0 0 0px transparent", "0 0 12px hsl(var(--primary) / 0.6)", "0 0 0px transparent"]
                : ["0 0 0px transparent", "0 0 12px hsl(0 84% 60% / 0.6)", "0 0 0px transparent"],
            }
          : {}
      }
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {rendered}
    </motion.span>
  );
};

export default AnimatedBalance;
