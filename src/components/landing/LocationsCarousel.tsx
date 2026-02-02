import { ScrollAnimation, StaggerContainer, StaggerItem } from "@/components/ui/scroll-animation";
import ImageCarousel from "./ImageCarousel";
import mallPalms from "@/assets/mall-palms.jpg";
import mallIkeja from "@/assets/mall-ikeja.jpg";
import marketBalogun from "@/assets/market-balogun.jpg";
import { MapPin, Building2, Store } from "lucide-react";

const mallImages = [
  {
    src: mallPalms,
    alt: "The Palms Shopping Mall Lagos",
    title: "The Palms Mall",
    subtitle: "Lekki, Lagos",
  },
  {
    src: mallIkeja,
    alt: "Ikeja City Mall",
    title: "Ikeja City Mall",
    subtitle: "Ikeja, Lagos",
  },
];

const marketImages = [
  {
    src: marketBalogun,
    alt: "Balogun Market Lagos",
    title: "Balogun Market",
    subtitle: "Lagos Island",
  },
];

const locations = [
  {
    city: "Lagos",
    malls: ["The Palms", "Ikeja City Mall", "Adeniran Ogunsanya Mall", "Circle Mall"],
    markets: ["Balogun Market", "Computer Village", "Alaba International", "Mile 12"],
    icon: Building2,
  },
  {
    city: "Abuja",
    malls: ["Jabi Lake Mall", "Ceddi Plaza", "Silverbird Galleria"],
    markets: ["Wuse Market", "Garki Market", "Utako Market"],
    icon: Store,
  },
  {
    city: "Port Harcourt",
    malls: ["Port Harcourt Mall", "Genesis Deluxe", "Spar"],
    markets: ["Mile 1 Market", "Oil Mill Market", "Creek Road Market"],
    icon: MapPin,
  },
];

const LocationsCarousel = () => {
  return (
    <section id="locations" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <ScrollAnimation>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Where We Shop
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Your Favorite <span className="text-gradient">Locations</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              From premium malls to vibrant local markets – we've got you covered
            </p>
          </div>
        </ScrollAnimation>

        {/* Carousels */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <ScrollAnimation direction="left">
            <div>
              <h3 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Shopping Malls
              </h3>
              <ImageCarousel images={mallImages} className="shadow-soft" />
            </div>
          </ScrollAnimation>

          <ScrollAnimation direction="right">
            <div>
              <h3 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Store className="w-5 h-5 text-accent" />
                Local Markets
              </h3>
              <ImageCarousel images={marketImages} autoPlay={false} className="shadow-soft" />
            </div>
          </ScrollAnimation>
        </div>

        {/* Location Cards */}
        <StaggerContainer className="grid md:grid-cols-3 gap-6">
          {locations.map((location) => (
            <StaggerItem key={location.city}>
              <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-glow transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <location.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-xl font-display font-bold text-foreground">
                    {location.city}
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">
                      Malls
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {location.malls.map((mall) => (
                        <span
                          key={mall}
                          className="px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-foreground"
                        >
                          {mall}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">
                      Markets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {location.markets.map((market) => (
                        <span
                          key={market}
                          className="px-2.5 py-1 bg-accent/10 rounded-full text-xs font-medium text-accent-foreground"
                        >
                          {market}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default LocationsCarousel;
