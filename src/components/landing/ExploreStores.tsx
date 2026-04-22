import { Link } from "react-router-dom";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { MapPin, ShoppingCart, ShoppingBag, Utensils, Pill, Store, Building2, ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useRef } from "react";
import { useStoreCategories, useAllStores, type Store as StoreType } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, any> = {
  Store, ShoppingCart, ShoppingBag, Utensils, Pill, Building2,
};

// Columns shown per breakpoint (mirrors the grid below)
const COLS_DESKTOP = 6;
const ROWS_SHOWN = 2;
const MAX_DESKTOP = COLS_DESKTOP * ROWS_SHOWN; // 12 stores max

const StoreCard = ({ store, compact = false }: { store: StoreType; compact?: boolean }) => {
  return (
    <Link
      to="/get-started"
      className={`group flex flex-col items-center rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-glow transition-all duration-300 cursor-pointer flex-shrink-0 overflow-hidden ${
        compact ? "w-32" : ""
      }`}
    >
      <div
        className={`w-full flex items-center justify-center bg-green-900/10 group-hover:bg-green-900/15 transition-colors ${
          compact ? "h-20" : "h-28"
        }`}
      >
        <Store className={`text-green-900 group-hover:scale-110 transition-transform duration-300 ${compact ? "w-8 h-8" : "w-10 h-10"}`} />
      </div>
      <div className={compact ? "p-2 pt-1" : "p-3 pt-1"}>
        <h4
          className={`font-semibold text-foreground text-center leading-tight mb-1 group-hover:text-primary transition-colors ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {store.parent_brand || store.name}
          {store.branch_name && (
            <span className="block font-normal text-muted-foreground text-[10px]">
              {store.branch_name}
            </span>
          )}
        </h4>
        <span
          className={`text-muted-foreground flex items-center justify-center gap-1 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          <MapPin className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          {store.area}
        </span>
      </div>
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

  const duplicated = [...stores, ...stores];
  return (
    <div ref={scrollRef} className="flex gap-3 overflow-hidden" style={{ scrollBehavior: "auto" }}>
      {duplicated.map((store, i) => (
        <StoreCard key={`${store.id}-${i}`} store={store} compact />
      ))}
    </div>
  );
};

const ExploreStores = () => {
  const isMobile = useIsMobile();
  const { categories } = useStoreCategories();
  const { stores, loading: loadingStores } = useAllStores();
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const filteredStores = selectedCategory
    ? stores.filter((s) => s.category_id === selectedCategory)
    : stores;

  // Desktop: cap at 2 rows
  const desktopStores = filteredStores.slice(0, MAX_DESKTOP);
  const hasMore = filteredStores.length > MAX_DESKTOP;

  // Mobile rows
  const half = Math.ceil(filteredStores.length / 2);
  const topRow = filteredStores.slice(0, half);
  const bottomRow = filteredStores.slice(half);

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
              Sign up to start your first order!
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
              <AutoScrollRow stores={topRow} direction="right" />
              {bottomRow.length > 0 && (
                <AutoScrollRow stores={bottomRow} direction="left" />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {desktopStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </ScrollAnimation>

        {/* View All Button */}
        <ScrollAnimation delay={0.18}>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="rounded-full px-8 gap-2">
              <Link to="/get-started">
                {hasMore
                  ? `View All ${filteredStores.length} Stores`
                  : "Sign Up to Start Shopping"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0.25}>
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-card border border-border">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
              </span>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Coming soon:</span>{" "}
                Lagos, Abuja, Calabar &amp; more cities
              </p>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
};

export default ExploreStores;
