import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Users, Bike, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

const roles = [
  {
    id: "buyer",
    title: "Buyer",
    description: "Shop from markets & stores — an agent delivers to your door.",
    icon: ShoppingBag,
    path: "/auth",
  },
  {
    id: "agent",
    title: "Shopping Agent",
    description: "Earn money sourcing products from markets & malls for buyers.",
    icon: Users,
    path: "/agent-application",
  },
  {
    id: "rider",
    title: "Delivery Rider",
    description: "Earn money delivering orders from agents to buyers.",
    icon: Bike,
    path: "/rider-application",
  },
];

const RoleSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <Link to="/">
              <img src={logo} alt="Shop4Me" className="h-12 mx-auto" />
            </Link>
            <h1 className="text-2xl font-display font-bold text-foreground mt-4">
              How would you like to join?
            </h1>
            <p className="text-muted-foreground mt-1">Select your role to get started</p>
          </div>

          <div className="space-y-4">
            {roles.map((role) => (
              <Card
                key={role.id}
                className="cursor-pointer border-border hover:border-primary hover:shadow-md transition-all"
                onClick={() => navigate(role.path)}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <role.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{role.title}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/auth" className="text-primary hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelect;
