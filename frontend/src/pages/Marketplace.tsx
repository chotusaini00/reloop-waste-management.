import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { api, qs, kg, date, Listing, Match, MATERIALS, ApiError } from "../api";
import { Badge, DemoTag, Empty, ErrorBox, Modal, PageHeader, Spinner, useApp, useFetch } from "../ui";
import { matColor } from "../materials";

type Page = { items: Listing[]; total: number; page: number; page_size: number };

function Detail({ l, onClose, onChange }: { l: Listing; onClose: () => void; onChange: () => void }) {
  const { identity, toast } = useApp();
  const m = useFetch(() => api<Match[]>(`/listings/${l.id}/matches`), [l.id]);
  const request = async () => {
    try { await api("/requests", { method: "POST", body: { listing_id: l.id, recycler_id: identity.id } }); toast("Collection request submitted"); onChange(); onClose(); }
    catch (e) { toast((e as ApiError).message, "err"); }
  };
  const mine = identity.role === "recycler" && identity.id ? m.data?.find(x => x.recycler_id === identity.id) : undefined;
  return <Modal title={`${l.material} - ${kg(l.quantity_kg)}`} onClose={onClose}>
    <div className="text-sm text-muted mb-3">{l.supplier_name} - {l.city} - listed {date(l.created_at)} - {l.price_per_kg != null ? `₹${l.price_per_kg}/kg` : "No price set"}</div>
    {l.description && <p className="text-sm mb-3">{l.description}</p>}<div className="mb-4 flex gap-2"><Badge s={l.status} /><DemoTag demo={l.is_demo} /></div>
    {identity.role === "recycler" && identity.id && mine && <div className={`rounded-lg p-3 mb-4 text-sm ${mine.eligible ? "bg-mint" : "bg-err/10"}`}>
      <b>{mine.eligible ? `You are eligible (score ${mine.match_score}/100)` : "You are not eligible"}</b>
      <ul className="list-disc pl-5 mt-1">{(mine.eligible ? mine.eligibility_reasons : mine.ineligibility_reasons).map(x => <li key={x}>{x}</li>)}</ul>
      {mine.eligible && l.status === "available" && <button className="btn-primary mt-3" onClick={request}>Request collection</button>}</div>}
    <h3 className="font-semibold text-sm mb-2">Recycler matches</h3>
    {m.loading ? <Spinner /> : m.error ? <ErrorBox msg={m.error} /> : <div className="space-y-2 max-h-72 overflow-auto">{m.data!.map(x => <div key={x.recycler_id} className="border border-line rounded-lg p-3 text-sm">
      <div className="flex justify-between"><b>{x.business_name} <span className="font-normal text-muted">({x.city})</span></b>{x.eligible ? <Badge s="available" label={`${x.match_score}/100`} /> : <Badge s="rejected" label="Not eligible" />}</div>
      {x.eligible && <div className="text-xs text-muted mt-1">Material {x.score_components.material} + City {x.score_components.city} + Quantity {x.score_components.quantity}</div>}
      <ul className="text-xs text-muted list-disc pl-5 mt-1">{(x.eligible ? x.eligibility_reasons : x.ineligibility_reasons).map(r => <li key={r}>{r}</li>)}</ul></div>)}</div>}
  </Modal>;
}

export default function Marketplace() {
  const [sp] = useSearchParams();
  const [f, setF] = useState({ material: sp.get("material") ?? "", city: "", min_qty: "", max_qty: "", q: "", sort: "newest" });
  const [page, setPage] = useState(1); const [open, setOpen] = useState<Listing | null>(null);
  const set = (k: string, v: string) => { setF({ ...f, [k]: v }); setPage(1); };
  const { data, error, loading, reload } = useFetch(() => api<Page>("/listings" + qs({ ...f, status: "available", page, page_size: 9 })), [JSON.stringify(f), page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  return <div><PageHeader title="Marketplace" sub="Available waste listings. Reserved and completed listings are not shown." />
    <div className="card p-4 grid sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
      <div className="lg:col-span-2 relative"><Search size={14} className="absolute left-3 top-3 text-muted" /><input className="input !pl-8" placeholder="Search supplier, city, notes" aria-label="Search" value={f.q} onChange={e => set("q", e.target.value)} /></div>
      <select className="input" aria-label="Material" value={f.material} onChange={e => set("material", e.target.value)}><option value="">All materials</option>{MATERIALS.map(m => <option key={m}>{m}</option>)}</select>
      <input className="input" placeholder="City" aria-label="City" value={f.city} onChange={e => set("city", e.target.value)} />
      <input className="input" type="number" min={0} placeholder="Min kg" aria-label="Min kg" value={f.min_qty} onChange={e => set("min_qty", e.target.value)} />
      <input className="input" type="number" min={0} placeholder="Max kg" aria-label="Max kg" value={f.max_qty} onChange={e => set("max_qty", e.target.value)} />
      <select className="input lg:col-span-2" aria-label="Sort" value={f.sort} onChange={e => set("sort", e.target.value)}><option value="newest">Newest</option><option value="quantity_desc">Quantity: high to low</option><option value="quantity_asc">Quantity: low to high</option><option value="price_asc">Price: low to high</option></select></div>
    {loading && !data ? <Spinner /> : error ? <ErrorBox msg={error} retry={reload} /> : !data?.items.length ? <div className="card"><Empty title="No listings match" hint="Try clearing filters." /></div> :
      <><motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"><AnimatePresence initial={false}>{data.items.map(l => <motion.button key={l.id} layout
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.16 }}
        onClick={() => setOpen(l)} className="ticket p-4 pl-5 text-left hover:border-ink/30 transition-colors" style={{ "--mat-color": matColor(l.material) } as React.CSSProperties}>
        <div className="flex justify-between items-start"><div className="font-semibold">{l.material}</div><DemoTag demo={l.is_demo} /></div>
        <div className="text-2xl font-semibold mt-1">{kg(l.quantity_kg)}</div><div className="text-sm text-muted mt-1">{l.supplier_name} - {l.city}</div>
        <div className="flex justify-between mt-3 text-xs text-muted"><span>{l.price_per_kg != null ? `₹${l.price_per_kg}/kg` : "Price on request"}</span><span>{date(l.created_at)}</span></div><div className="mt-2"><Badge s={l.status} /></div></motion.button>)}</AnimatePresence></motion.div>
        <div className="flex items-center justify-between mt-4 text-sm"><span className="text-muted">{data.total} listings</span><div className="flex gap-2 items-center"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>Page {page} of {pages}<button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div></>}
    {open && <Detail l={open} onClose={() => setOpen(null)} onChange={reload} />}</div>;
}
