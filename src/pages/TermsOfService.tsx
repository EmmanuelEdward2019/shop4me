import { useEffect } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ScrollAnimation } from "@/components/ui/scroll-animation";

const TermsOfService = () => {
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
                  Terms of <span className="text-gradient">Service</span>
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
                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing and using Shop4Me's services, you agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, please do not use our platform.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>2. Description of Service</h2>
                <p>
                  Shop4Me provides a platform connecting buyers with verified shopping agents who can 
                  purchase items from markets, malls, and stores on behalf of buyers and deliver them 
                  to specified locations within Nigeria.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>3. User Accounts</h2>
                <p>To use our services, you must:</p>
                <ul>
                  <li>Be at least 18 years of age</li>
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>4. Orders and Payments</h2>
                <p>
                  When you place an order through Shop4Me:
                </p>
                <ul>
                  <li>You agree to pay all applicable fees, including item costs, service fees, and delivery charges</li>
                  <li>Prices for items are estimates until confirmed by the agent at the point of purchase</li>
                  <li>Payment is processed through our secure wallet system</li>
                  <li>Refunds are subject to our refund policy and case-by-case review</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>5. Agent Responsibilities</h2>
                <p>
                  Our shopping agents are independent contractors who:
                </p>
                <ul>
                  <li>Must complete our verification and training process</li>
                  <li>Are responsible for accurate item selection and careful handling</li>
                  <li>Must maintain professional conduct at all times</li>
                  <li>Are subject to ratings and reviews from buyers</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>6. Prohibited Activities</h2>
                <p>Users may not:</p>
                <ul>
                  <li>Use the platform for illegal purposes</li>
                  <li>Request purchase of prohibited or illegal items</li>
                  <li>Harass, abuse, or harm other users or agents</li>
                  <li>Attempt to circumvent the platform for direct transactions</li>
                  <li>Create multiple accounts or impersonate others</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>7. Limitation of Liability</h2>
                <p>
                  Shop4Me acts as an intermediary platform. We are not liable for:
                </p>
                <ul>
                  <li>Quality or condition of items purchased (though we facilitate dispute resolution)</li>
                  <li>Actions of independent shopping agents beyond our control</li>
                  <li>Delays due to traffic, weather, or other external factors</li>
                  <li>Indirect, incidental, or consequential damages</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>8. Dispute Resolution</h2>
                <p>
                  In case of disputes, users should contact our support team. We provide mediation 
                  services and work to resolve issues fairly for all parties involved.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>9. Changes to Terms</h2>
                <p>
                  We may update these terms from time to time. Continued use of the platform after 
                  changes constitutes acceptance of the new terms.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>10. Contact Us</h2>
                <p>
                  For questions about these Terms of Service, please contact us at:
                </p>
                <ul>
                  <li>Email: legal@shop4me.ng</li>
                  <li>Address: 23 Golden Valley Estate, Port Harcourt, Rivers State, Nigeria, Africa</li>
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

export default TermsOfService;
