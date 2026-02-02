import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ScrollAnimation } from "@/components/ui/scroll-animation";

const CookiePolicy = () => {
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
                  Legal
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
                  Cookie <span className="text-gradient">Policy</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Last updated: February 2, 2026
                </p>
              </div>
            </ScrollAnimation>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto prose prose-lg dark:prose-invert">
              <ScrollAnimation>
                <h2>What Are Cookies?</h2>
                <p>
                  Cookies are small text files stored on your device when you visit a website. 
                  They help websites remember your preferences and improve your browsing experience.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>How We Use Cookies</h2>
                <p>Shop4Me uses cookies for the following purposes:</p>
                
                <h3>Essential Cookies</h3>
                <p>
                  These cookies are necessary for the website to function properly. They enable 
                  core functionality such as security, authentication, and session management.
                </p>
                <ul>
                  <li>User authentication and login sessions</li>
                  <li>Security features and fraud prevention</li>
                  <li>Shopping cart and order management</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h3>Functional Cookies</h3>
                <p>
                  These cookies enable enhanced functionality and personalization:
                </p>
                <ul>
                  <li>Remembering your preferences and settings</li>
                  <li>Storing your delivery addresses</li>
                  <li>Language and region preferences</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h3>Analytics Cookies</h3>
                <p>
                  We use analytics cookies to understand how visitors interact with our website:
                </p>
                <ul>
                  <li>Pages visited and time spent</li>
                  <li>Navigation patterns</li>
                  <li>Error reporting and performance monitoring</li>
                </ul>
                <p>
                  This data is anonymized and helps us improve our services.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>Third-Party Cookies</h2>
                <p>
                  Some cookies are placed by third-party services we use:
                </p>
                <ul>
                  <li><strong>Payment Providers:</strong> Paystack for secure payment processing</li>
                  <li><strong>Analytics:</strong> To understand usage patterns</li>
                  <li><strong>Maps:</strong> For location and delivery services</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>Managing Cookies</h2>
                <p>
                  You can control and manage cookies in several ways:
                </p>
                <ul>
                  <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or delete cookies</li>
                  <li><strong>Device Settings:</strong> Mobile devices have settings for managing cookies</li>
                  <li><strong>Opt-Out Tools:</strong> Some analytics services offer opt-out mechanisms</li>
                </ul>
                <p>
                  Note: Disabling certain cookies may affect the functionality of our platform 
                  and your user experience.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>Cookie Retention</h2>
                <p>Different cookies are retained for different periods:</p>
                <ul>
                  <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
                  <li><strong>Persistent Cookies:</strong> Remain until expiration or manual deletion</li>
                  <li><strong>Authentication Cookies:</strong> Valid for your session or "remember me" period</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>Updates to This Policy</h2>
                <p>
                  We may update this Cookie Policy to reflect changes in our practices or for 
                  operational, legal, or regulatory reasons. Please review this policy periodically.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>Contact Us</h2>
                <p>
                  If you have questions about our use of cookies, please contact:
                </p>
                <ul>
                  <li>Email: privacy@shop4me.ng</li>
                  <li>Address: 23 Golden Valley Estate, Port Harcourt, Rivers State, Nigeria</li>
                </ul>
              </ScrollAnimation>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
