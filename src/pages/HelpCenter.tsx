import { useState } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/support/WhatsAppButton";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Search, ShoppingBag, CreditCard, Truck, User, MessageCircle,
  ChevronRight, HelpCircle, BookOpen, ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const WHATSAPP_NUMBER = "2347047008840";

const helpCategories = [
  {
    icon: ShoppingBag,
    title: "Ordering",
    description: "How to place orders, modify requests, and track items",
    articles: [
      {
        q: "How do I place my first order?",
        a: "Download the Shop4Me app or visit our website, create an account, select your preferred shopping location (market or supermarket), submit your shopping list with item details and quantities, and a verified agent will be assigned to shop for you. You'll receive real-time updates throughout the process.",
      },
      {
        q: "Can I modify my order after placing it?",
        a: "Yes! You can modify your order while it's still in 'pending' status. Once an agent has accepted and started shopping, you can communicate changes directly via the in-app chat. Your agent will confirm any modifications with you before proceeding.",
      },
      {
        q: "What can I order through Shop4Me?",
        a: "Almost anything available at our partner locations — groceries, fresh produce, electronics, fashion items, household supplies, beauty products, and more. If it's sold at a market or supermarket we serve, our agents can get it for you.",
      },
      {
        q: "Is there a minimum order amount?",
        a: "Yes, we have a minimum order value of ₦5,000 to ensure efficient service for both you and our agents. There's no maximum limit — order as much as you need!",
      },
      {
        q: "How do I add special instructions for my order?",
        a: "When placing your order, use the 'Notes' field to add any special instructions. You can specify preferred brands, sizes, ripeness levels for produce, or any other preferences. Your agent will follow these instructions carefully.",
      },
    ],
  },
  {
    icon: CreditCard,
    title: "Payments & Wallet",
    description: "Payment methods, wallet top-up, and transaction issues",
    articles: [
      {
        q: "What payment methods are accepted?",
        a: "We accept bank transfers, debit/credit cards (Visa, Mastercard, Verve), USSD payments, and Shop4Me wallet balance. All card payments are processed securely through Paystack, a PCI-DSS compliant payment processor.",
      },
      {
        q: "How do I add money to my wallet?",
        a: "Go to Dashboard → Wallet → Fund Wallet. You can top up using your debit card or bank transfer. Funds are credited instantly. Your wallet balance can be used for faster checkout on future orders.",
      },
      {
        q: "When am I charged for my order?",
        a: "You're only charged after your agent has shopped for all items and you've reviewed and approved the final invoice with actual prices and photo evidence. No surprises — full transparency on every item.",
      },
      {
        q: "How do I get a refund?",
        a: "If items are damaged, incorrect, or not as described, contact support within 24 hours of delivery with photos. Refunds are processed to your Shop4Me wallet within 24 hours, or to your original payment method within 3-5 business days.",
      },
      {
        q: "How are fees calculated?",
        a: "You pay the actual market price of items plus a flat service fee of ₦1,500 and a delivery fee based on distance. All fees are shown transparently before you confirm your order.",
      },
    ],
  },
  {
    icon: Truck,
    title: "Delivery",
    description: "Tracking deliveries, delivery times, and address changes",
    articles: [
      {
        q: "How long does delivery take?",
        a: "Standard delivery takes 2-4 hours depending on your location, order size, and market complexity. Orders placed before 2 PM are eligible for same-day delivery. You'll see an estimated delivery time when placing your order.",
      },
      {
        q: "How do I track my order?",
        a: "Once your agent starts shopping, you can track their progress in real-time through the app. You'll see live location updates during delivery, receive notifications at each stage (accepted, shopping, in transit, delivered), and can chat directly with your agent.",
      },
      {
        q: "Can I change my delivery address after placing an order?",
        a: "You can update your delivery address while the order is still being shopped. Once the agent is in transit, address changes may not be possible. Contact your agent via chat or reach out to support for assistance.",
      },
      {
        q: "What if I'm not home during delivery?",
        a: "Your agent will call you when they arrive. If you're unavailable, you can designate someone else to receive the delivery by informing your agent via chat. Undelivered orders may incur a re-delivery fee.",
      },
      {
        q: "Do you deliver to my area?",
        a: "We currently serve Port Harcourt, Lagos, and Abuja. Check the Locations page for specific coverage areas in each city. We're continuously expanding to serve more neighborhoods.",
      },
    ],
  },
  {
    icon: User,
    title: "Account & Security",
    description: "Account settings, profile updates, and security",
    articles: [
      {
        q: "How do I update my profile information?",
        a: "Go to Dashboard → Settings to update your name, phone number, email, and profile photo. Changes are saved immediately.",
      },
      {
        q: "How do I reset my password?",
        a: "On the login page, click 'Forgot Password'. Enter your email address and we'll send you a password reset link. The link expires after 1 hour for security.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Dashboard → Settings → scroll to the bottom and click 'Delete Account'. This action is permanent and will remove all your personal data. Active orders must be completed or cancelled first.",
      },
      {
        q: "Is my personal information safe?",
        a: "Absolutely. We use industry-standard encryption for all data transmission and storage. Your payment details are never stored on our servers — they're handled securely by Paystack. Read our Privacy Policy for full details.",
      },
    ],
  },
];

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allArticles = helpCategories.flatMap((cat) =>
    cat.articles.map((article) => ({ ...article, category: cat.title }))
  );

  const filteredArticles = searchQuery.trim()
    ? allArticles.filter(
        (a) =>
          a.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const activeCategory = selectedCategory
    ? helpCategories.find((c) => c.title === selectedCategory)
    : null;

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
                    placeholder="Search for help (e.g. 'refund', 'track order')..." 
                    className="pl-12 h-14 text-lg rounded-full border-2 focus:border-primary"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) setSelectedCategory(null);
                    }}
                  />
                </div>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Search Results */}
        {searchQuery.trim() && (
          <section className="py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredArticles.length} result{filteredArticles.length !== 1 ? "s" : ""} for "{searchQuery}"
                </p>
                {filteredArticles.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-3">
                    {filteredArticles.map((article, index) => (
                      <AccordionItem
                        key={index}
                        value={`search-${index}`}
                        className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-soft transition-all"
                      >
                        <AccordionTrigger className="text-left font-semibold hover:text-primary">
                          <div>
                            <span className="text-xs text-primary font-medium block mb-1">{article.category}</span>
                            {article.q}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {article.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No articles match your search.</p>
                    <Button variant="outline" onClick={() => setSearchQuery("")}>Clear search</Button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Help Categories */}
        {!searchQuery.trim() && !selectedCategory && (
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
                    <button
                      onClick={() => setSelectedCategory(category.title)}
                      className="w-full text-left p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-glow transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <category.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{category.title}</h3>
                      <p className="text-muted-foreground text-sm mb-3">{category.description}</p>
                      <span className="text-xs text-primary font-medium">{category.articles.length} articles</span>
                    </button>
                  </ScrollAnimation>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Selected Category Articles */}
        {!searchQuery.trim() && activeCategory && (
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <Button variant="ghost" className="mb-6 gap-2" onClick={() => setSelectedCategory(null)}>
                  ← Back to topics
                </Button>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <activeCategory.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    {activeCategory.title}
                  </h2>
                </div>

                <Accordion type="single" collapsible className="space-y-3">
                  {activeCategory.articles.map((article, index) => (
                    <AccordionItem
                      key={index}
                      value={`cat-${index}`}
                      className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-soft transition-all"
                    >
                      <AccordionTrigger className="text-left font-semibold hover:text-primary">
                        {article.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {article.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>
        )}

        {/* Popular Articles (show when no search and no category selected) */}
        {!searchQuery.trim() && !selectedCategory && (
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <ScrollAnimation>
                  <div className="flex items-center gap-3 mb-8">
                    <BookOpen className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Popular Questions
                    </h2>
                  </div>
                </ScrollAnimation>

                <Accordion type="single" collapsible className="space-y-3">
                  {[
                    allArticles[0], // How do I place my first order?
                    allArticles[5], // What payment methods?
                    allArticles[10], // How long does delivery take?
                    allArticles[6], // How do I add money to wallet?
                    allArticles[1], // Can I modify my order?
                    allArticles[9], // How are fees calculated?
                  ].filter(Boolean).map((article, index) => (
                    <ScrollAnimation key={index} delay={index * 0.05}>
                      <AccordionItem
                        value={`popular-${index}`}
                        className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-soft transition-all"
                      >
                        <AccordionTrigger className="text-left font-semibold hover:text-primary">
                          {article.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {article.a}
                        </AccordionContent>
                      </AccordionItem>
                    </ScrollAnimation>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>
        )}

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
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello! I need help with Shop4Me.")}`} target="_blank" rel="noopener noreferrer">
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
