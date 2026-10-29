import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, kg, date, Listing, Req } from "../api";
import { Badge, DemoTag, Empty, ErrorBox, PageHeader, Spinner, useFetch } from "../ui";

type D = { metrics: Record<string, number>; demo_vs_session: Record<string, number>; material_distribution: { material: string; kg: number }[]; activity: { date: string; requests: number; completed: number }[]; recent_listings: Listing[]; recent_requests: Req[]; impact: { total_listed_kg: number; available_kg: number; reserved_kg: number; completed_collection_kg: number } };
const COLORS = ["#176B4D", "#2E9E73", "#6CCBA0", "#D99A25", "#104B38", "#9AD9BB"];

export default function Dashboard() {
  const { data, error, loading, reload } = useFetch(() => api<D>("/dashboard"), []);
  if (loading && !data) return <Spinner />; if (error) return <ErrorBox msg={error} retry={reload} />; if (!data) return null;
  const m = data.metrics;
  const cards = [["Total listed waste", kg(m.total_listed_kg)], ["Available listings", m.available_listings], ["Registered recyclers", m.registered_recyclers], ["Pending requests", m.pending_requests], ["Accepted requests", m.accepted_requests], ["Completed collections", m.completed_collections]];
  return <div>
    <PageHeader title="Overview" sub="Live figures from the database."><button className="btn-ghost" onClick={reload}>Refresh</button></PageHeader>
    <div className="text-xs text-muted mb-4">{data.demo_vs_session.demo_listings} demo listings - {data.demo_vs_session.session_listings} created this session (reset in Settings keeps session records).</div>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{cards.map(([l, v]) => <div key={l as string} className="card p-5"><div className="text-xs text-muted">{l}</div><div className="text-2xl font-semibold mt-1">{v}</div></div>)}</div>
    <div className="grid lg:grid-cols-2 gap-4 mt-6">
      <div className="card p-5"><h2 className="font-semibold mb-3">Material distribution (kg listed)</h2>{data.material_distribution.length === 0 ? <Empty title="No listings yet" /> :
        <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={data.material_distribution} dataKey="kg" nameKey="material" innerRadius={55} outerRadius={90}>{data.material_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => kg(v)} /><Legend /></PieChart></ResponsiveContainer>}</div>
      <div className="card p-5"><h2 className="font-semibold mb-3">Collection activity (14 days)</h2>
        <ResponsiveContainer width="100%" height={240}><LineChart data={data.activity.map(a => ({ ...a, d: a.date.slice(5) }))}><CartesianGrid stroke="#E3EAE5" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line dataKey="requests" name="Requests" stroke="#176B4D" strokeWidth={2} dot={false} /><Line dataKey="completed" name="Completed" stroke="#D99A25" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div>
    <div className="grid lg:grid-cols-2 gap-4 mt-4">
      <div className="card"><div className="p-4 font-semibold">Recent listings</div>{data.recent_listings.length === 0 ? <Empty title="No listings" hint="Create one in the Supplier Portal." /> : data.recent_listings.map(l => <div key={l.id} className="px-4 py-3 border-t border-line flex justify-between gap-2 text-sm"><div><div className="font-medium">{l.material} - {kg(l.quantity_kg)}</div><div className="text-xs text-muted">{l.supplier_name}, {l.city} - {date(l.created_at)}</div></div><div className="flex gap-1 items-start"><DemoTag demo={l.is_demo} /><Badge s={l.status} /></div></div>)}</div>
      <div className="card"><div className="p-4 font-semibold">Recent requests</div>{data.recent_requests.length === 0 ? <Empty title="No requests yet" /> : data.recent_requests.map(r => <div key={r.id} className="px-4 py-3 border-t border-line flex justify-between gap-2 text-sm"><div><div className="font-medium">{r.recycler_name}</div><div className="text-xs text-muted">{r.material}, {kg(r.quantity_kg)} - {r.city}</div></div><div className="flex gap-1 items-start"><DemoTag demo={r.is_demo} /><Badge s={r.status} /></div></div>)}</div></div>
    <div className="card p-5 mt-4 bg-mint border-0"><h2 className="font-semibold text-dark">Environmental summary</h2><p className="text-sm text-dark/80 mt-1">{kg(data.impact.completed_collection_kg)} collected in completed records. <Link className="underline" to="/app/impact">Details and methodology</Link></p></div>
  </div>;
}
