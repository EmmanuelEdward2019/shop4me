import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Smartphone } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import howItWorksVideo from "@/assets/how-it-works.mp4";
import logo from "@/assets/logo.png";

const VideoSection = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4">
        <ScrollAnimation>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              See It In Action
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Watch How <span className="text-gradient">Shop4Me</span> Works
            </h2>
            <p className="text-lg text-muted-foreground">
              From your shopping list to your doorstep – see the complete journey
            </p>
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0.2}>
          <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-glow">
            <video
              ref={videoRef}
              className="w-full aspect-video object-cover"
              autoPlay
              loop
              muted={isMuted}
              playsInline
            >
              <source src={howItWorksVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Persistent branded watermark – bottom-left during playback */}
            <motion.div
              className="absolute bottom-4 left-4 pointer-events-none z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: isPlaying ? 0.7 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <img src={logo} alt="Shop4Me" className="h-5 w-auto drop-shadow-md" />
            </motion.div>

            {/* App Mockup Poster Overlay – shown when not playing */}
            <AnimatePresence>
              {!isPlaying && (
                <motion.div
                  key="poster"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-primary/80 backdrop-blur-sm flex items-center justify-center cursor-pointer"
                  onClick={togglePlay}
                >
                  {/* Phone mockup with logo */}
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      {/* Phone frame */}
                      <div className="w-40 h-72 md:w-52 md:h-[22rem] rounded-[2rem] border-4 border-primary-foreground/30 bg-background/95 shadow-2xl flex flex-col items-center overflow-hidden">
                        {/* Phone notch */}
                        <div className="w-20 h-5 bg-foreground/10 rounded-b-xl mt-0" />
                        {/* Screen content */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
                          <img src={logo} alt="Shop4Me" className="w-24 md:w-32 h-auto" />
                          <div className="w-full space-y-2">
                            <div className="h-2.5 bg-primary/20 rounded-full w-full" />
                            <div className="h-2.5 bg-primary/15 rounded-full w-3/4 mx-auto" />
                            <div className="h-2.5 bg-primary/10 rounded-full w-1/2 mx-auto" />
                          </div>
                          <div className="mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] md:text-xs font-semibold">
                            Start Shopping
                          </div>
                        </div>
                        {/* Home indicator */}
                        <div className="w-16 h-1 bg-foreground/20 rounded-full mb-2" />
                      </div>
                    </div>

                    {/* Play button below phone */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary-foreground/90 flex items-center justify-center shadow-lg"
                    >
                      <Play className="w-7 h-7 md:w-8 md:h-8 text-primary ml-1" />
                    </motion.div>
                    <p className="text-primary-foreground/90 text-sm font-medium">
                      Tap to watch the demo
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pause overlay on hover while playing */}
            {isPlaying && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                onClick={togglePlay}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center"
                >
                  <Pause className="w-8 h-8 text-primary-foreground" />
                </motion.div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex gap-2 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-foreground" />
                ) : (
                  <Volume2 className="w-5 h-5 text-foreground" />
                )}
              </button>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
};

export default VideoSection;
