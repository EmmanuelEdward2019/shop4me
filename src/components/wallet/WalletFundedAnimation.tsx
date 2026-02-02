import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, PartyPopper, Sparkles } from "lucide-react";

interface WalletFundedAnimationProps {
  show: boolean;
  amount: number;
  onComplete?: () => void;
}

const WalletFundedAnimation = ({ show, amount, onComplete }: WalletFundedAnimationProps) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border shadow-2xl"
          >
            {/* Confetti particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  scale: 0,
                  rotate: 0 
                }}
                animate={{ 
                  x: Math.cos(i * 30 * Math.PI / 180) * (80 + Math.random() * 40),
                  y: Math.sin(i * 30 * Math.PI / 180) * (80 + Math.random() * 40) - 20,
                  scale: [0, 1, 0.5],
                  rotate: Math.random() * 360,
                }}
                transition={{ 
                  duration: 1.5, 
                  delay: 0.2 + i * 0.05,
                  ease: "easeOut" 
                }}
                className={`absolute w-3 h-3 rounded-full ${
                  ['bg-primary', 'bg-green-500', 'bg-amber-400', 'bg-pink-500', 'bg-blue-500'][i % 5]
                }`}
              />
            ))}

            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1, damping: 10 }}
              className="relative"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  duration: 0.6, 
                  delay: 0.5,
                  repeat: 2,
                }}
                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              
              {/* Sparkle effects */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-amber-400" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-1 -left-3"
              >
                <PartyPopper className="w-5 h-5 text-pink-500" />
              </motion.div>
            </motion.div>

            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <h2 className="text-2xl font-display font-bold text-foreground mb-1">
                Wallet Funded! 🎉
              </h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-lg text-muted-foreground"
              >
                <motion.span
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                  className="inline-block font-bold text-primary"
                >
                  {formatCurrency(amount)}
                </motion.span>
                {" "}added to your wallet
              </motion.p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3.5, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1 bg-primary rounded-b-2xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WalletFundedAnimation;
