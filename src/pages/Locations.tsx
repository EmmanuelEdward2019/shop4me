import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import LocationsCarousel from "@/components/landing/LocationsCarousel";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const LocationsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <ScrollAnimation>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6">
                Where We Shop For You
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-8">
                From Lagos to Abuja to Port Harcourt – we've got agents in all major 
                shopping destinations across Nigeria.
              </p>
              <Button asChild variant="hero-outline" size="xl">
                <Link to="/">
                  Start Shopping
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </ScrollAnimation>
          </div>
        </section>

        {/* Locations with Carousels */}
        <LocationsCarousel />

        {/* Coming Soon */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 text-center">
            <ScrollAnimation>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Expanding Soon
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                We're bringing Shop4Me to more cities across Nigeria. 
                Stay tuned for updates!
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {["Ibadan", "Kano", "Enugu", "Benin City"].map((city) => (
                  <span 
                    key={city}
                    className="px-4 py-2 bg-card border border-border rounded-full text-muted-foreground"
                  >
                    {city} - Coming Soon
                  </span>
                ))}
              </div>
            </ScrollAnimation>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LocationsPage;
