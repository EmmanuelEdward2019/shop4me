import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";

const faqCategories = [
  {
    title: "Getting Started",
    faqs: [
      {
        question: "How do I place my first order?",
        answer: "Download the Shop4Me app, create an account, select your preferred shopping location, submit your shopping list, and our agent will handle the rest. You'll receive real-time updates throughout the process.",
      },
      {
        question: "What can I order through Shop4Me?",
        answer: "Almost anything! Groceries, electronics, fashion, household items, fresh produce from local markets, branded goods from malls - if it's available at our partner locations, we can get it for you.",
      },
      {
        question: "Is there a minimum order amount?",
        answer: "We have a minimum order value of ₦5,000 to ensure efficient service. There's no maximum limit - order as much as you need!",
      },
    ],
  },
  {
    title: "Payments & Pricing",
    faqs: [
      {
        question: "How does pricing work?",
        answer: "You pay the actual market price of items plus a service fee (10-15% depending on order size) and delivery fee. Our agents confirm all prices with photo evidence before you approve the purchase.",
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept bank transfers, debit/credit cards, USSD, and Shop4Me wallet balance. All payments are processed securely through Paystack.",
      },
      {
        question: "When am I charged for my order?",
        answer: "You're only charged after reviewing and approving the items and prices confirmed by your agent. No surprises, full transparency.",
      },
      {
        question: "Can I get a refund?",
        answer: "Yes! If items are damaged, incorrect, or not as described, we offer full refunds. Contact support within 24 hours of delivery with photos of the issue.",
      },
    ],
  },
  {
    title: "Shopping & Delivery",
    faqs: [
      {
        question: "How long does delivery take?",
        answer: "Same-day delivery for orders placed before 2 PM. Standard delivery takes 2-4 hours depending on your location and order complexity.",
      },
      {
        question: "Can I track my order?",
        answer: "Absolutely! Track your agent's shopping progress and delivery in real-time through the app. You'll also receive notifications at each stage.",
      },
      {
        question: "What if an item I want isn't available?",
        answer: "Your agent will notify you immediately and suggest alternatives. You can approve, reject, or request a different substitute.",
      },
      {
        question: "Do you deliver to my area?",
        answer: "We currently serve Lagos, Abuja, and Port Harcourt. Check the Locations page for specific coverage areas. We're expanding to more cities soon!",
      },
    ],
  },
  {
    title: "Trust & Safety",
    faqs: [
      {
        question: "How do I know I'm getting fair prices?",
        answer: "Our agents send photos of price tags and receipts. We also track historical prices to flag any unusual markups. Full transparency is our promise.",
      },
      {
        question: "Are your agents verified?",
        answer: "Yes! All Shop4Me agents undergo background checks, training, and are employed directly by us. They wear branded uniforms and carry ID badges.",
      },
      {
        question: "What if something goes wrong with my order?",
        answer: "Our support team is available 7 days a week. We have a satisfaction guarantee - if there's any issue, we'll make it right or refund you.",
      },
    ],
  },
];

const FAQPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <ScrollAnimation>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6">
                Frequently Asked Questions
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                Got questions? We've got answers. Find everything you need to know about Shop4Me.
              </p>
            </ScrollAnimation>
          </div>
        </section>

        {/* FAQ Sections */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-12">
              {faqCategories.map((category, catIndex) => (
                <ScrollAnimation key={category.title} delay={catIndex * 0.1}>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                      {category.title}
                    </h2>
                    <Accordion type="single" collapsible className="space-y-4">
                      {category.faqs.map((faq, index) => (
                        <AccordionItem
                          key={index}
                          value={`${catIndex}-${index}`}
                          className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-soft transition-all"
                        >
                          <AccordionTrigger className="text-left font-semibold hover:text-primary">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* Still Have Questions */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 text-center">
            <ScrollAnimation>
              <div className="max-w-xl mx-auto">
                <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                  Still Have Questions?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg">
                    Contact Support
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/">Back to Home</Link>
                  </Button>
                </div>
              </div>
            </ScrollAnimation>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
