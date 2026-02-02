import { Store, ShoppingBag, ShoppingCart, Building2, Utensils, Shirt, Smartphone, Gem, Pill, Package } from "lucide-react";

export interface StoreLocation {
  id: string;
  name: string;
  type: "mall" | "market" | "supermarket" | "plaza";
  icon: typeof Store;
  description: string;
  area: string;
}

export const portHarcourtStores: StoreLocation[] = [
  // Malls
  {
    id: "port-harcourt-mall",
    name: "Port Harcourt Mall",
    type: "mall",
    icon: Building2,
    description: "Premium shopping destination",
    area: "Azikiwe Road",
  },
  {
    id: "genesis-mall",
    name: "Genesis Mall",
    type: "mall",
    icon: Building2,
    description: "Modern retail complex",
    area: "Rumuola",
  },
  {
    id: "market-square",
    name: "Market Square",
    type: "supermarket",
    icon: ShoppingCart,
    description: "Leading supermarket chain",
    area: "Peter Odili Road",
  },
  {
    id: "spar-ph",
    name: "SPAR Supermarket",
    type: "supermarket",
    icon: ShoppingCart,
    description: "Quality groceries & more",
    area: "Trans Amadi",
  },
  
  // Major Markets
  {
    id: "mile-1-market",
    name: "Mile 1 Market",
    type: "market",
    icon: ShoppingBag,
    description: "Electronics & general goods",
    area: "Mile 1",
  },
  {
    id: "mile-3-market",
    name: "Mile 3 Market",
    type: "market",
    icon: ShoppingBag,
    description: "Fresh produce & foodstuffs",
    area: "Mile 3",
  },
  {
    id: "oil-mill-market",
    name: "Oil Mill Market",
    type: "market",
    icon: ShoppingBag,
    description: "Largest market in Rivers",
    area: "Eleme Junction",
  },
  {
    id: "rumuokoro-market",
    name: "Rumuokoro Market",
    type: "market",
    icon: ShoppingBag,
    description: "Building materials & more",
    area: "Rumuokoro",
  },
  {
    id: "creek-road-market",
    name: "Creek Road Market",
    type: "market",
    icon: ShoppingBag,
    description: "Fashion & fabrics",
    area: "D-Line",
  },
  {
    id: "slaughter-market",
    name: "Slaughter Market",
    type: "market",
    icon: Utensils,
    description: "Fresh meat & seafood",
    area: "Trans Amadi",
  },
  
  // Plazas
  {
    id: "polo-club-plaza",
    name: "Polo Club Shopping",
    type: "plaza",
    icon: Gem,
    description: "Upscale boutiques",
    area: "GRA Phase 2",
  },
  {
    id: "ada-george-plaza",
    name: "Ada George Plaza",
    type: "plaza",
    icon: Store,
    description: "Diverse retail stores",
    area: "Ada George",
  },
];

// For the NewOrder page dropdown
export const portHarcourtLocations = portHarcourtStores.map(store => ({
  name: store.name,
  type: store.type,
  city: "Port Harcourt",
}));
