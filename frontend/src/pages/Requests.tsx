import { useState } from "react";
import { api, kg, date, Req, ApiError } from "../api";
import { Badge, DemoTag, Empty, ErrorBox, PageHeader, Spinner, useApp, useFetch } from "../ui";

export function RequestTable({ rows, reload }: { rows: Req[]; reload: () => void }) {
  const { identity, toast } = useApp(); const [busy, setBusy] = useState<number | null>(null);
  const act = async (r: Req, status: string) => {
    if (!identity.id) return toast("Select a demo identity in the top bar first.", "err");
    setBusy(r.id);
    try { await api(`/requests/${r.id}/status`, { method: "PATCH", body: { status, actor_role: identity.role, actor_id: identity.id } }); toast(`Request ${status}`); reload(); }
    catch (e) { toast((e as ApiError).message, "err"); } finally { setBusy(null); }
  };
  if (!rows.length) return <Empty title="No collection requests" hint="Recyclers can request collection from the Marketplace or Recycler Portal." />;
  const mineSup = (r: Req) => identity.role === "supplier" && identity.id === r.supplier_id;
  const mineRec = (r: Req) => identity.role === "recycler" && identity.id === r.recycler_id;
  return <div className="overflow-x-auto"><table className="w-full"><thead><tr>{["Material", "Supplier", "Recycler", "Quantity", "Status", "Created", ""].map(h => <th key={h} className="th">{h}</th>)}</tr></thead><tbody>
    {rows.map(r => <tr key={r.id}><td className="td">{r.material} <span className="text-xs text-muted">#{r.listing_id}</span></td><td className="td">{r.supplier_name}</td><td className="td">{r.recycler_name}</td><td className="td">{kg(r.quantity_kg)}</td>
      <td className="td"><Badge s={r.status} /> <DemoTag demo={r.is_demo} /></td><td className="td text-muted">{date(r.created_at)}</td>
      <td className="td whitespace-nowrap space-x-2">
        {r.status === "pending" && mineSup(r) && <><button disabled={busy === r.id} className="btn-primary !py-1" onClick={() => act(r, "accepted")}>Accept</button><button disabled={busy === r.id} className="btn-danger !py-1" onClick={() => act(r, "rejected")}>Reject</button></>}
        {r.status === "accepted" && (mineSup(r) || mineRec(r)) && <button disabled={busy === r.id} className="btn-primary !py-1" onClick={() => act(r, "completed")}>Mark completed</button>}
      </td></tr>)}</tbody></table></div>;
}

export default function Requests() {
  const [status, setStatus] = useState("");
  const { data, error, loading, reload } = useFetch(() => api<Req[]>("/requests" + (status ? `?status=${status}` : "")), [status]);
  return <div><PageHeader title="Collection Requests" sub="Pending → Accepted → Completed. Rejected and Completed are final.">
    <select className="input !w-auto" value={status} onChange={e => setStatus(e.target.value)} aria-label="Status filter"><option value="">All statuses</option>{["pending", "accepted", "rejected", "completed"].map(s => <option key={s}>{s}</option>)}</select></PageHeader>
    <div className="card">{loading && !data ? <Spinner /> : error ? <div className="p-4"><ErrorBox msg={error} retry={reload} /></div> : <RequestTable rows={data ?? []} reload={reload} />}</div>
    <p className="help mt-3">Actions appear based on your demo identity (top bar). Identity selection is not a security boundary, but the backend still enforces ownership.</p></div>;
}
