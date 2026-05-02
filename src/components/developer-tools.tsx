"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase, getJsonHeaders, readJsonResponse } from "@/components/api";
import { PageHeader } from "@/components/page-shell";
import { useAuth } from "@/components/providers";
import { RefreshCw, Save } from "lucide-react";

type OwnerOption = {
  id: number;
  name: string;
};

type KandangAccessRecord = {
  id_kandang: number;
  nama_kandang: string;
  primary_owner_id: number;
  primary_owner_name?: string | null;
  shared_owner_ids: number[];
  shared_owner_names: string[];
};

type ActivityLog = {
  id: number;
  user_name?: string | null;
  user_role?: string | null;
  action: string;
  module?: string | null;
  subject_type?: string | null;
  subject_id?: string | null;
  before_data?: unknown;
  after_data?: unknown;
  ip_address?: string | null;
  created_at?: string | null;
};

type MaintenanceState = {
  enabled: boolean;
  message: string;
};

function developerApi(path: string, options: RequestInit = {}) {
  return fetch(`${getApiBase()}${path}`, {
    credentials: "include",
    ...options,
    headers: getJsonHeaders({
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    }),
  });
}

export function KandangAccessPage() {
  const { user, ready } = useAuth();
  const [kandang, setKandang] = useState<KandangAccessRecord[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [selected, setSelected] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isDeveloper = user?.role === "developer";

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await developerApi("/developer/kandang-access");
      const data = await readJsonResponse<{ status?: boolean; data?: { kandang?: KandangAccessRecord[]; owners?: OwnerOption[] } }>(response);
      if (!response.ok || !data.status) throw new Error("Gagal memuat akses kandang");

      const rows = data.data?.kandang ?? [];
      setKandang(rows);
      setOwners(data.data?.owners ?? []);
      setSelected(Object.fromEntries(rows.map((row) => [row.id_kandang, row.shared_owner_ids.map(String)])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat akses kandang");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !isDeveloper) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, isDeveloper, load]);

  const save = async (record: KandangAccessRecord) => {
    setLoading(true);
    setMessage("");
    try {
      const ownerIds = (selected[record.id_kandang] ?? []).map((id) => Number(id));
      const response = await developerApi(`/developer/kandang-access/${record.id_kandang}`, {
        method: "PUT",
        body: JSON.stringify({ owner_ids: ownerIds }),
      });
      const data = await readJsonResponse<{ status?: boolean; message?: string }>(response);
      if (!response.ok || !data.status) throw new Error(data.message || "Gagal menyimpan akses");
      setMessage(data.message || "Akses kandang berhasil disimpan");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan akses");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return <PanelText text="Memuat sesi..." />;
  if (!isDeveloper) return <PanelText text="Akses khusus developer." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Akses Kandang" description="Developer mengatur owner tambahan untuk kandang bersama." />

      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-[#0f7963]">{message}</p> : null}

      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <div className="flex justify-end">
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          {kandang.map((record) => (
            <div key={record.id_kandang} className="rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{record.nama_kandang}</p>
                  <p className="mt-1 text-sm text-slate-500">Owner utama: {record.primary_owner_name ?? "-"}</p>
                </div>
                <button disabled={loading} type="button" onClick={() => void save(record)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f7963] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d6f5d] disabled:opacity-70">
                  <Save className="h-4 w-4" />
                  Simpan
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {owners.map((owner) => {
                  const disabled = owner.id === record.primary_owner_id;
                  const values = selected[record.id_kandang] ?? [];
                  const checked = disabled || values.includes(String(owner.id));

                  return (
                    <label key={`${record.id_kandang}-${owner.id}`} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-emerald-950/5">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={checked}
                        onChange={(event) => setSelected((current) => ({
                          ...current,
                          [record.id_kandang]: event.target.checked
                            ? [...(current[record.id_kandang] ?? []), String(owner.id)]
                            : (current[record.id_kandang] ?? []).filter((id) => id !== String(owner.id)),
                        }))}
                        className="h-4 w-4 rounded border-slate-300 text-[#0f7963]"
                      />
                      <span>{owner.name}{disabled ? " (utama)" : ""}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          {!kandang.length ? <p className="rounded-2xl border border-dashed border-emerald-950/10 bg-white px-4 py-8 text-sm text-slate-500">Belum ada kandang.</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ActivityLogsPage() {
  const { user, ready } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceState>({ enabled: false, message: "" });
  const [loading, setLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [search, setSearch] = useState("");
  const isDeveloper = user?.role === "developer";

  const loadMaintenance = useCallback(async () => {
    try {
      const response = await developerApi("/maintenance");
      const data = await readJsonResponse<{ status?: boolean; data?: MaintenanceState }>(response);
      if (!response.ok || !data.status) throw new Error("Gagal memuat maintenance");
      setMaintenance(data.data ?? { enabled: false, message: "" });
    } catch {
      setMaintenance({ enabled: false, message: "" });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const suffix = search.trim() ? `?user=${encodeURIComponent(search.trim())}` : "";
      const response = await developerApi(`/developer/activity-logs${suffix}`);
      const data = await readJsonResponse<{ status?: boolean; data?: ActivityLog[] }>(response);
      if (!response.ok || !data.status) throw new Error("Gagal memuat log");
      setLogs(data.data ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!ready || !isDeveloper) return;
    const timer = window.setTimeout(() => {
      void load();
      void loadMaintenance();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, isDeveloper, load, loadMaintenance]);

  const saveMaintenance = async (enabled: boolean) => {
    setMaintenanceLoading(true);
    setMaintenanceMessage("");
    try {
      const response = await developerApi("/developer/maintenance", {
        method: "PUT",
        body: JSON.stringify({
          enabled,
          message: maintenance.message,
        }),
      });
      const data = await readJsonResponse<{ status?: boolean; message?: string; data?: MaintenanceState }>(response);
      if (!response.ok || !data.status) throw new Error(data.message || "Gagal menyimpan maintenance");
      setMaintenance(data.data ?? { enabled, message: maintenance.message });
      setMaintenanceMessage(data.message || "Status maintenance berhasil disimpan");
      await load();
    } catch (error) {
      setMaintenanceMessage(error instanceof Error ? error.message : "Gagal menyimpan maintenance");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const actionStats = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((log) => counts.set(log.action, (counts.get(log.action) ?? 0) + 1));
    return Array.from(counts.entries()).slice(0, 5);
  }, [logs]);

  if (!ready) return <PanelText text="Memuat sesi..." />;
  if (!isDeveloper) return <PanelText text="Akses khusus developer." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Log Aktivitas" description="Riwayat login, logout, tambah, edit, hapus, dan perubahan akses." />

      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">Maintenance</h2>
            <p className="mt-1 text-sm text-slate-500">Aktifkan banner pengumuman tanpa restart aplikasi.</p>
            <textarea
              value={maintenance.message}
              onChange={(event) => setMaintenance((current) => ({ ...current, message: event.target.value }))}
              className="mt-4 min-h-24 w-full rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0f7963]"
              placeholder="Contoh: Info: Mawi Farm akan maintenance malam ini pukul 22.00-23.00 WITA."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={maintenanceLoading || !maintenance.message.trim()}
              onClick={() => void saveMaintenance(true)}
              className="rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d] disabled:opacity-60"
            >
              Aktifkan
            </button>
            <button
              type="button"
              disabled={maintenanceLoading}
              onClick={() => void saveMaintenance(false)}
              className="rounded-2xl border border-emerald-950/10 bg-white px-5 py-3 text-sm font-semibold text-[#0f7963] transition hover:bg-emerald-50 disabled:opacity-60"
            >
              Matikan
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={maintenance.enabled ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"}>
            {maintenance.enabled ? "Maintenance aktif" : "Maintenance nonaktif"}
          </span>
          {maintenanceMessage ? <span className="text-sm font-semibold text-[#0f7963]">{maintenanceMessage}</span> : null}
        </div>
      </div>

      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {actionStats.map(([action, count]) => (
              <span key={action} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0f7963]">{action}: {count}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="field-input max-w-[220px]" placeholder="Cari user/role" />
            <button disabled={loading} type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl bg-[#0f7963] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d6f5d] disabled:opacity-70">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-950/5">
          <div className="hidden grid-cols-[0.9fr_0.75fr_0.8fr_0.85fr_0.7fr_1fr] bg-[#f3fbf5] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid">
            {["Waktu", "User", "Aksi", "Modul", "Subjek", "IP"].map((column) => <span key={column}>{column}</span>)}
          </div>
          {logs.map((log) => (
            <div key={log.id} className="grid gap-2 border-t border-emerald-950/5 px-4 py-4 text-sm text-slate-700 md:grid-cols-[0.9fr_0.75fr_0.8fr_0.85fr_0.7fr_1fr]">
              <span>{log.created_at ?? "-"}</span>
              <span className="font-semibold text-slate-900">{log.user_name ?? "-"} <span className="font-normal text-slate-400">({log.user_role ?? "-"})</span></span>
              <span>{log.action}</span>
              <span>{log.module ?? "-"}</span>
              <span>{log.subject_type ?? "-"} {log.subject_id ?? ""}</span>
              <span className="truncate">{log.ip_address ?? "-"}</span>
            </div>
          ))}
          {!logs.length ? <div className="px-4 py-8 text-sm text-slate-500">{loading ? "Memuat log..." : "Belum ada log."}</div> : null}
        </div>
      </div>
    </div>
  );
}

function PanelText({ text }: { text: string }) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <p className="text-sm font-semibold text-slate-900">{text}</p>
    </div>
  );
}
