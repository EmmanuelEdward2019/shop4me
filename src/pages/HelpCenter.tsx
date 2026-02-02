import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/support/WhatsAppButton";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Search, 
  ShoppingBag, 
  CreditCard, 
  Truck, 
  User, 
  MessageCircle,
  ChevronRight,
  HelpCircle,
  BookOpen
} from "lucide-react";
import { Input } from "@/components/ui/input";

const helpCategories = [
  {
    icon: ShoppingBag,
    title: "Ordering",
    description: "How to place orders, modify requests, and track items",
    articles: 12,
  },
  {
    icon: CreditCard,
    title: "Payments & Wallet",
    description: "Payment methods, wallet top-up, and transaction issues",
    articles: 8,
  },
  {
    icon: Truck,
    title: "Delivery",
    description: "Tracking deliveries, delivery times, and address changes",
    articles: 10,
  },
  {
    icon: User,
    title: "Account",
    description: "Account settings, profile updates, and security",
    articles: 6,
  },
];

const popularArticles = [
  "How do I place my first order?",
  "How do I track my order?",
  "What payment methods are accepted?",
  "How do I add money to my wallet?",
  "Can I cancel or modify my order?",
  "How are delivery fees calculated?",
];

const HelpCenter = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-3xl mx-auto">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                  Help Center
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                  How Can We <span className="text-gradient">Help You?</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  Search our help center or browse topics below
                </p>
                
                {/* Search Bar */}
                <div className="relative max-w-xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    placeholder="Search for help..." 
                    className="pl-12 h-14 text-lg rounded-full border-2 focus:border-primary"
                  />
                </div>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Help Categories */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Browse by Topic
                </h2>
              </div>
            </ScrollAnimation>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {helpCategories.map((category, index) => (
                <ScrollAnimation key={category.title} delay={index * 0.1}>
                  <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-glow transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{category.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3">{category.description}</p>
                    <span className="text-xs text-primary font-medium">{category.articles} articles</span>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Articles */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <ScrollAnimation>
                <div className="flex items-center gap-3 mb-8">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Popular Articles
                  </h2>
                </div>
              </ScrollAnimation>

              <div className="space-y-3">
                {popularArticles.map((article, index) => (
                  <ScrollAnimation key={article} delay={index * 0.05}>
                    <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between group">
                      <span className="text-foreground group-hover:text-primary transition-colors">{article}</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </ScrollAnimation>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Still Need Help */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <ScrollAnimation>
                <div className="p-8 rounded-2xl bg-card border border-border text-center">
                  <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-3">Chat with Us</h3>
                  <p className="text-muted-foreground mb-6">
                    Get instant help from our support team on WhatsApp
                  </p>
                  <Button asChild>
                    <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer">
                      Start Chat
                    </a>
                  </Button>
                </div>
              </ScrollAnimation>

              <ScrollAnimation delay={0.1}>
                <div className="p-8 rounded-2xl bg-card border border-border text-center">
                  <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-3">FAQs</h3>
                  <p className="text-muted-foreground mb-6">
                    Find quick answers to common questions
                  </p>
                  <Button variant="outline" asChild>
                    <Link to="/faq">View FAQs</Link>
                  </Button>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default HelpCenter;
