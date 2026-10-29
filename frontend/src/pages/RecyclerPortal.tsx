import { useState } from "react";
import { api, kg, Listing, Match, Recycler, Req, MATERIALS, ApiError } from "../api";
import { Empty, ErrorBox, Field, PageHeader, Spinner, useApp, useFetch, Badge } from "../ui";
import { RequestTable } from "./Requests";

export default function RecyclerPortal() {
  const { identity, setIdentity, toast } = useApp();
  const recs = useFetch(() => api<Recycler[]>("/recyclers"), []);
  const me = recs.data?.find(r => r.id === identity.id && identity.role === "recycler");
  const matches = useFetch(() => me ? api<{ listing: Listing; match: Match }[]>(`/recyclers/${me.id}/matches`) : Promise.resolve([]), [me?.id]);
  const reqs = useFetch(() => me ? api<Req[]>(`/requests?recycler_id=${me.id}`) : Promise.resolve([] as Req[]), [me?.id]);
  const [f, setF] = useState({ name: "", city: "", materials: [] as string[], min: "", max: "", radius: "" });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErrs({});
    try {
      const r = await api<Recycler>("/recyclers", { method: "POST", body: { name: f.name, city: f.city, materials: f.materials, min_quantity_kg: f.min === "" ? null : Number(f.min), max_quantity_kg: f.max === "" ? null : Number(f.max), radius_km: f.radius === "" ? null : Number(f.radius) } });
      toast("Recycler registered"); setF({ name: "", city: "", materials: [], min: "", max: "", radius: "" }); recs.reload(); setIdentity({ role: "recycler", id: r.id });
    } catch (er) { const x = er as ApiError; setErrs(x.fields); if (!Object.keys(x.fields).length) toast(x.message, "err"); } finally { setBusy(false); }
  };
  const request = async (listing_id: number) => {
    try { await api("/requests", { method: "POST", body: { listing_id, recycler_id: me!.id } }); toast("Collection request submitted"); matches.reload(); reqs.reload(); }
    catch (e) { toast((e as ApiError).message, "err"); }
  };
  const active = new Set((reqs.data ?? []).filter(r => ["pending", "accepted"].includes(r.status)).map(r => r.listing_id));
  const toggle = (m: string) => setF({ ...f, materials: f.materials.includes(m) ? f.materials.filter(x => x !== m) : [...f.materials, m] });
  return <div><PageHeader title="Recycler Portal" sub="Register your business, see listings you can process, and request collection." />
    <div className="grid lg:grid-cols-3 gap-4"><form onSubmit={submit} className="card p-5 space-y-3 h-fit" noValidate><h2 className="font-semibold">Register recycler</h2>
      <Field label="Business name" error={errs.name}><input className="input" maxLength={80} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="City" error={errs.city}><input className="input" maxLength={60} value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></Field>
      <Field label="Accepted materials" error={errs.materials}><div className="flex flex-wrap gap-2">{MATERIALS.map(m => <button type="button" key={m} onClick={() => toggle(m)} className={`rounded-full border px-3 py-1 text-xs ${f.materials.includes(m) ? "bg-brand text-white border-brand" : "bg-white text-ink border-line"}`}>{m}</button>)}</div></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Min qty (kg)" error={errs.min_quantity_kg}><input className="input" type="number" step="any" value={f.min} onChange={e => setF({ ...f, min: e.target.value })} /></Field><Field label="Max qty (kg)" error={errs.max_quantity_kg || errs.body}><input className="input" type="number" step="any" value={f.max} onChange={e => setF({ ...f, max: e.target.value })} /></Field></div>
      <Field label="Collection radius km (optional)" error={errs.radius_km} help="Stored for future use. Matching is city-only in this MVP."><input className="input" type="number" step="any" value={f.radius} onChange={e => setF({ ...f, radius: e.target.value })} /></Field>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving..." : "Register"}</button></form>
      <div className="lg:col-span-2 space-y-4">
        {!me ? <div className="card"><Empty title="Select a recycler identity" hint="Use the top bar, or register a new recycler." /></div> : <>
          <div className="card p-5"><h2 className="font-semibold">{me.name}</h2><div className="text-sm text-muted mt-1">{me.city} - accepts {me.materials.join(", ")} - {kg(me.min_quantity_kg)} to {kg(me.max_quantity_kg)}{me.radius_km ? ` - radius ${me.radius_km} km (not enforced)` : ""}</div></div>
          <div className="card"><div className="p-4 font-semibold">Eligible available listings</div>{matches.loading ? <Spinner /> : matches.error ? <ErrorBox msg={matches.error} /> : !matches.data?.length ? <Empty title="No eligible listings right now" /> : matches.data.map(({ listing: l, match: m }) => <div key={l.id} className="px-4 py-3 border-t border-line flex flex-wrap justify-between gap-2 items-center text-sm">
            <div><div className="font-medium">{l.material} - {kg(l.quantity_kg)} <span className="text-muted font-normal">({l.supplier_name}, {l.city})</span></div><div className="text-xs text-muted">Score {m.match_score}/100: {m.eligibility_reasons.join("; ")}</div></div>
            {active.has(l.id) ? <Badge s="pending" label="Request active" /> : <button className="btn-primary" onClick={() => request(l.id)}>Request collection</button>}</div>)}</div>
          <div className="card"><div className="p-4 font-semibold">My requests</div>{reqs.loading ? <Spinner /> : <RequestTable rows={reqs.data ?? []} reload={() => { reqs.reload(); matches.reload(); }} />}</div></>}</div></div></div>;
}
