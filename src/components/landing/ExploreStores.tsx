import { Link } from "react-router-dom";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { MapPin, ShoppingCart, ShoppingBag, Utensils, Pill, Store, Building2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useRef, useState } from "react";
import { useStoreCategories, useAllStores, type Store as StoreType, type StoreCategory } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, any> = {
  Store, ShoppingCart, ShoppingBag, Utensils, Pill, Building2,
};

const StoreCard = ({ store, compact = false }: { store: StoreType; compact?: boolean }) => {
  return (
    <Link
      to={`/dashboard/orders/new?store=${encodeURIComponent(store.name)}`}
      className={`group flex flex-col items-center rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-glow transition-all duration-300 cursor-pointer flex-shrink-0 ${
        compact ? "p-3 w-32" : "p-4"
      }`}
    >
      <div className={`rounded-xl bg-accent text-accent-foreground flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 shadow-soft ${
        compact ? "w-10 h-10" : "w-14 h-14 mb-3"
      }`}>
        <Store className={compact ? "w-5 h-5" : "w-7 h-7"} />
      </div>
      <h4 className={`font-semibold text-foreground text-center leading-tight mb-1 group-hover:text-primary transition-colors ${
        compact ? "text-xs" : "text-sm"
      }`}>
        {store.name}
      </h4>
      <span className={`text-muted-foreground flex items-center gap-1 ${compact ? "text-[10px]" : "text-xs"}`}>
        <MapPin className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
        {store.area}
      </span>
    </Link>
  );
};

const AutoScrollRow = ({ stores, direction }: { stores: StoreType[]; direction: "left" | "right" }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    const speed = 0.5;
    let scrollPosition = direction === "left" ? 0 : container.scrollWidth / 2;
    
    const animate = () => {
      if (!container) return;
      if (direction === "left") {
        scrollPosition += speed;
        if (scrollPosition >= container.scrollWidth / 2) scrollPosition = 0;
      } else {
        scrollPosition -= speed;
        if (scrollPosition <= 0) scrollPosition = container.scrollWidth / 2;
      }
      container.scrollLeft = scrollPosition;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [direction]);
  
  const duplicatedStores = [...stores, ...stores];
  
  return (
    <div ref={scrollRef} className="flex gap-3 overflow-hidden" style={{ scrollBehavior: "auto" }}>
      {duplicatedStores.map((store, index) => (
        <StoreCard key={`${store.id}-${index}`} store={store} compact />
      ))}
    </div>
  );
};

const ExploreStores = () => {
  const isMobile = useIsMobile();
  const { categories, loading: loadingCats } = useStoreCategories();
  const { stores, loading: loadingStores } = useAllStores();
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const filteredStores = selectedCategory
    ? stores.filter(s => s.category_id === selectedCategory)
    : stores;

  const halfLength = Math.ceil(filteredStores.length / 2);
  const topRowStores = filteredStores.slice(0, halfLength);
  const bottomRowStores = filteredStores.slice(halfLength);
  
  return (
    <section id="explore-stores" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <ScrollAnimation>
          <div className="text-center max-w-2xl mx-auto mb-8">
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

        {/* Category Filter */}
        <ScrollAnimation delay={0.05}>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Button
              variant={selectedCategory === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("")}
              className="rounded-full"
            >
              All
            </Button>
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || Store;
              return (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="rounded-full"
                >
                  <Icon className="w-4 h-4 mr-1.5" />
                  {cat.name}
                </Button>
              );
            })}
          </div>
        </ScrollAnimation>

        {/* Stores Display */}
        <ScrollAnimation delay={0.1}>
          {filteredStores.length === 0 && !loadingStores ? (
            <div className="text-center py-12 text-muted-foreground">
              No stores in this category yet
            </div>
          ) : isMobile ? (
            <div className="space-y-4 -mx-4 px-0">
              <AutoScrollRow stores={topRowStores} direction="right" />
              {bottomRowStores.length > 0 && (
                <AutoScrollRow stores={bottomRowStores} direction="left" />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </ScrollAnimation>

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
