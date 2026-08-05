import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle } from "lucide-react";
import logo from "@/assets/logo.jpeg";

const DISPLAY_MS = 2500;
const BACKGROUND_COLOR = "#B5697D";

interface SplashScreenProps {
  visible: boolean;
  onFinish: () => void;
}

// Non-dismissible splash screen shown once per app launch. No click/tap
// handler anywhere on it by design — it can only go away on its own timer.
export const SplashScreen: React.FC<SplashScreenProps> = ({
  visible,
  onFinish,
}) => {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onFinish, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [visible, onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{
            backgroundColor: BACKGROUND_COLOR,
            height: "100dvh",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-32 w-32 overflow-hidden rounded-[28px] shadow-2xl sm:h-36 sm:w-36"
          >
            <img
              src={logo}
              alt="Link"
              className="h-full w-full object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
            className="mt-14 flex items-center gap-3"
          >
            <span
              className="h-px w-16 sm:w-20"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(255,255,255,0.55))",
              }}
            />
            <Sparkle
              className="h-4 w-4 text-white/90"
              fill="currentColor"
              strokeWidth={0}
            />
            <span
              className="h-px w-16 sm:w-20"
              style={{
                background:
                  "linear-gradient(to left, transparent, rgba(255,255,255,0.55))",
              }}
            />
            <Sparkle
              className="h-2.5 w-2.5 text-white/70"
              fill="currentColor"
              strokeWidth={0}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
