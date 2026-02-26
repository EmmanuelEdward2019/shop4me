import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import VideoSection from "@/components/landing/VideoSection";
import ExploreStores from "@/components/landing/ExploreStores";
import AgentsShowcase from "@/components/landing/AgentsShowcase";
import LocationsCarousel from "@/components/landing/LocationsCarousel";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/support/WhatsAppButton";
import RiderCTA from "@/components/landing/RiderCTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <VideoSection />
        <ExploreStores />
        <Features />
        <AgentsShowcase />
        <RiderCTA />
        <LocationsCarousel />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
