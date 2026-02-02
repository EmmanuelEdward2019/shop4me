import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ScrollAnimation } from "@/components/ui/scroll-animation";

const PrivacyPolicy = () => {
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
                  Privacy <span className="text-gradient">Policy</span>
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
                <h2>1. Information We Collect</h2>
                <p>We collect information you provide directly to us, including:</p>
                <ul>
                  <li><strong>Account Information:</strong> Name, email address, phone number, and password</li>
                  <li><strong>Delivery Information:</strong> Delivery addresses and landmarks</li>
                  <li><strong>Payment Information:</strong> Card details (processed securely by Paystack)</li>
                  <li><strong>Order Information:</strong> Shopping lists, preferences, and order history</li>
                  <li><strong>Communication Data:</strong> Messages between buyers and agents</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>2. How We Use Your Information</h2>
                <p>We use your information to:</p>
                <ul>
                  <li>Facilitate shopping orders and deliveries</li>
                  <li>Process payments and maintain your wallet</li>
                  <li>Connect you with verified shopping agents</li>
                  <li>Provide customer support and resolve disputes</li>
                  <li>Send order updates and important notifications</li>
                  <li>Improve our services and develop new features</li>
                  <li>Ensure platform safety and prevent fraud</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>3. Information Sharing</h2>
                <p>We share your information only as follows:</p>
                <ul>
                  <li><strong>With Agents:</strong> Delivery address and order details for fulfillment</li>
                  <li><strong>With Payment Processors:</strong> To process transactions securely</li>
                  <li><strong>With Service Providers:</strong> Who help us operate the platform</li>
                  <li><strong>For Legal Compliance:</strong> When required by law or to protect rights</li>
                </ul>
                <p>We never sell your personal information to third parties.</p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>4. Location Data</h2>
                <p>
                  For delivery purposes, we collect and use location data including:
                </p>
                <ul>
                  <li>Delivery addresses you provide</li>
                  <li>Agent real-time location during active deliveries (with consent)</li>
                </ul>
                <p>
                  Location sharing for agents can be enabled/disabled in settings. 
                  We do not track location when not actively fulfilling orders.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>5. Data Security</h2>
                <p>
                  We implement industry-standard security measures including:
                </p>
                <ul>
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure payment processing through PCI-compliant providers</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and authentication requirements</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>6. Data Retention</h2>
                <p>
                  We retain your data for as long as your account is active or as needed to provide 
                  services. You may request deletion of your account and associated data at any time.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul>
                  <li>Access your personal data</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your data</li>
                  <li>Object to certain processing activities</li>
                  <li>Export your data in a portable format</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>8. Children's Privacy</h2>
                <p>
                  Our services are not intended for users under 18 years of age. We do not knowingly 
                  collect information from children.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>9. Changes to This Policy</h2>
                <p>
                  We may update this privacy policy periodically. We will notify you of significant 
                  changes via email or through the platform.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>10. Contact Us</h2>
                <p>
                  For privacy-related inquiries, please contact:
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

export default PrivacyPolicy;
