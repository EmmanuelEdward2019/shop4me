import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/support/WhatsAppButton";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";

const contactInfo = [
  {
    icon: MapPin,
    title: "Address",
    details: ["23 Golden Valley Estate", "Port Harcourt, Rivers State", "Nigeria"],
  },
  {
    icon: Phone,
    title: "Phone",
    details: ["+234 800 000 0000"],
  },
  {
    icon: Mail,
    title: "Email",
    details: ["support@shop4me.ng", "business@shop4me.ng"],
  },
  {
    icon: Clock,
    title: "Business Hours",
    details: ["Monday - Saturday", "8:00 AM - 8:00 PM"],
  },
];

const ContactUs = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

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
                  Contact Us
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                  Get in <span className="text-gradient">Touch</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </p>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Contact Form */}
              <ScrollAnimation>
                <div className="p-8 rounded-3xl bg-card border border-border">
                  <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                    Send us a Message
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="+234 800 000 0000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="How can we help?" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Tell us more about your inquiry..." 
                        rows={5}
                        required 
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full">
                      Send Message
                    </Button>
                  </form>
                </div>
              </ScrollAnimation>

              {/* Contact Info */}
              <div className="space-y-6">
                <ScrollAnimation>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                    Contact Information
                  </h2>
                </ScrollAnimation>

                <div className="space-y-4">
                  {contactInfo.map((info, index) => (
                    <ScrollAnimation key={info.title} delay={index * 0.1}>
                      <div className="p-5 rounded-2xl bg-card border border-border flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <info.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{info.title}</h3>
                          {info.details.map((detail, i) => (
                            <p key={i} className="text-muted-foreground text-sm">{detail}</p>
                          ))}
                        </div>
                      </div>
                    </ScrollAnimation>
                  ))}
                </div>

                {/* WhatsApp CTA */}
                <ScrollAnimation delay={0.4}>
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 text-center mt-8">
                    <MessageCircle className="w-10 h-10 text-primary mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Prefer WhatsApp?
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Get instant support through our WhatsApp chat
                    </p>
                    <Button variant="outline" asChild>
                      <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer">
                        Chat on WhatsApp
                      </a>
                    </Button>
                  </div>
                </ScrollAnimation>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default ContactUs;
