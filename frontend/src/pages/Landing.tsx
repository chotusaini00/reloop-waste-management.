import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ListPlus, Search, Handshake, CheckCircle2 } from "lucide-react";
import { Logo } from "../App";
import { matColor } from "../materials";

const steps = [[ListPlus, "List", "Suppliers post material, quantity and city."], [Search, "Match", "ReLoop scores every recycler by material, quantity range and city."], [Handshake, "Request", "Eligible recyclers submit a collection request."], [CheckCircle2, "Collect", "Supplier accepts; completion updates the dashboard."]] as const;
const materials = ["Plastic", "Paper", "Metal", "Glass", "Electronic waste", "Organic waste"];

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.7", "end 0.3"] });
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return <section ref={ref} className="max-w-6xl mx-auto px-4 py-16">
    <h2 className="text-2xl font-display font-semibold mb-8">How a collection happens</h2>
    <div className="relative">
      <div className="absolute left-0 right-0 top-5 h-px bg-line hidden sm:block" />
      <motion.div style={{ width }} className="absolute left-0 top-5 h-px bg-brand hidden sm:block" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        {steps.map(([I, t, d], i) => <div key={t}>
          <div className="h-10 w-10 rounded-full bg-white border-2 border-brand text-brand grid place-items-center font-display font-semibold text-sm mb-3 relative z-10">{i + 1}</div>
          <div className="font-display font-semibold">{t}</div><p className="text-sm text-muted mt-1 max-w-[22ch]">{d}</p></div>)}
      </div>
    </div>
  </section>;
}

export default function Landing() {
  return <div className="bg-bg">
    <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16"><Logo /><div className="flex gap-2"><Link className="btn-ghost" to="/app/marketplace">Marketplace</Link><Link className="btn-primary" to="/app">Open app</Link></div></nav>

    <section className="max-w-6xl mx-auto px-4 pt-6 pb-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-stretch">
      <div className="flex flex-col justify-center">
        <h1 className="text-[2.75rem] md:text-6xl font-display font-bold tracking-tight leading-[1.04]">
          Turn waste into<br />opportunity.
        </h1>
        <p className="text-muted text-lg mt-5 max-w-sm">Connect recyclable materials with the businesses that can put them to better use.</p>
        <div className="flex flex-wrap gap-3 mt-8"><Link to="/app/marketplace" className="btn-primary !px-5 !py-3">Explore marketplace <ArrowRight size={16} /></Link><Link to="/app/supplier" className="btn-ghost !px-5 !py-3">List your waste</Link></div>
        <div className="flex gap-6 mt-10 pt-6 border-t border-line text-sm">
          <div><div className="font-display font-semibold text-xl">50/20/30</div><div className="text-muted">match score split</div></div>
          <div><div className="font-display font-semibold text-xl">6</div><div className="text-muted">material categories</div></div>
          <div><div className="font-display font-semibold text-xl">City-only</div><div className="text-muted">matching in this MVP</div></div>
        </div>
      </div>
      <div className="relative rounded-2xl overflow-hidden min-h-[320px] lg:min-h-0">
        <img src="/images/hero.jpg" alt="Baled recyclable material at a sorting facility" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-kraft">
          <div className="flex flex-wrap gap-1.5">{materials.map(m => <span key={m} className="text-xs rounded-full px-2.5 py-1 bg-white/10 backdrop-blur border border-white/20">{m}</span>)}</div>
        </div>
      </div>
    </section>

    <section className="bg-kraft py-16">
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
        <div className="relative rounded-2xl overflow-hidden aspect-[4/3]"><img src="/images/collection.jpg" alt="Sorting recyclable material for collection" className="w-full h-full object-cover" /></div>
        <div>
          <h2 className="text-3xl font-display font-semibold max-w-md">Most recyclable material goes unsold for a simple reason.</h2>
          <p className="text-charcoal/80 mt-4 max-w-lg">Suppliers can't easily find a recycler that accepts their material, at their volume, in their city. ReLoop makes that discovery - and the collection that follows - trackable from listing to completed pickup.</p>
        </div>
      </div>
    </section>

    <HowItWorks />

    <section className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-display font-semibold mb-6">Material categories</h2>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">{materials.map(m => <Link to={`/app/marketplace?material=${encodeURIComponent(m)}`} key={m} className="ticket p-4 pl-5 hover:border-ink/30 transition-colors" style={{ "--mat-color": matColor(m) } as React.CSSProperties}>
        <div className="text-sm font-medium">{m}</div><div className="text-xs text-muted mt-0.5">View listings</div></Link>)}</div>
    </section>

    <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10">
      <div><h3 className="font-display font-semibold text-xl mb-3">For suppliers</h3><ul className="text-sm text-muted space-y-2">
        <li className="flex gap-2"><span className="text-brand">—</span>List material in under a minute</li>
        <li className="flex gap-2"><span className="text-brand">—</span>See which recyclers qualify, and exactly why</li>
        <li className="flex gap-2"><span className="text-brand">—</span>Accept or reject requests; track status end to end</li></ul></div>
      <div><h3 className="font-display font-semibold text-xl mb-3">For recyclers</h3><ul className="text-sm text-muted space-y-2">
        <li className="flex gap-2"><span className="text-brand">—</span>Register accepted materials and a quantity range</li>
        <li className="flex gap-2"><span className="text-brand">—</span>See only listings you can actually process</li>
        <li className="flex gap-2"><span className="text-brand">—</span>Request collection, with duplicate requests blocked</li></ul></div>
    </section>

    <section className="relative py-16 overflow-hidden">
      <img src="/images/texture.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.07]" />
      <div className="relative max-w-6xl mx-auto px-4"><div className="bg-dark text-mint rounded-2xl p-8 md:p-10 max-w-3xl">
        <h2 className="text-2xl font-display font-semibold text-white">Environmental impact, honestly measured</h2>
        <p className="mt-3 text-mint/90">ReLoop reports the weight of completed collection records. Collected is not the same as verified recycled, and no carbon savings are claimed without a documented emissions factor.</p></div></div>
    </section>

    <footer className="border-t border-line py-8 text-center text-xs text-muted">ReLoop - hackathon MVP. Demo data is labelled. Not production-secure.</footer>
  </div>;
}
