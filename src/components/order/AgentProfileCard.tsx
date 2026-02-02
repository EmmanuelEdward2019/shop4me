import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Star, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MARKET_LABELS: Record<string, string> = {
  "balogun-market": "Balogun Market",
  "computer-village": "Computer Village",
  "alaba-market": "Alaba International Market",
  "tejuosho-market": "Tejuosho Market",
  "oyingbo-market": "Oyingbo Market",
  "mile-12-market": "Mile 12 Market",
  "ladipo-market": "Ladipo Auto Parts Market",
  "idumota-market": "Idumota Market",
  "yaba-market": "Yaba Market",
  "trade-fair": "Trade Fair Complex",
  "ikeja-city-mall": "Ikeja City Mall",
  "palms-shopping-mall": "The Palms Shopping Mall",
  "shoprite-surulere": "Shoprite Surulere",
  "shoprite-ikeja": "Shoprite Ikeja",
  "maryland-mall": "Maryland Mall",
  "circle-mall": "Circle Mall Lekki",
  "adeniran-ogunsanya": "Adeniran Ogunsanya Mall",
  "jara-mall": "Jara Mall",
  "leisure-mall": "Leisure Mall Surulere",
  "novare-gateway": "Novare Gateway Mall",
};

interface AgentInfo {
  full_name: string | null;
  photo_url: string | null;
  market_knowledge: string[] | null;
  experience_description: string | null;
}

interface AgentProfileCardProps {
  agentInfo: AgentInfo | null;
  loading?: boolean;
}

const AgentProfileCard = ({ agentInfo, loading }: AgentProfileCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <User className="w-5 h-5" />
            Your Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!agentInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <User className="w-5 h-5" />
            Your Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <div className="w-12 h-12 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Waiting for Agent</p>
              <p className="text-sm text-muted-foreground">
                An agent will be assigned to your order soon
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return "AG";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMarketLabel = (value: string) => {
    return MARKET_LABELS[value] || value;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <User className="w-5 h-5" />
          Your Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent info header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={agentInfo.photo_url || undefined} alt={agentInfo.full_name || "Agent"} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {getInitials(agentInfo.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg">
              {agentInfo.full_name || "Agent"}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span>Verified Agent</span>
            </div>
          </div>
        </div>

        {/* Experience description */}
        {agentInfo.experience_description && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground leading-relaxed">
              "{agentInfo.experience_description}"
            </p>
          </div>
        )}

        {/* Market knowledge */}
        {agentInfo.market_knowledge && agentInfo.market_knowledge.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="w-4 h-4" />
              <span>Familiar with</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {agentInfo.market_knowledge.slice(0, 5).map((market) => (
                <Badge key={market} variant="secondary" className="text-xs">
                  {getMarketLabel(market)}
                </Badge>
              ))}
              {agentInfo.market_knowledge.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{agentInfo.market_knowledge.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentProfileCard;
