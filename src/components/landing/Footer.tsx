import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, MapPin } from "lucide-react";
import AppDownloadButtons from "./AppDownloadButtons";
import logo from "@/assets/logo.png";

const footerLinks = {
  company: [
    { label: "About Us", href: "/about", isRoute: true },
    { label: "Careers", href: "/careers", isRoute: true },
    { label: "Press", href: "/press", isRoute: true },
    { label: "Blog", href: "/blog", isRoute: true },
  ],
  support: [
    { label: "Help Center", href: "/help", isRoute: true },
    { label: "Contact Us", href: "/contact", isRoute: true },
    { label: "Safety", href: "/safety", isRoute: true },
    { label: "FAQs", href: "/faq", isRoute: true },
  ],
  resources: [
    { label: "How It Works", href: "/how-it-works", isRoute: true },
    { label: "For Agents", href: "/for-agents", isRoute: true },
    { label: "Locations", href: "/locations", isRoute: true },
  ],
  legal: [
    { label: "Terms of Service", href: "/terms", isRoute: true },
    { label: "Privacy Policy", href: "/privacy", isRoute: true },
    { label: "Cookie Policy", href: "/cookies", isRoute: true },
    { label: "Newsletter", href: "/newsletter", isRoute: true },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "https://www.facebook.com/share/16sDCz9Gio/", label: "Facebook" },
  { icon: Twitter, href: "https://x.com/Shop4memarkets", label: "Twitter" },
  { icon: Instagram, href: "https://www.instagram.com/shop4memarkets", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center mb-4">
              <img src={logo} alt="Shop4Me" className="h-10 brightness-0 invert" />
            </Link>
            <p className="text-background/70 mb-4 max-w-sm">
              Shop from any market in Nigeria without leaving home. 
              Trusted agents, transparent pricing, doorstep delivery.
            </p>

            {/* Address */}
            <div className="flex items-start gap-2 text-background/70 mb-6">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                23 Golden Valley Estate,<br />
                Port Harcourt, Rivers State, Nigeria
              </p>
            </div>

            {/* App Download Buttons */}
            <div className="mb-6">
              <p className="text-sm text-background/50 mb-3">Get the app</p>
              <AppDownloadButtons variant="dark" />
            </div>

            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display font-bold mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-background/70 hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-background/70 hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-display font-bold mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-background/70 hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-background/70 hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-display font-bold mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-background/70 hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-background/70 hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-display font-bold mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-background/70 hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-background/70 hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/50 text-sm">
            © {new Date().getFullYear()} Shop4Me. All rights reserved.
          </p>
          <p className="text-background/50 text-sm">
            Made with 💚 in Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
