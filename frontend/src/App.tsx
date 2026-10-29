import { NavLink, Route, Routes, Link, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Store, Package, Recycle, ClipboardList, Leaf, Bot, Settings as Cog, Menu } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppProvider, useApp, useFetch } from "./ui";
import { api } from "./api";
import type { Recycler } from "./api";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import Supplier from "./pages/Supplier";
import RecyclerPortal from "./pages/RecyclerPortal";
import Requests from "./pages/Requests";
import { Impact, Assistant, SettingsPage } from "./pages/Other";

const NAV = [
  ["/app", "Overview", LayoutDashboard], ["/app/marketplace", "Marketplace", Store], ["/app/supplier", "Supplier Portal", Package],
  ["/app/recycler", "Recycler Portal", Recycle], ["/app/requests", "Collection Requests", ClipboardList],
  ["/app/impact", "Environmental Impact", Leaf], ["/app/assistant", "Recycling Assistant", Bot], ["/app/settings", "Settings", Cog],
] as const;

export const Logo = ({ dark }: { dark?: boolean }) => <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-brand grid place-items-center"><Recycle size={18} className="text-white" /></div><span className={`font-display font-semibold text-lg tracking-tight ${dark ? "text-white" : "text-ink"}`}>ReLoop</span></div>;

function IdentityPicker() {
  const { identity, setIdentity } = useApp();
  const sup = useFetch(() => api<{ id: number; name: string }[]>("/suppliers"), []);
  const rec = useFetch(() => api<Recycler[]>("/recyclers"), []);
  const opts = identity.role === "supplier" ? (sup.data ?? []) : (rec.data ?? []);
  return <div className="flex items-center gap-2" title="Demo identity only - this is NOT authentication or a security boundary">
    <span className="hidden md:inline text-xs text-muted">Demo identity</span>
    <select className="input !w-auto !py-1.5" aria-label="Role" value={identity.role} onChange={e => setIdentity({ role: e.target.value as "supplier" | "recycler", id: null })}><option value="supplier">Supplier</option><option value="recycler">Recycler</option></select>
    <select className="input !w-44 !py-1.5" aria-label="Identity" value={identity.id ?? ""} onChange={e => setIdentity({ ...identity, id: e.target.value ? Number(e.target.value) : null })}><option value="">Select...</option>{opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>;
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const loc = useLocation();
  return <nav className="space-y-1">{NAV.map(([to, label, Icon]) => {
    const active = to === "/app" ? loc.pathname === "/app" : loc.pathname.startsWith(to);
    return <NavLink key={to} to={to} end onClick={onNavigate} className="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors">
      {active && <motion.span layoutId="nav-active" className="absolute inset-0 bg-mint rounded-lg" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
      <span className={`relative flex items-center gap-3 ${active ? "text-dark" : "text-muted"}`}><Icon size={17} />{label}</span>
    </NavLink>;
  })}</nav>;
}

function Shell() {
  const [open, setOpen] = useState(false); const loc = useLocation();
  const crumb = NAV.find(n => n[0] === loc.pathname)?.[1] ?? "Overview";
  return <div className="min-h-screen lg:pl-60">
    <aside className={`fixed inset-y-0 left-0 z-30 w-60 bg-white border-r border-line p-4 flex flex-col transition-transform ${open ? "" : "-translate-x-full"} lg:translate-x-0`}>
      <Link to="/" className="mb-6 px-1"><Logo /></Link>
      <Sidebar onNavigate={() => setOpen(false)} />
      <p className="mt-auto text-[11px] text-muted leading-snug">Local hackathon MVP. Demo data is labelled; no real authentication.</p></aside>
    <header className="sticky top-0 z-20 h-14 bg-white/90 backdrop-blur border-b border-line px-4 flex items-center gap-3">
      <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen(!open)}><Menu size={20} /></button>
      <div className="text-sm text-muted hidden sm:block">ReLoop / <span className="text-ink font-medium">{crumb}</span></div><div className="ml-auto"><IdentityPicker /></div></header>
    <main className="p-4 md:p-8 max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }}>
          <Routes location={loc}>
            <Route index element={<Dashboard />} /><Route path="marketplace" element={<Marketplace />} /><Route path="supplier" element={<Supplier />} />
            <Route path="recycler" element={<RecyclerPortal />} /><Route path="requests" element={<Requests />} /><Route path="impact" element={<Impact />} />
            <Route path="assistant" element={<Assistant />} /><Route path="settings" element={<SettingsPage />} /></Routes>
        </motion.div>
      </AnimatePresence>
    </main></div>;
}

export default function App() {
  return <AppProvider><Routes><Route path="/" element={<Landing />} /><Route path="/app/*" element={<Shell />} /><Route path="*" element={<Navigate to="/" />} /></Routes></AppProvider>;
}
