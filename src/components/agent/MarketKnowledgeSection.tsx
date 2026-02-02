import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Save, X, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const AVAILABLE_MARKETS = [
  // Markets
  { value: "balogun-market", label: "Balogun Market", type: "market" },
  { value: "computer-village", label: "Computer Village", type: "market" },
  { value: "alaba-market", label: "Alaba International Market", type: "market" },
  { value: "tejuosho-market", label: "Tejuosho Market", type: "market" },
  { value: "oyingbo-market", label: "Oyingbo Market", type: "market" },
  { value: "mile-12-market", label: "Mile 12 Market", type: "market" },
  { value: "ladipo-market", label: "Ladipo Auto Parts Market", type: "market" },
  { value: "idumota-market", label: "Idumota Market", type: "market" },
  { value: "yaba-market", label: "Yaba Market", type: "market" },
  { value: "trade-fair", label: "Trade Fair Complex", type: "market" },
  // Malls
  { value: "ikeja-city-mall", label: "Ikeja City Mall", type: "mall" },
  { value: "palms-shopping-mall", label: "The Palms Shopping Mall", type: "mall" },
  { value: "shoprite-surulere", label: "Shoprite Surulere", type: "mall" },
  { value: "shoprite-ikeja", label: "Shoprite Ikeja", type: "mall" },
  { value: "maryland-mall", label: "Maryland Mall", type: "mall" },
  { value: "circle-mall", label: "Circle Mall Lekki", type: "mall" },
  { value: "adeniran-ogunsanya", label: "Adeniran Ogunsanya Mall", type: "mall" },
  { value: "jara-mall", label: "Jara Mall", type: "mall" },
  { value: "leisure-mall", label: "Leisure Mall Surulere", type: "mall" },
  { value: "novare-gateway", label: "Novare Gateway Mall", type: "mall" },
];

interface MarketKnowledgeSectionProps {
  loading: boolean;
  saving: boolean;
  selectedMarkets: string[];
  onMarketsChange: (markets: string[]) => void;
  onSave: () => void;
}

const MarketKnowledgeSection = ({
  loading,
  saving,
  selectedMarkets,
  onMarketsChange,
  onSave,
}: MarketKnowledgeSectionProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    if (selectedMarkets.includes(value)) {
      onMarketsChange(selectedMarkets.filter((m) => m !== value));
    } else {
      onMarketsChange([...selectedMarkets, value]);
    }
  };

  const handleRemove = (value: string) => {
    onMarketsChange(selectedMarkets.filter((m) => m !== value));
  };

  const getMarketLabel = (value: string) => {
    return AVAILABLE_MARKETS.find((m) => m.value === value)?.label || value;
  };

  const markets = AVAILABLE_MARKETS.filter((m) => m.type === "market");
  const malls = AVAILABLE_MARKETS.filter((m) => m.type === "mall");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Market Knowledge
        </CardTitle>
        <CardDescription>
          Select the markets and malls you're familiar with for shopping.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        ) : (
          <>
            {/* Selected markets display */}
            {selectedMarkets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMarkets.map((market) => (
                  <Badge
                    key={market}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {getMarketLabel(market)}
                    <button
                      type="button"
                      onClick={() => handleRemove(market)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Market selector */}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Add markets or malls...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search markets..." />
                  <CommandList>
                    <CommandEmpty>No market found.</CommandEmpty>
                    <CommandGroup heading="Markets">
                      {markets.map((market) => (
                        <CommandItem
                          key={market.value}
                          value={market.value}
                          onSelect={() => handleSelect(market.value)}
                        >
                          <div
                            className={`mr-2 h-4 w-4 rounded border flex items-center justify-center ${
                              selectedMarkets.includes(market.value)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input"
                            }`}
                          >
                            {selectedMarkets.includes(market.value) && (
                              <span className="text-xs">✓</span>
                            )}
                          </div>
                          {market.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Malls">
                      {malls.map((mall) => (
                        <CommandItem
                          key={mall.value}
                          value={mall.value}
                          onSelect={() => handleSelect(mall.value)}
                        >
                          <div
                            className={`mr-2 h-4 w-4 rounded border flex items-center justify-center ${
                              selectedMarkets.includes(mall.value)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input"
                            }`}
                          >
                            {selectedMarkets.includes(mall.value) && (
                              <span className="text-xs">✓</span>
                            )}
                          </div>
                          {mall.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <p className="text-sm text-muted-foreground">
              {selectedMarkets.length} location{selectedMarkets.length !== 1 ? "s" : ""} selected
            </p>

            <Button onClick={onSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Market Knowledge"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketKnowledgeSection;
