import { useState } from "react";
import { api, kg, date, Listing, Req, MATERIALS, ApiError } from "../api";
import { Badge, DemoTag, Empty, ErrorBox, Field, PageHeader, Spinner, useApp, useFetch } from "../ui";
import { RequestTable } from "./Requests";

export default function Supplier() {
  const { identity, setIdentity, toast } = useApp();
  const sup = useFetch(() => api<{ id: number; name: string }[]>("/suppliers"), []);
  const [form, setForm] = useState({ supplier_name: "", material: "Plastic", quantity_kg: "", city: "", price_per_kg: "", description: "" });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  const me = sup.data?.find(s => s.id === identity.id && identity.role === "supplier");
  const listings = useFetch(() => me ? api<{ items: Listing[] }>(`/listings?supplier_id=${me.id}&page_size=100`) : Promise.resolve({ items: [] as Listing[] }), [me?.id]);
  const reqs = useFetch(() => me ? api<Req[]>(`/requests?supplier_id=${me.id}`) : Promise.resolve([] as Req[]), [me?.id]);
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErrs({});
    const body = { ...form, supplier_name: form.supplier_name || me?.name || "", quantity_kg: form.quantity_kg === "" ? null : Number(form.quantity_kg), price_per_kg: form.price_per_kg === "" ? null : Number(form.price_per_kg) };
    try {
      const l = await api<Listing>("/listings", { method: "POST", body });
      toast("Listing created"); setForm({ ...form, quantity_kg: "", price_per_kg: "", description: "" });
      sup.reload(); setIdentity({ role: "supplier", id: l.supplier_id }); listings.reload();
    } catch (er) { const x = er as ApiError; setErrs(x.fields); if (!Object.keys(x.fields).length) toast(x.message, "err"); } finally { setBusy(false); }
  };
  const reloadAll = () => { listings.reload(); reqs.reload(); };
  return <div><PageHeader title="Supplier Portal" sub="Create listings and manage collection requests." />
    <div className="rounded-lg bg-warn/10 text-[#8a5f0f] text-xs p-3 mb-4">Demo identity: pick a supplier in the top bar, or type a new supplier name below. This is not authentication.</div>
    <div className="grid lg:grid-cols-3 gap-4"><form onSubmit={submit} className="card p-5 space-y-3 lg:col-span-1 h-fit" noValidate>
      <h2 className="font-semibold">New waste listing</h2>
      <Field label="Supplier name" error={errs.supplier_name} help={me ? `Defaults to ${me.name}` : undefined}><input className="input" maxLength={80} placeholder={me?.name ?? "e.g. GreenMart Retail"} value={form.supplier_name} onChange={e => set("supplier_name", e.target.value)} /></Field>
      <Field label="Material" error={errs.material}><select className="input" value={form.material} onChange={e => set("material", e.target.value)}>{MATERIALS.map(m => <option key={m}>{m}</option>)}</select></Field>
      <Field label="Quantity (kg)" error={errs.quantity_kg}><input className="input" type="number" step="any" value={form.quantity_kg} onChange={e => set("quantity_kg", e.target.value)} /></Field>
      <Field label="City" error={errs.city}><input className="input" maxLength={60} value={form.city} onChange={e => set("city", e.target.value)} /></Field>
      <Field label="Price per kg (optional)" error={errs.price_per_kg}><input className="input" type="number" step="any" value={form.price_per_kg} onChange={e => set("price_per_kg", e.target.value)} /></Field>
      <Field label="Description" error={errs.description} help={`${form.description.length}/500`}><textarea className="input" rows={3} maxLength={500} value={form.description} onChange={e => set("description", e.target.value)} /></Field>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving..." : "Create listing"}</button></form>
      <div className="lg:col-span-2 space-y-4">
        <div className="card"><div className="p-4 font-semibold">My listings {me && <span className="text-muted font-normal">- {me.name}</span>}</div>
          {!me ? <Empty title="Select a supplier identity" hint="Use the top bar, or create a listing to become a new supplier." /> : listings.loading ? <Spinner /> : listings.error ? <ErrorBox msg={listings.error} /> : !listings.data?.items.length ? <Empty title="No listings yet" /> :
            <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Material", "Quantity", "City", "Listed", "Status", "Requests"].map(h => <th key={h} className="th">{h}</th>)}</tr></thead><tbody>{listings.data.items.map(l => <tr key={l.id}><td className="td">{l.material}</td><td className="td">{kg(l.quantity_kg)}</td><td className="td">{l.city}</td><td className="td text-muted">{date(l.created_at)}</td><td className="td"><Badge s={l.status} /> <DemoTag demo={l.is_demo} /></td><td className="td">{l.request_count}</td></tr>)}</tbody></table></div>}</div>
        <div className="card"><div className="p-4 font-semibold">Requests for my listings</div>{!me ? <Empty title="No supplier selected" /> : reqs.loading ? <Spinner /> : <RequestTable rows={reqs.data ?? []} reload={reloadAll} />}</div></div></div></div>;
}
