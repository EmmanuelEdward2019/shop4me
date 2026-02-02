import { Link } from "react-router-dom";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { portHarcourtStores, StoreLocation } from "@/lib/port-harcourt-stores";
import { MapPin } from "lucide-react";

const StoreCard = ({ store }: { store: StoreLocation }) => {
  const Icon = store.icon;
  
  const typeColors = {
    mall: "bg-primary/10 text-primary border-primary/20",
    supermarket: "bg-secondary/20 text-secondary-foreground border-secondary/30",
    market: "bg-accent/15 text-accent-foreground border-accent/25",
    plaza: "bg-muted text-foreground border-border",
  };
  
  const iconBgColors = {
    mall: "bg-primary text-primary-foreground",
    supermarket: "bg-secondary text-secondary-foreground",
    market: "bg-accent text-accent-foreground",
    plaza: "bg-muted-foreground text-background",
  };
  
  return (
    <Link
      to={`/dashboard/orders/new?store=${encodeURIComponent(store.name)}`}
      className="group flex flex-col items-center p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-glow transition-all duration-300 cursor-pointer"
    >
      {/* Icon */}
      <div className={`w-14 h-14 rounded-xl ${iconBgColors[store.type]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-soft`}>
        <Icon className="w-7 h-7" />
      </div>
      
      {/* Name */}
      <h4 className="text-sm font-semibold text-foreground text-center leading-tight mb-1 group-hover:text-primary transition-colors">
        {store.name}
      </h4>
      
      {/* Area */}
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {store.area}
      </span>
      
      {/* Type Badge */}
      <span className={`mt-2 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border ${typeColors[store.type]}`}>
        {store.type}
      </span>
    </Link>
  );
};

const ExploreStores = () => {
  return (
    <section id="explore-stores" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <ScrollAnimation>
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Now in Port Harcourt
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Explore <span className="text-gradient">Stores & Markets</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Shop from popular malls, markets, and supermarkets in Port Harcourt. 
              Click any store to start your order!
            </p>
          </div>
        </ScrollAnimation>

        {/* Stores Grid */}
        <ScrollAnimation delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {portHarcourtStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </ScrollAnimation>

        {/* Expansion Notice */}
        <ScrollAnimation delay={0.2}>
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-card border border-border">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
              </span>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Coming soon:</span>{" "}
                Lagos, Abuja, Calabar & more cities
              </p>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
};

export default ExploreStores;
