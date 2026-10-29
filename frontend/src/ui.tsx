import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Loader2, AlertCircle, Inbox, X } from "lucide-react";
import { ApiError } from "./api";

export type Identity = { role: "supplier" | "recycler"; id: number | null };
const Ctx = createContext<{ identity: Identity; setIdentity: (i: Identity) => void; toast: (m: string, kind?: "ok" | "err") => void }>(null as never);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [identity, setId] = useState<Identity>(() => { try { return JSON.parse(localStorage.getItem("reloop-id") ?? "") } catch { return { role: "supplier", id: null } } });
  const [t, setT] = useState<{ m: string; kind: string } | null>(null);
  const setIdentity = (i: Identity) => { setId(i); try { localStorage.setItem("reloop-id", JSON.stringify(i)); } catch { /* ignore */ } };
  const toast = (m: string, kind: "ok" | "err" = "ok") => { setT({ m, kind }); setTimeout(() => setT(null), 3500); };
  return <Ctx.Provider value={{ identity, setIdentity, toast }}>{children}
    {t && <div role="status" className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${t.kind === "ok" ? "bg-ok" : "bg-err"}`}>{t.m}</div>}</Ctx.Provider>;
}

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [tick, setTick] = useState(0);
  useEffect(() => { let live = true; setLoading(true); fn().then(d => { if (live) { setData(d); setError(""); } }).catch((e: ApiError) => live && setError(e.message)).finally(() => live && setLoading(false)); return () => { live = false; }; /* eslint-disable-next-line */ }, [...deps, tick]);
  return { data, error, loading, reload: () => setTick(x => x + 1) };
}

export const Spinner = () => <div className="flex items-center gap-2 text-muted text-sm py-10 justify-center"><Loader2 className="animate-spin" size={16} /> Loading...</div>;
export const ErrorBox = ({ msg, retry }: { msg: string; retry?: () => void }) => <div className="card p-4 flex items-center gap-3 text-sm text-err border-err/30"><AlertCircle size={18} />{msg}{retry && <button className="btn-ghost ml-auto" onClick={retry}>Retry</button>}</div>;
export const Empty = ({ title, hint }: { title: string; hint?: string }) => <div className="text-center py-10 text-muted"><Inbox className="mx-auto mb-2" size={26} /><div className="text-sm font-medium text-ink">{title}</div>{hint && <div className="text-xs mt-1">{hint}</div>}</div>;
export const PageHeader = ({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) => <div className="flex flex-wrap items-end justify-between gap-3 mb-6"><div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{sub && <p className="text-sm text-muted mt-1">{sub}</p>}</div><div className="flex gap-2">{children}</div></div>;
export const Field = ({ label, error, help, children }: { label: string; error?: string; help?: string; children: ReactNode }) => <div><label className="label">{label}</label>{children}{error ? <p className="err">{error}</p> : help && <p className="help">{help}</p>}</div>;

const tone: Record<string, string> = { available: "bg-mint text-dark", pending: "bg-warn/15 text-[#8a5f0f]", reserved: "bg-warn/15 text-[#8a5f0f]", accepted: "bg-brand/10 text-brand", completed: "bg-ok/15 text-ok", rejected: "bg-err/10 text-err", demo: "bg-slate-100 text-muted" };
export const Badge = ({ s, label }: { s: string; label?: string }) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone[s] ?? tone.demo}`}>{label ?? s}</span>;
export const DemoTag = ({ demo }: { demo: boolean }) => <Badge s="demo" label={demo ? "Demo" : "Session"} />;
export const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => <div className="fixed inset-0 z-40 bg-ink/40 flex items-start justify-center p-4 overflow-auto" onClick={onClose}><div className="card w-full max-w-2xl mt-10 p-5" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h2 className="font-semibold text-lg">{title}</h2><button aria-label="Close" onClick={onClose}><X size={18} /></button></div>{children}</div></div>;
