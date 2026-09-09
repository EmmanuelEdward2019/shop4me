import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, MapPin, Wallet, Truck, MessageSquare, Receipt,
  ListChecks, ShoppingBasket, Clock, Star, ChevronDown, Sparkles,
} from "lucide-react";
import GetAppButtons from "@/components/landing/GetAppButtons";
import logo from "@/assets/logo.png";
import heroImage from "@/assets/hero-agent.jpg";
import shotDashboard from "@/assets/app-screenshot-dashboard.jpg";
import shotShopping from "@/assets/app-screenshot-shopping.jpg";
import agentMarket from "@/assets/agent-market.jpg";
import agentVerifying from "@/assets/agent-verifying.jpg";
import deliveryAgent from "@/assets/delivery-agent.jpg";
import marketBalogun from "@/assets/market-balogun.jpg";
import mallIkeja from "@/assets/mall-ikeja.jpg";
import mallPalms from "@/assets/mall-palms.jpg";

// Served from public/ (same file the main site uses) so the 31MB video is not bundled.
const howItWorksVideo = "/shop4me-how-it-works.mp4";

/* Shared scroll-reveal */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};
const reveal = {
  initial: "hidden" as const,
  whileInView: "show" as const,
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
  variants: fadeUp,
};

/* A lightweight CSS phone frame so screenshots read as "the app" */
const PhoneFrame = ({ src, alt, className = "" }: { src: string; alt: string; className?: string }) => (
  <div className={`relative mx-auto w-[210px] sm:w-[240px] ${className}`}>
    <div className="relative rounded-[2.2rem] border-[10px] border-foreground/90 bg-foreground/90 shadow-2xl">
      <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-foreground/90" />
      <img src={src} alt={alt} loading="lazy" className="block h-full w-full rounded-[1.5rem] object-cover" />
    </div>
  </div>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <p className="font-display text-3xl font-bold text-primary md:text-4xl">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground md:text-sm">{label}</p>
  </div>
);

const faqs = [
  {
    q: "How much does it cost?",
    a: "The app is free to download. You pay for your items plus a clear service and delivery fee that is shown to you before you confirm — no hidden markups on market prices.",
  },
  {
    q: "How do I know the agent buys exactly what I asked for?",
    a: "You chat with your agent live while they shop. They send you an invoice with the real prices, and nothing is paid for until you approve it.",
  },
  {
    q: "Where do you deliver?",
    a: "Open the app to see the markets, malls and supermarkets available near you — we're adding new locations regularly.",
  },
  {
    q: "How do I pay?",
    a: "Securely inside the app, by card or from your Shop4Me wallet. You can also top up your wallet and pay from your balance.",
  },
  {
    q: "Is it safe?",
    a: "Every agent is ID-verified and rated by customers, and you can track your order from the shop right to your doorstep.",
  },
];

const GetApp = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    document.title = "Download Shop4Me — Your market, shopped and delivered";
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Minimal header: no nav, one job ───────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Shop4Me" className="h-9 w-auto" />
          </div>
          <a
            href="#get-app"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            Get the app
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section id="get-app" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

          <div className="container relative mx-auto max-w-6xl px-4 pb-14 pt-12 md:pb-20 md:pt-16">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <motion.div initial="hidden" animate="show" transition={{ duration: 0.5 }} variants={fadeUp}>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  10,000+ orders delivered
                </span>

                <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight text-foreground md:text-5xl lg:text-[3.4rem]">
                  Skip the market.{" "}
                  <span className="relative inline-block text-primary">
                    We'll shop it
                    <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 12" fill="none" aria-hidden>
                      <path d="M2 10C50 4 150 4 198 10" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </span>{" "}
                  for you.
                </h1>

                <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                  Send your shopping list and a <strong className="font-semibold text-foreground">verified agent
                  shops it live</strong> — from local markets, malls and supermarkets — then delivers straight
                  to your door. No traffic. No queues. No haggling.
                </p>

                <GetAppButtons size="lg" className="mt-8" showNote />

                <ul className="mt-8 grid grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: ShieldCheck, t: "ID-verified agents" },
                    { icon: MessageSquare, t: "Chat while they shop" },
                    { icon: Receipt, t: "Real prices, no markup" },
                    { icon: MapPin, t: "Live order tracking" },
                  ].map(({ icon: Icon, t }) => (
                    <li key={t} className="flex items-center gap-2 text-foreground/80">
                      <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
                      {t}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Hero visual: photo + app screenshot overlay */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <div className="overflow-hidden rounded-3xl border border-border shadow-2xl">
                  <img
                    src={heroImage}
                    alt="A verified Shop4Me agent shopping at a Nigerian market"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>

                <div className="absolute -bottom-8 -right-2 hidden sm:block">
                  <PhoneFrame src={shotShopping} alt="Shopping with your agent in the Shop4Me app" className="w-[150px] sm:w-[165px]" />
                </div>

                <div className="absolute -left-3 bottom-6 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-xl backdrop-blur">
                  <div className="flex items-center gap-1 text-accent">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-1 text-xs font-medium text-foreground">Rated by real customers</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── VALUE STRIP ──────────────────────────────────────────────── */}
        <section className="border-y border-border bg-muted/40 py-8">
          <div className="container mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 md:grid-cols-4">
            {[
              { icon: Clock, t: "Save hours", d: "No traffic, no queues" },
              { icon: ShieldCheck, t: "Verified agents", d: "ID-checked & rated" },
              { icon: Wallet, t: "Secure payment", d: "Card or in-app wallet" },
              { icon: Truck, t: "Doorstep delivery", d: "Tracked door to door" },
            ].map(({ icon: Icon, t, d }) => (
              <motion.div key={t} {...reveal} className="flex flex-col items-center text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">{t}</p>
                <p className="text-xs text-muted-foreground">{d}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Three taps. That's it.
              </h2>
              <p className="mt-3 text-muted-foreground">
                From your shopping list to your doorstep — you stay in control the whole way.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { icon: ListChecks, n: "01", t: "Send your list", d: "Add your items, choose a market or store, and set your delivery address." },
                { icon: ShoppingBasket, n: "02", t: "Your agent shops live", d: "Chat in real time, swap anything out of stock, and approve the invoice before they pay." },
                { icon: Truck, n: "03", t: "Delivered to your door", d: "Track your order from the shop to your doorstep — and rate your agent when it lands." },
              ].map(({ icon: Icon, n, t, d }, i) => (
                <motion.div
                  key={t}
                  {...reveal}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-lg"
                >
                  <span className="font-display text-5xl font-bold text-primary/10">{n}</span>
                  <span className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-2 font-display text-lg font-bold text-foreground">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── VIDEO ────────────────────────────────────────────────────── */}
        <section className="bg-muted/40 py-16 md:py-24">
          <div className="container mx-auto max-w-4xl px-4">
            <motion.div {...reveal} className="text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                See Shop4Me in action
              </h2>
              <p className="mt-3 text-muted-foreground">A quick look at how an order goes from list to doorstep.</p>
            </motion.div>

            <motion.div {...reveal} className="mt-10 overflow-hidden rounded-3xl border border-border shadow-2xl">
              <video
                src={howItWorksVideo}
                controls
                playsInline
                muted
                loop
                preload="metadata"
                poster={agentMarket}
                className="block aspect-video w-full bg-black object-cover"
              />
            </motion.div>

            <div className="mt-10 flex justify-center">
              <GetAppButtons size="lg" />
            </div>
          </div>
        </section>

        {/* ── APP SHOWCASE ─────────────────────────────────────────────── */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <motion.div {...reveal} className="order-2 lg:order-1">
                <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Everything in one app
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Built for the way Nigerians actually shop — transparent, chat-first and fully tracked.
                </p>

                <div className="mt-8 space-y-5">
                  {[
                    { icon: MessageSquare, t: "Chat with your agent", d: "Out of stock? Different brand? Sort it out in seconds, right in the app." },
                    { icon: Receipt, t: "Approve before they pay", d: "See a real invoice with real market prices, then approve it. No surprises." },
                    { icon: MapPin, t: "Track every step", d: "Watch your order move from the market to your door in real time." },
                    { icon: Wallet, t: "Wallet & card payments", d: "Top up your wallet or pay by card — securely, every time." },
                  ].map(({ icon: Icon, t, d }) => (
                    <div key={t} className="flex gap-4">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{t}</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <GetAppButtons size="lg" className="mt-9" />
              </motion.div>

              <motion.div {...reveal} className="order-1 flex justify-center gap-4 lg:order-2">
                <PhoneFrame src={shotDashboard} alt="Shop4Me app dashboard" className="translate-y-4" />
                <PhoneFrame src={shotShopping} alt="Shopping list in the Shop4Me app" className="-translate-y-4 hidden sm:block" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── WHY SHOP4ME (image cards) ────────────────────────────────── */}
        <section className="bg-muted/40 py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Why people switch to Shop4Me
              </h2>
            </motion.div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { img: agentVerifying, t: "Agents you can trust", d: "Every agent is ID-verified, trained and rated by customers after each order." },
                { img: agentMarket, t: "Real market prices", d: "Your agent shops the same stalls you would — and shows you the receipt." },
                { img: deliveryAgent, t: "Delivered fast", d: "A rider takes it the last mile, so your shopping reaches you the same day." },
              ].map(({ img, t, d }, i) => (
                <motion.div
                  key={t}
                  {...reveal}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-xl"
                >
                  <div className="overflow-hidden">
                    <img src={img} alt={t} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-lg font-bold text-foreground">{t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MARKETS ──────────────────────────────────────────────────── */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Markets, malls &amp; supermarkets
              </h2>
              <p className="mt-3 text-muted-foreground">
                From the busiest local markets to your favourite mall — open the app to see what's near you.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { img: marketBalogun, t: "Local markets" },
                { img: mallIkeja, t: "Shopping malls" },
                { img: mallPalms, t: "Supermarkets" },
              ].map(({ img, t }, i) => (
                <motion.div key={t} {...reveal} transition={{ duration: 0.5, delay: i * 0.08 }} className="relative overflow-hidden rounded-2xl shadow-lg">
                  <img src={img} alt={t} loading="lazy" className="aspect-[4/5] w-full object-cover sm:aspect-[3/4]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <p className="absolute bottom-4 left-4 font-display text-lg font-bold text-white">{t}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <section className="border-y border-border bg-muted/40 py-12">
          <div className="container mx-auto grid max-w-4xl grid-cols-3 gap-6 px-4">
            <Stat value="10,000+" label="Orders delivered" />
            <Stat value="Same day" label="Typical delivery" />
            <Stat value="100%" label="Agents ID-verified" />
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4">
            <motion.div {...reveal} className="text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Questions, answered
              </h2>
            </motion.div>

            <div className="mt-10 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {faqs.map((f, i) => (
                <div key={f.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-muted/50"
                  >
                    <span className="text-sm font-semibold text-foreground md:text-base">{f.q}</span>
                    <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-primary py-16 md:py-24">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />

          <div className="container relative mx-auto max-w-3xl px-4 text-center">
            <motion.div {...reveal}>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl">
                Your next market run? Skip it.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/85 md:text-lg">
                Download Shop4Me free and send your first shopping list in under two minutes.
              </p>
              <div className="mt-9 flex justify-center">
                <GetAppButtons size="lg" variant="light" showNote />
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Minimal footer (legal links required for ad platforms) ─────── */}
      <footer className="border-t border-border bg-background py-8 pb-28 md:pb-8">
        <div className="container mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center">
          <img src={logo} alt="Shop4Me" className="h-8 w-auto opacity-80" />
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground">Privacy Policy</a>
            <a href="/terms" className="hover:text-foreground">Terms of Service</a>
            <a href="/contact" className="hover:text-foreground">Contact</a>
            <a href="/delete-account" className="hover:text-foreground">Delete Account</a>
          </nav>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Shop4Me. Smart shopping, delivered.
          </p>
        </div>
      </footer>

      {/* ── Sticky mobile CTA — the highest-converting element on mobile ─ */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 shadow-2xl backdrop-blur md:hidden">
        <GetAppButtons size="md" className="[&>div]:justify-center" />
      </div>
    </div>
  );
};

export default GetApp;
