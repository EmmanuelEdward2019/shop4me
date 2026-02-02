import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/support/WhatsAppButton";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { FileText, Download, Mail, ExternalLink } from "lucide-react";

const pressReleases = [
  {
    date: "January 2024",
    title: "Shop4Me Launches in Port Harcourt",
    excerpt: "Revolutionary personal shopping platform connects customers with local market experts.",
  },
  {
    date: "February 2024",
    title: "Shop4Me Reaches 500 Active Agents",
    excerpt: "Growing network of verified agents now serving all major markets in Port Harcourt.",
  },
  {
    date: "March 2024",
    title: "Shop4Me Partners with Major Supermarket Chains",
    excerpt: "Strategic partnerships expand shopping options for customers across the city.",
  },
];

const Press = () => {
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
                  Press & Media
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                  Shop4Me in the <span className="text-gradient">News</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Latest news, press releases, and media resources about Shop4Me.
                </p>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Press Releases */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Press Releases
                </h2>
              </div>
            </ScrollAnimation>

            <div className="max-w-3xl mx-auto space-y-6">
              {pressReleases.map((release, index) => (
                <ScrollAnimation key={release.title} delay={index * 0.1}>
                  <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
                    <span className="text-sm text-primary font-medium">{release.date}</span>
                    <h3 className="text-xl font-semibold text-foreground mt-2 mb-3">{release.title}</h3>
                    <p className="text-muted-foreground mb-4">{release.excerpt}</p>
                    <Button variant="ghost" size="sm" className="gap-2">
                      Read More <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>

        {/* Media Kit */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <ScrollAnimation>
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                    Media Kit
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Download our brand assets and company information
                  </p>
                </div>
              </ScrollAnimation>

              <div className="grid md:grid-cols-2 gap-6">
                <ScrollAnimation delay={0.1}>
                  <div className="p-6 rounded-2xl bg-card border border-border text-center">
                    <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Brand Guidelines</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Logos, colors, and usage guidelines
                    </p>
                    <Button variant="outline" className="gap-2">
                      <Download className="w-4 h-4" /> Download
                    </Button>
                  </div>
                </ScrollAnimation>

                <ScrollAnimation delay={0.2}>
                  <div className="p-6 rounded-2xl bg-card border border-border text-center">
                    <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Company Fact Sheet</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Key facts and statistics about Shop4Me
                    </p>
                    <Button variant="outline" className="gap-2">
                      <Download className="w-4 h-4" /> Download
                    </Button>
                  </div>
                </ScrollAnimation>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-2xl mx-auto p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                  Media Inquiries
                </h2>
                <p className="text-muted-foreground mb-6">
                  For press inquiries, interviews, or additional information, please contact our media team.
                </p>
                <Button size="lg" asChild>
                  <a href="mailto:press@shop4me.ng">press@shop4me.ng</a>
                </Button>
              </div>
            </ScrollAnimation>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Press;
