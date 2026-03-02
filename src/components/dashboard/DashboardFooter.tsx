import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import logo from "@/assets/logo.png";

const footerLinks = {
  resources: [
    { label: "How It Works", href: "/how-it-works" },
    { label: "For Agents", href: "/for-agents" },
    { label: "Locations", href: "/locations" },
    { label: "FAQs", href: "/faq" },
  ],
  support: [
    { label: "Help Center", href: "#" },
    { label: "Contact Us", href: "#" },
  ],
  legal: [
    { label: "Terms of Service", href: "#" },
    { label: "Privacy Policy", href: "#" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "https://www.facebook.com/share/16sDCz9Gio/", label: "Facebook" },
  { icon: Twitter, href: "https://x.com/Shop4memarkets", label: "Twitter" },
  { icon: Instagram, href: "https://www.instagram.com/shop4memarkets", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

const DashboardFooter = () => {
  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="px-6 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center mb-3">
              <img src={logo} alt="Shop4Me" className="h-8 brightness-0 invert" />
            </Link>
            <p className="text-background/70 text-sm mb-4">
              Shop from any market in Nigeria without leaving home.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-8 h-8 rounded-lg bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-bold text-sm mb-3">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-secondary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-bold text-sm mb-3">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-background/70 hover:text-secondary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-bold text-sm mb-3">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-background/70 hover:text-secondary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/10 mt-6 pt-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-background/50 text-xs">
            © {new Date().getFullYear()} Shop4Me. All rights reserved.
          </p>
          <p className="text-background/50 text-xs">
            Made with 💚 in Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;
