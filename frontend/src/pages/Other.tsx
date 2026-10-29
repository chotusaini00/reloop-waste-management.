import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, kg, MATERIALS, ApiError } from "../api";
import { ErrorBox, PageHeader, Spinner, useApp, useFetch } from "../ui";

type I = { total_listed_kg: number; available_kg: number; reserved_kg: number; completed_collection_kg: number; completed_by_material: { material: string; kg: number }[]; note: string };

export function Impact() {
  const { data, error, loading, reload } = useFetch(() => api<I>("/impact"), []);
  if (loading && !data) return <Spinner />; if (error) return <ErrorBox msg={error} retry={reload} />; if (!data) return null;
  const c = [["Total listed", data.total_listed_kg], ["Currently available", data.available_kg], ["Reserved", data.reserved_kg], ["Completed collection", data.completed_collection_kg]] as const;
  return <div><PageHeader title="Environmental Impact" sub="Recorded weights only, no estimated savings." />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{c.map(([l, v]) => <div key={l} className="card p-5"><div className="text-xs text-muted">{l}</div><div className="text-2xl font-semibold mt-1">{kg(v)}</div></div>)}</div>
    <div className="card p-5 mt-4"><h2 className="font-semibold mb-3">Completed collections by material</h2>{data.completed_by_material.length === 0 ? <p className="text-sm text-muted">No collections completed yet. Complete one to see it here.</p> :
      <ResponsiveContainer width="100%" height={240}><BarChart data={data.completed_by_material}><CartesianGrid stroke="#E3EAE5" vertical={false} /><XAxis dataKey="material" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => kg(v)} /><Bar dataKey="kg" fill="#176B4D" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</div>
    <div className="card p-5 mt-4 bg-mint border-0 text-sm text-dark"><h2 className="font-semibold mb-1">How to read this</h2><p>{data.note}</p><p className="mt-2">Completed collection weight is summed from completed collection records only, not from all listings or pending requests.</p></div></div>;
}

type A = { material: string; tips: string[]; avoid: string; disclaimer: string };
export function Assistant() {
  const [m, setM] = useState("Plastic");
  const { data, error, loading, reload } = useFetch(() => api<A>(`/assistant/${encodeURIComponent(m)}`), [m]);
  return <div><PageHeader title="Recycling Assistant" sub="Predefined local guidance. No external AI service is used." />
    <div className="flex flex-wrap gap-2 mb-4">{MATERIALS.map(x => <button key={x} onClick={() => setM(x)} className={`rounded-full border px-3 py-1.5 text-sm ${m === x ? "bg-brand text-white border-brand" : "bg-white border-line"}`}>{x}</button>)}</div>
    {loading ? <Spinner /> : error ? <ErrorBox msg="Assistant unavailable. The rest of ReLoop still works." retry={reload} /> : data && <div className="card p-5"><h2 className="font-semibold mb-2">{data.material}</h2><ul className="list-disc pl-5 text-sm space-y-1.5">{data.tips.map(t => <li key={t}>{t}</li>)}</ul><p className="text-sm mt-3"><b>Watch out:</b> {data.avoid}</p><p className="help mt-4">{data.disclaimer}</p></div>}</div>;
}

export function SettingsPage() {
  const { toast } = useApp(); const [busy, setBusy] = useState(false);
  const reset = async () => {
    if (!confirm("Reset demo data? Only demo records are deleted and re-created; your own records are kept.")) return;
    setBusy(true);
    try { const r = await api<{ message: string }>("/demo/reset", { method: "POST" }); localStorage.removeItem("reloop-id"); toast(r.message); setTimeout(() => location.reload(), 600); }
    catch (e) { toast((e as ApiError).message, "err"); } finally { setBusy(false); }
  };
  return <div><PageHeader title="Settings" />
    <div className="card p-5 max-w-xl"><h2 className="font-semibold">Demo data</h2><p className="text-sm text-muted mt-1">Reset restores the seeded demo suppliers, recyclers and listings. Records you created are not deleted.</p><button className="btn-danger mt-4" disabled={busy} onClick={reset}>{busy ? "Resetting..." : "Reset demo data"}</button></div>
    <div className="card p-5 max-w-xl mt-4 text-sm text-muted"><h2 className="font-semibold text-ink">Security note</h2><p className="mt-1">The demo identity selector is not authentication. A production version needs real login, authorization, rate limiting, secure hosting, backups, monitoring and a security review.</p></div></div>;
}
