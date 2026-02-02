import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import VideoSection from "@/components/landing/VideoSection";
import AgentsShowcase from "@/components/landing/AgentsShowcase";
import LocationsCarousel from "@/components/landing/LocationsCarousel";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <VideoSection />
        <Features />
        <AgentsShowcase />
        <LocationsCarousel />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
