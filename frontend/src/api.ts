export type Listing = { id: number; supplier_id: number; supplier_name: string; material: string; quantity_kg: number; city: string; price_per_kg: number | null; description: string; status: string; is_demo: boolean; created_at: string; completed_at: string | null; request_count?: number };
export type Recycler = { id: number; name: string; city: string; materials: string[]; min_quantity_kg: number; max_quantity_kg: number; radius_km: number | null; is_demo: boolean };
export type Req = { id: number; listing_id: number; recycler_id: number; recycler_name: string; supplier_id: number; supplier_name: string; material: string; quantity_kg: number; city: string; listing_status: string; status: string; is_demo: boolean; created_at: string; completed_at: string | null };
export type Match = { recycler_id: number; business_name: string; city: string; eligible: boolean; match_score: number; score_components: Record<string, number>; eligibility_reasons: string[]; ineligibility_reasons: string[] };
export const MATERIALS = ["Plastic", "Paper", "Metal", "Glass", "Electronic waste", "Organic waste"];

export class ApiError extends Error { fields: Record<string, string> = {}; }

export async function api<T>(path: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api" + path, { method: opts?.method ?? "GET", headers: { "Content-Type": "application/json" }, body: opts?.body ? JSON.stringify(opts.body) : undefined });
  } catch { throw new ApiError("Cannot reach the backend. Is it running on port 8000?"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new ApiError(typeof data.detail === "string" ? data.detail : "Request failed");
    (data.errors ?? []).forEach((x: { field: string; message: string }) => (e.fields[x.field] = x.message));
    throw e;
  }
  return data as T;
}
export const qs = (o: Record<string, string | number | undefined>) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => v !== undefined && v !== "" && p.set(k, String(v))); const s = p.toString(); return s ? "?" + s : ""; };
export const kg = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 1 }) + " kg";
export const date = (s: string) => new Date(s + "Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
