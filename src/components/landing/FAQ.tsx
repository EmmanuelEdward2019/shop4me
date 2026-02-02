import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does Shop4Me work?",
    answer:
      "Simply choose a market or mall, submit your shopping list, and one of our verified agents will shop for you. They'll confirm prices and send photos before purchasing. Once approved, they buy the items and arrange delivery to your doorstep.",
  },
  {
    question: "What areas do you deliver to?",
    answer:
      "We currently operate in Lagos, Abuja, and Port Harcourt. We deliver within these cities and surrounding areas. More cities are coming soon!",
  },
  {
    question: "How do I pay for my order?",
    answer:
      "We accept debit cards, bank transfers, and mobile money. You can also maintain a wallet balance for faster checkout. All payments are processed securely through Paystack.",
  },
  {
    question: "What if an item isn't available?",
    answer:
      "Your agent will immediately notify you if an item isn't available. They'll suggest alternatives which you can approve or skip. You only pay for items you approve.",
  },
  {
    question: "How are delivery fees calculated?",
    answer:
      "Delivery fees depend on your location, order size, and delivery speed (standard or express). You'll see the exact fee before confirming your order.",
  },
  {
    question: "Can I schedule recurring orders?",
    answer:
      "Yes! You can set up weekly or monthly recurring orders for items you buy regularly, like groceries. Great for busy households.",
  },
  {
    question: "How do I become a Shop4Me agent?",
    answer:
      "Click 'Become an Agent' and fill out the application. We require a valid ID, bank account, and smartphone. Training is provided, and you can start earning within a week.",
  },
  {
    question: "What happens if my order is damaged?",
    answer:
      "We have a satisfaction guarantee. If items arrive damaged, report it within 24 hours and we'll arrange a replacement or refund.",
  },
];

const FAQ = () => {
  return (
    <section id="faqs" className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            FAQs
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Got Questions?
          </h2>
          <p className="text-lg text-muted-foreground">
            Find answers to commonly asked questions about Shop4Me.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-soft transition-shadow"
              >
                <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:text-primary py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
