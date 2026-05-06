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
                  Last Updated: April 29, 2026
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
                <h2>1. Introduction</h2>
                <p>
                  Shop4Me Nigeria ("Shop4Me", "we", "us", or "our") operates the Shop4Me mobile application 
                  (available on iOS and Android) and the website at shop4meng.com (collectively, the "Platform"). 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your personal 
                  information when you use our Platform. By using Shop4Me, you consent to the practices described 
                  in this Privacy Policy.
                </p>
                <p>
                  We are committed to protecting your privacy in compliance with the Nigeria Data Protection 
                  Regulation (NDPR), the General Data Protection Regulation (GDPR) where applicable, and any 
                  other relevant data protection laws.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>2. Information We Collect</h2>
                <h3>2.1 Information You Provide Directly</h3>
                <ul>
                  <li><strong>Account Registration:</strong> Full name, email address, phone number, password (stored securely using industry-standard hashing), and Role (Buyer, Agent, or Rider)</li>
                  <li><strong>Profile Information:</strong> Profile photo (optional), service zone preference</li>
                  <li><strong>Delivery Addresses:</strong> Street address, city, state, landmark descriptions, and GPS coordinates (latitude/longitude) when you drop a pin on the map</li>
                  <li><strong>Payment Information:</strong> Card details (processed and stored securely by our PCI-DSS compliant payment processor, Paystack — we do not store your full card number)</li>
                  <li><strong>Order Information:</strong> Shopping lists, item descriptions, quantities, estimated prices, and delivery notes</li>
                  <li><strong>Communications:</strong> In-app chat messages between buyers and shopping agents, support requests, reviews and ratings</li>
                  <li><strong>Agent/Rider Applications:</strong> Date of birth, government ID details, bank account information, vehicle details, business information, and photo for identity verification</li>
                </ul>

                <h3>2.2 Information Collected Automatically</h3>
                <ul>
                  <li><strong>Device Information:</strong> Device model, operating system version, unique device identifiers, app version, browser type</li>
                  <li><strong>Usage Data:</strong> Pages visited, features used, interaction times, session duration, and error logs</li>
                  <li><strong>Location Data:</strong> GPS coordinates (with your explicit consent) for delivery address pin-dropping, agent location tracking during active deliveries, and service zone determination</li>
                  <li><strong>Push Notification Tokens:</strong> Device tokens for sending order updates and notifications (Expo Push Tokens on mobile, Web Push subscriptions on web)</li>
                  <li><strong>Network Information:</strong> IP address, connection type, and referring URLs</li>
                </ul>

                <h3>2.3 Device Hardware Permissions</h3>
                <ul>
                  <li><strong>Camera &amp; Photo Gallery:</strong> We request access to your device camera and photo gallery solely for the purpose of uploading a profile picture and providing image proof of completed transactions (e.g., proof of delivery or purchase). We do not scan, index, or access any other photos or files on your device beyond what you explicitly select and share with us.</li>
                  <li><strong>Biometric Data ("Save Login"):</strong> If you enable the "Save Login" feature, your device's built-in biometric authentication (Face ID, Touch ID, or fingerprint recognition) is used to unlock your account securely. Biometric data is processed entirely on your device by your operating system and is never transmitted to or stored on our servers. We receive only a pass/fail result from your device's secure enclave.</li>
                </ul>

                <h3>2.4 Information from Third Parties</h3>
                <ul>
                  <li><strong>Payment Processor:</strong> Transaction status, payment confirmation, and card metadata (last 4 digits, card type, expiry) from Paystack</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>3. How We Use Your Information</h2>
                <p>We use your personal information for the following purposes:</p>
                <ul>
                  <li><strong>Service Delivery:</strong> To match you with shopping agents, facilitate order placement, enable real-time chat, process payments, and deliver items to your specified address</li>
                  <li><strong>Account Management:</strong> To create and maintain your account, authenticate your identity, manage your wallet balance, and process refunds</li>
                  <li><strong>Communications:</strong> To send order status updates, delivery notifications, payment confirmations, and important platform announcements via push notifications and email</li>
                  <li><strong>Location Services:</strong> To determine your delivery location via GPS pin-drop, track agent location during active deliveries for real-time order tracking, and route orders to nearby agents</li>
                  <li><strong>Safety & Security:</strong> To verify agent and rider identities, prevent fraud, detect suspicious activity, and maintain platform integrity</li>
                  <li><strong>Improvements:</strong> To analyze usage patterns, improve our services, develop new features, and optimize the user experience</li>
                  <li><strong>Customer Support:</strong> To respond to your inquiries, resolve disputes, and provide assistance</li>
                  <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>4. Legal Basis for Processing</h2>
                <p>We process your personal data based on the following legal grounds:</p>
                <ul>
                  <li><strong>Consent:</strong> When you create an account, enable location services, or opt in to push notifications</li>
                  <li><strong>Contractual Necessity:</strong> To perform our obligations under our Terms of Service (processing orders, facilitating payments)</li>
                  <li><strong>Legitimate Interest:</strong> To improve our services, prevent fraud, and ensure platform safety</li>
                  <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations, including the NDPR</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>5. Information Sharing and Disclosure</h2>
                <p>We share your information only as follows:</p>
                <ul>
                  <li><strong>With Shopping Agents:</strong> Your delivery address, order details, and name are shared with assigned agents to fulfill your order. Agents see only the information necessary for order fulfillment.</li>
                  <li><strong>With Delivery Riders:</strong> Your name, phone number, delivery address, and GPS coordinates are shared with riders to facilitate delivery navigation.</li>
                  <li><strong>With Payment Processors:</strong> Paystack processes your payment information securely in compliance with PCI-DSS standards.</li>
                  <li><strong>With Service Providers:</strong> We use Supabase for data storage and authentication, Expo for push notifications, and other providers who help us operate the Platform — all bound by data processing agreements.</li>
                  <li><strong>For Legal Compliance:</strong> When required by law, regulation, legal process, or governmental request.</li>
                  <li><strong>For Safety:</strong> When we believe disclosure is necessary to protect the rights, property, or safety of Shop4Me, our users, or the public.</li>
                </ul>
                <p><strong>We never sell your personal information to third parties for marketing purposes.</strong></p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>6. Location Data</h2>
                <p>
                  Location data is central to our delivery service. Here is how we handle it:
                </p>
                <ul>
                  <li><strong>Buyer Location:</strong> When you save a delivery address, you can optionally drop a pin on a map to provide exact GPS coordinates. This data is stored with your address and shared with agents/riders for delivery navigation only.</li>
                  <li><strong>Agent Location:</strong> During active order fulfillment, agents' real-time location is tracked and shared with the buyer for live order tracking. We use foreground tracking only — location is collected while the app is open and in use or while the agent is actively participating in an ongoing delivery. Agents can enable/disable location sharing in their settings. We do not track agents when they are not actively fulfilling orders.</li>
                  <li><strong>Rider Location:</strong> Similar to agents, rider location is tracked only during active deliveries using foreground tracking while the app is in use.</li>
                  <li><strong>Order Routing:</strong> We use store and agent location data to match orders with nearby agents for efficient fulfillment.</li>
                </ul>
                <p>
                  You can revoke location permissions at any time through your device settings, though this may limit certain Platform features.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>7. Push Notifications</h2>
                <p>
                  We send push notifications to keep you informed about:
                </p>
                <ul>
                  <li>Order status updates (accepted, shopping, in transit, delivered)</li>
                  <li>New order alerts for agents and riders</li>
                  <li>Payment confirmations and wallet activity</li>
                  <li>Chat messages from agents or buyers</li>
                  <li>Important platform announcements</li>
                </ul>
                <p>
                  You can manage notification preferences in your device settings or within the app. 
                  We store push notification tokens (Expo Push Tokens for mobile, Web Push subscriptions 
                  for web browsers) and automatically remove expired or invalid tokens.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>8. Data Security</h2>
                <p>
                  We implement robust security measures to protect your data:
                </p>
                <ul>
                  <li><strong>Encryption:</strong> All data is encrypted in transit using TLS/SSL. Sensitive data is encrypted at rest.</li>
                  <li><strong>Authentication:</strong> We use secure token-based authentication with automatic token refresh. Passwords are hashed using industry-standard algorithms.</li>
                  <li><strong>Payment Security:</strong> All payment processing is handled by Paystack, a PCI-DSS Level 1 certified processor. Webhook signatures are verified using HMAC-SHA512.</li>
                  <li><strong>Access Controls:</strong> Role-based access control (RBAC) ensures users can only access data they are authorized to view. Row-Level Security (RLS) policies enforce data isolation at the database level.</li>
                  <li><strong>Secure Storage:</strong> Uploaded documents (ID photos, chat images) are stored in secure cloud storage buckets with appropriate access policies.</li>
                  <li><strong>Regular Updates:</strong> We regularly update our security practices and dependencies to address known vulnerabilities.</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>9. Data Retention</h2>
                <p>We retain your data according to the following policies:</p>
                <ul>
                  <li><strong>Account Data:</strong> Retained for as long as your account is active. Upon account deletion, personal data is removed or anonymized within 30 days.</li>
                  <li><strong>Order History:</strong> Order records are retained for 3 years for dispute resolution and legal compliance, then anonymized.</li>
                  <li><strong>Payment Records:</strong> Transaction records are retained for 7 years as required by Nigerian financial regulations.</li>
                  <li><strong>Chat Messages:</strong> Retained for 1 year after order completion, then automatically deleted.</li>
                  <li><strong>Location Data:</strong> Real-time tracking data is deleted within 24 hours after delivery. Saved address coordinates are retained until you delete the address.</li>
                  <li><strong>Agent/Rider Applications:</strong> Approved applications are retained while the agent/rider is active. Rejected applications are retained for 6 months, then deleted.</li>
                </ul>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>10. Your Rights</h2>
                <p>Under the NDPR and applicable data protection laws, you have the following rights:</p>
                <ul>
                  <li><strong>Right of Access:</strong> Request a copy of the personal data we hold about you.</li>
                  <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data. You can update most information directly in the app settings.</li>
                  <li><strong>Right to Erasure:</strong> Request deletion of your account and associated personal data. Use the "Delete Account" option in Settings, or contact us directly.</li>
                  <li><strong>Right to Restrict Processing:</strong> Request that we limit how we process your data in certain circumstances.</li>
                  <li><strong>Right to Data Portability:</strong> Request your data in a structured, commonly used, machine-readable format.</li>
                  <li><strong>Right to Object:</strong> Object to processing of your data based on legitimate interests.</li>
                  <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time (e.g., for location tracking, push notifications) without affecting the lawfulness of prior processing.</li>
                </ul>
                <p>
                  To exercise any of these rights, contact us at <a href="mailto:support@shop4meng.com">support@shop4meng.com</a>. We will respond within 30 days.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>11. Children's Privacy</h2>
                <p>
                  Our Platform is not intended for users under 18 years of age. We do not knowingly collect 
                  personal information from children under 18. If we discover that we have inadvertently 
                  collected data from a child under 18, we will promptly delete it. If you believe a child
                  under 18 has provided us with personal information, please contact us at support@shop4meng.com.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>12. Third-Party Services</h2>
                <p>Our Platform integrates with the following third-party services:</p>
                <ul>
                  <li><strong>Supabase:</strong> Database hosting, user authentication, and real-time data synchronization (servers in the EU/US)</li>
                  <li><strong>Paystack:</strong> Payment processing (PCI-DSS Level 1 certified, Nigeria-based)</li>
                  <li><strong>Expo:</strong> Push notification delivery for mobile applications</li>
                  <li><strong>Google Maps / Leaflet:</strong> Map display and geocoding for delivery addresses</li>
                  <li><strong>Vercel:</strong> Web application hosting</li>
                </ul>
                <p>
                  Each of these services has its own privacy policy governing how it handles your data. 
                  We encourage you to review their respective privacy policies.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>13. International Data Transfers</h2>
                <p>
                  Your data may be transferred to and processed in countries outside Nigeria where our 
                  service providers operate. When we transfer data internationally, we ensure appropriate 
                  safeguards are in place, including standard contractual clauses and adequacy decisions, 
                  to protect your data in accordance with the NDPR and applicable laws.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>14. Cookies and Tracking Technologies</h2>
                <p>
                  Our web platform uses essential cookies for authentication and session management. 
                  We use local storage to persist your login session securely. We do not use third-party 
                  tracking cookies or advertising pixels. The mobile app uses device-local storage for 
                  authentication tokens only.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>15. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. When we make material changes, 
                  we will notify you through the Platform (via in-app notification or email) at least 
                  7 days before the changes take effect. The "Last Updated" date at the top of this 
                  page reflects the most recent revision. Continued use of the Platform after changes 
                  take effect constitutes acceptance of the updated policy.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>16. Data Protection Officer</h2>
                <p>
                  For privacy-related inquiries, complaints, or to exercise your data rights, please contact:
                </p>
                <ul>
                  <li><strong>Email:</strong> support@shop4meng.com</li>
                  <li><strong>Phone:</strong> +234 XXX XXX XXXX</li>
                  <li><strong>Address:</strong> 23 Golden Valley Estate, Port Harcourt, Rivers State, Nigeria, Africa</li>
                </ul>
                <p>
                  If you are not satisfied with our response, you have the right to lodge a complaint 
                  with the National Information Technology Development Agency (NITDA), the supervisory 
                  authority for data protection in Nigeria.
                </p>
              </ScrollAnimation>

              <ScrollAnimation>
                <h2>17. Consent</h2>
                <p>
                  By creating an account and using Shop4Me, you acknowledge that you have read and 
                  understood this Privacy Policy and consent to the collection, use, and disclosure 
                  of your personal information as described herein. You may withdraw your consent at 
                  any time by contacting us or deleting your account.
                </p>
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
