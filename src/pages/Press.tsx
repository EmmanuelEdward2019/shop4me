import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/support/WhatsAppButton";
import { ScrollAnimation } from "@/components/ui/scroll-animation";
import { Button } from "@/components/ui/button";
import { FileText, Download, Mail, ExternalLink, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import pressMediaImage from "@/assets/press-media.jpg";

interface PressRelease {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
}

const Press = () => {
  const { data: pressReleases, isLoading } = useQuery({
    queryKey: ["press-releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, published_at, created_at")
        .eq("is_published", true)
        .eq("category", "press")
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as PressRelease[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <ScrollAnimation>
              <div className="text-center max-w-3xl mx-auto mb-12">
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
            <ScrollAnimation delay={0.2}>
              <img 
                src={pressMediaImage} 
                alt="Press conference and media" 
                className="w-full max-w-4xl mx-auto aspect-[21/9] object-cover rounded-3xl"
              />
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
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-6 rounded-2xl bg-card border border-border">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))
              ) : pressReleases && pressReleases.length > 0 ? (
                pressReleases.map((release, index) => (
                  <ScrollAnimation key={release.id} delay={index * 0.1}>
                    <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
                      <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(release.published_at || release.created_at), "MMMM yyyy")}
                      </span>
                      <h3 className="text-xl font-semibold text-foreground mt-2 mb-3">{release.title}</h3>
                      {release.excerpt && (
                        <p className="text-muted-foreground mb-4">{release.excerpt}</p>
                      )}
                      <Button variant="ghost" size="sm" className="gap-2" asChild>
                        <Link to={`/blog/${release.slug}`}>
                          Read More <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </ScrollAnimation>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No press releases available yet.
                </div>
              )}
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
