import { MapPin } from "lucide-react";

const locations = [
  {
    city: "Lagos",
    markets: ["Balogun Market", "Computer Village", "Lekki Market", "Ajah Market"],
    malls: ["Ikeja City Mall", "The Palms", "Shoprite Surulere"],
  },
  {
    city: "Abuja",
    markets: ["Wuse Market", "Garki Market", "Utako Market"],
    malls: ["Jabi Lake Mall", "Ceddi Plaza", "Next Cash & Carry"],
  },
  {
    city: "Port Harcourt",
    markets: ["Mile 1 Market", "Oil Mill Market", "Rumuokoro Market"],
    malls: ["Genesis Mall", "Spar Port Harcourt"],
  },
];

const Locations = () => {
  return (
    <section id="locations" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Where We Operate
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Shop From{" "}
            <span className="text-gradient">50+ Locations</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our agents are stationed in major cities across Nigeria, with more coming soon.
          </p>
        </div>

        {/* Locations Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location.city}
              className="bg-card rounded-2xl border border-border overflow-hidden group hover:shadow-glow transition-all duration-300"
            >
              {/* City Header */}
              <div className="bg-hero-gradient p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-primary-foreground">
                    {location.city}
                  </h3>
                </div>
              </div>

              {/* Markets & Malls */}
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Markets
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {location.markets.map((market) => (
                      <span
                        key={market}
                        className="px-3 py-1 bg-muted rounded-full text-sm text-foreground"
                      >
                        {market}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Malls & Supermarkets
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {location.malls.map((mall) => (
                      <span
                        key={mall}
                        className="px-3 py-1 bg-secondary/20 rounded-full text-sm text-foreground"
                      >
                        {mall}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Banner */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Coming soon:</span>{" "}
            Ibadan, Kano, Enugu, Benin City, and more!
          </p>
        </div>
      </div>
    </section>
  );
};

export default Locations;
