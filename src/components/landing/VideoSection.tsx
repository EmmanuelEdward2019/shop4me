import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import howItWorksVideo from "@/assets/how-it-works.mp4";
import logo from "@/assets/logo.png";

const VideoSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);
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
              loop
              muted={isMuted}
              playsInline
              poster={undefined}
            >
              <source src={howItWorksVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Branded logo watermark */}
            <div className="absolute top-4 left-4 pointer-events-none z-10">
              <div className="flex items-center gap-2 bg-background/70 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
                <img src={logo} alt="Shop4Me" className="h-6 w-auto" />
              </div>
            </div>

            {/* Play/Pause Overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer group"
              onClick={togglePlay}
            >
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: isPlaying ? 0 : 1 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-primary-foreground" />
                ) : (
                  <Play className="w-8 h-8 text-primary-foreground ml-1" />
                )}
              </motion.div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex gap-2">
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
