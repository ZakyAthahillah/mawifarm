"use client";

import type { ComponentType, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getApiBase, getOwnerScopeHeaders, ownerScopeStorageKey, readApiError, readJsonResponse } from "@/components/api";
import { PageHeader, StatCard } from "@/components/page-shell";
import { useAuth } from "@/components/providers";
import { QrScannerPanel } from "@/components/qr-scanner";
import { saleTargets } from "@/lib/sale-targets";
import {
  Calculator,
  Activity,
  CalendarDays,
  CircleDollarSign,
  Egg,
  Package2,
  Scale,
  Search,
  Warehouse,
} from "lucide-react";

type KandangOption = {
  id_kandang: string | number;
  nama_kandang: string;
};

type PeriodeOption = {
  id_periode: string | number;
  id_kandang: string | number;
  nama_periode: string;
  label?: string;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  status?: string;
};

type DashboardKandangRow = {
  id_kandang?: string | number;
  status_periode?: string | null;
};

type DailyProductionPoint = {
  tanggal: string;
  total_berat: number;
};

type YearlyProductionPoint = {
  bulan_ke: number;
  nama_bulan: string;
  total_berat: number;
};

type PerformaDetail = {
  nama_kandang: string;
  total_berat: number;
  pendapatan: number;
  pakan: number;
  rak: number;
  gaji: number;
  lain: number;
  laba: number;
};

type PerformaMonth = {
  bulan: number;
  total_laba: number;
  detail: PerformaDetail[];
};

type KpiResult = {
  status?: boolean;
  message?: string;
  id_periode?: number;
  nama_kandang?: string;
  nama_periode?: string;
  periode?: {
    mulai?: string;
    sampai?: string;
    hari?: number;
  };
  asumsi?: {
    butir_per_kolom?: number;
  };
  ringkasan?: {
    populasi_awal?: number;
    ayam_hidup?: number;
    total_kematian?: number;
    total_pakan_kg?: number;
    total_pakan_rp?: number;
    total_produksi_kg?: number;
    total_telur_butir?: number;
    total_pendapatan_rp?: number;
    total_biaya_rp?: number;
    profit_rp?: number;
  };
  kpi?: {
    hdp?: number | null;
    hhp?: number | null;
    egg_mass_g_per_hen_day?: number | null;
    avg_egg_weight_g?: number | null;
    feed_intake_g_per_hen_day?: number | null;
    fcr?: number | null;
    feed_cost_per_egg_rp?: number | null;
    mortality_pct?: number | null;
    livability_pct?: number | null;
    culling_rate_pct?: number | null;
    uniformity_pct?: number | null;
    cracked_egg_pct?: number | null;
    dirty_egg_pct?: number | null;
    shell_quality?: string | null;
    egg_grade?: string | null;
    cost_per_egg_rp?: number | null;
    revenue_per_egg_rp?: number | null;
    profit_margin_pct?: number | null;
    bep_egg_count?: number | null;
    notes?: Record<string, string>;
  };
};

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value || 0);
}

function formatCurrency(value: number) {
  return `Rp ${formatNumber(value)}`;
}

function formatOptionalNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatOptionalCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function toNumber(value: unknown) {
  const normalized = String(value ?? "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function apiGet<T = unknown>(url: string, token?: string | null): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...getOwnerScopeHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return readJsonResponse<T>(response);
}

export function DashboardOverview() {
  const { token, ready } = useAuth();
  const [kandang, setKandang] = useState({ total_ayam: 0, total_kematian: 0 });
  const [produksi, setProduksi] = useState({ mtd: 0, ytd: 0 });
  const [kandangRows, setKandangRows] = useState<DashboardKandangRow[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyProductionPoint[]>([]);
  const [yearlyTrend, setYearlyTrend] = useState<YearlyProductionPoint[]>([]);

  useEffect(() => {
    if (!ready) return;

    const load = async () => {
      try {
        const [kandangData, produksiData, kandangList, dailyData, yearlyData] = await Promise.all([
          apiGet<{ data?: { total_ayam: number; total_kematian: number } }>(`${getApiBase()}/dashboard/kandang-summary`, token),
          apiGet<{ data?: { mtd: number; ytd: number } }>(`${getApiBase()}/dashboard/produksi-summary`, token),
          apiGet<DashboardKandangRow[]>(`${getApiBase()}/kandang/show`, token),
          apiGet<{ data?: DailyProductionPoint[] }>(`${getApiBase()}/dashboard/produksi-bulanan`, token),
          apiGet<{ data?: YearlyProductionPoint[] }>(`${getApiBase()}/dashboard/produksi-tahunan`, token),
        ]);

        setKandang(kandangData?.data ?? { total_ayam: 0, total_kematian: 0 });
        setProduksi(produksiData?.data ?? { mtd: 0, ytd: 0 });
        setKandangRows(Array.isArray(kandangList) ? kandangList : []);
        setDailyTrend(dailyData?.data ?? []);
        setYearlyTrend(yearlyData?.data ?? []);
      } catch {
        setKandang({ total_ayam: 0, total_kematian: 0 });
        setProduksi({ mtd: 0, ytd: 0 });
        setKandangRows([]);
        setDailyTrend([]);
        setYearlyTrend([]);
      }
    };

    void load();
  }, [ready, token]);

  const activePeriods = kandangRows.filter((row) => String(row.status_periode ?? "").toLowerCase() === "aktif").length;
  const dailyTotal = dailyTrend.reduce((sum, point) => sum + Number(point.total_berat ?? 0), 0);
  const currentMonthName = monthNames[new Date().getMonth()];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Ringkasan utama peternakan ayam petelur."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Warehouse} label="Ayam sekarang" value={formatNumber(kandang.total_ayam)} delta={`${formatNumber(kandang.total_kematian)} kematian`} tone="green" />
        <StatCard icon={Activity} label="Periode aktif" value={formatNumber(activePeriods)} delta={`${formatNumber(kandangRows.length)} kandang terpantau`} tone="teal" />
        <StatCard icon={Egg} label="Produksi bulan ini" value={`${formatNumber(produksi.mtd, 2)} kg`} delta="MTD" tone="mint" />
        <StatCard icon={Scale} label="Produksi tahun ini" value={`${formatNumber(produksi.ytd, 2)} kg`} delta="YTD" tone="teal" />
      </div>

      <div className="grid gap-5">
        <TrendPanel
          title={`Trend Produksi Harian ${currentMonthName}`}
          subtitle={`${formatNumber(dailyTotal, 2)} kg tercatat bulan ini`}
          icon={CalendarDays}
          points={dailyTrend.map((point) => ({
            label: formatDateLabel(point.tanggal),
            value: Number(point.total_berat ?? 0),
          }))}
          unit="kg"
        />
        <TrendPanel
          title={`Trend Produksi Bulanan ${new Date().getFullYear()}`}
          subtitle={`${formatNumber(produksi.ytd, 2)} kg sepanjang tahun`}
          icon={Egg}
          points={yearlyTrend.map((point) => ({
            label: point.nama_bulan,
            value: Number(point.total_berat ?? 0),
          }))}
          unit="kg"
        />
      </div>
    </div>
  );
}

function formatDateLabel(value: string) {
  const day = String(value ?? "").slice(8, 10);
  return day || "-";
}

function TrendPanel({
  title,
  subtitle,
  icon: Icon,
  points,
  unit,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  points: Array<{ label: string; value: number }>;
  unit: string;
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 0);
  const displayPoints = points.length > 0 ? points : Array.from({ length: 6 }, (_, index) => ({ label: String(index + 1), value: 0 }));

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-[#0f7963]">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 flex h-48 items-end gap-2 overflow-hidden rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] px-3 py-4">
        {displayPoints.map((point, index) => {
          const height = maxValue > 0 ? Math.max(8, (point.value / maxValue) * 100) : 8;

          return (
            <div key={`${point.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-32 w-full max-w-9 items-end">
                <div
                  className="w-full rounded-t-xl bg-[#0f7963] shadow-sm transition"
                  style={{ height: `${height}%` }}
                  title={`${formatNumber(point.value, 2)} ${unit}`}
                />
              </div>
              <span className="w-full truncate text-center text-[11px] font-medium text-slate-500">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PenjualanPage() {
  const { user } = useAuth();
  const [weights, setWeights] = useState<string[]>(() => Array.from({ length: 60 }, () => ""));
  const [price, setPrice] = useState("");
  const [selectedKandang, setSelectedKandang] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const totalWeight = useMemo(() => weights.reduce((sum, value) => sum + toNumber(value), 0), [weights]);
  const totalPrice = totalWeight * toNumber(price);
  const ownerOptions = useMemo(() => user?.role === "admin" ? user.owner_options ?? [] : [], [user]);
  const selectedOwnerName = useMemo(() => {
    if (user?.role !== "admin") return "";

    const activeOwnerId = typeof window !== "undefined" ? window.localStorage.getItem(ownerScopeStorageKey) ?? "" : "";
    return ownerOptions.find((owner) => String(owner.id) === activeOwnerId)?.name ?? ownerOptions[0]?.name ?? "";
  }, [ownerOptions, user?.role]);
  const penjualanOptions = useMemo(() => {
    const options = saleTargets.map((target) => ({ name: target.name, hasTarget: true }));
    const existingNames = new Set(options.map((option) => option.name.trim().toLowerCase()));

    ownerOptions.forEach((owner) => {
      const name = owner.name.trim();
      if (name && !existingNames.has(name.toLowerCase())) {
        options.push({ name, hasTarget: false });
        existingNames.add(name.toLowerCase());
      }
    });

    return options;
  }, [ownerOptions]);
  const displayedKandang = selectedKandang || selectedOwnerName;

  const updateWeight = (index: number, value: string) => {
    setWeights((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const fillNextWeight = (value: string) => {
    setWeights((current) => {
      const index = current.findIndex((item) => item.trim() === "");
      if (index === -1) return current;
      return current.map((item, itemIndex) => (itemIndex === index ? value : item));
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setMessage("");

    const formData = new FormData(form);
    const kandang = String(formData.get("kandang") ?? "");
    const tanggal = String(formData.get("tanggal") ?? "");
    const missingFields: string[] = [];

    if (!kandang) missingFields.push("Kandang");
    if (!tanggal) missingFields.push("Tanggal");

    if (missingFields.length > 0) {
      setMessage(
        missingFields.length === 1
          ? `${missingFields[0]} harus diisi.`
          : `${missingFields.slice(0, -1).join(", ")} dan ${missingFields[missingFields.length - 1]} harus diisi.`
      );
      setLoading(false);
      return;
    }

    const selectedOption = penjualanOptions.find((item) => item.name === kandang);
    if (!selectedOption) {
      setMessage("Kandang harus dipilih.");
      setLoading(false);
      return;
    }

    if (!selectedOption.hasTarget) {
      setMessage(`Owner ${selectedOption.name} belum punya target Google Script untuk penjualan.`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/penjualan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kandang,
          nota: String(formData.get("nota") ?? ""),
          tanggal,
          weights,
          totalWeight,
          price: toNumber(price),
          totalPrice,
        }),
      });

      const raw = await response.text();
      const result = raw ? (JSON.parse(raw) as { ok?: boolean; message?: string; detail?: string }) : null;

      if (!response.ok || !result?.ok) {
        const detail = result?.detail ? ` ${result.detail}` : "";
        throw new Error(`${result?.message ?? "Gagal mengirim data penjualan."}${detail}`);
      }

      setMessage("Data penjualan berhasil dikirim.");
      form.reset();
      setSelectedKandang("");
      setPrice("");
      setWeights(Array.from({ length: 60 }, () => ""));
    } catch (error) {
      const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
      setMessage(`Gagal mengirim data penjualan.${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Input Penjualan"
        description="Pilih kandang, isi nota, timbang kontainer, lalu total dihitung otomatis."
      />

      <form onSubmit={(event) => void submit(event)} className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Tanggal">
            <input name="tanggal" type="date" required className="field-input" />
          </Field>
          <Field label="Kandang">
            <select
              name="kandang"
              required
              value={displayedKandang}
              onChange={(event) => setSelectedKandang(event.target.value)}
              className="field-input"
            >
              <option value="">Pilih kandang</option>
              {penjualanOptions.map((target) => (
                <option key={target.name} value={target.name}>{target.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Nomor Nota">
            <input name="nota" className="field-input" placeholder="Nomor nota" />
          </Field>
          <Field label="Harga per Kg">
            <input value={price} onChange={(event) => setPrice(event.target.value)} type="number" step="0.01" className="field-input" placeholder="0" />
          </Field>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl bg-[#f6fbf8] p-4 md:grid-cols-[1fr_auto]">
          <Field label="Isi dari QR/manual ke berat kosong berikutnya">
            <input
              type="number"
              step="0.01"
              className="field-input"
              placeholder="Contoh: 12.5"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  fillNextWeight(event.currentTarget.value);
                  event.currentTarget.value = "";
                }
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 md:w-72">
            <SummaryTile label="Total Kg" value={formatNumber(totalWeight, 2)} />
            <SummaryTile label="Total Harga" value={formatCurrency(totalPrice)} />
          </div>
        </div>

        <div className="mt-5">
          <QrScannerPanel onScan={(value) => fillNextWeight(value.replace(",", "."))} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {weights.map((value, index) => (
            <label key={index} className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Berat {index + 1}</span>
              <input
                value={value}
                onChange={(event) => updateWeight(index, event.target.value)}
                type="number"
                step="0.01"
                className="field-input py-2.5"
                placeholder="0"
              />
            </label>
          ))}
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-[#0f7963]">{message}</p> : null}

        <button disabled={loading} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d] disabled:opacity-70">
          <CircleDollarSign className="h-4 w-4" />
          {loading ? "Mengirim..." : "Kirim Data"}
        </button>
      </form>
    </div>
  );
}

export function PerformaPage() {
  const { token, ready } = useAuth();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState<PerformaMonth[]>([]);
  const [loading, setLoading] = useState(false);
  const years = Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() - index));

  const load = async (showLoading = true) => {
    if (!ready) return;
    if (showLoading) {
      setLoading(true);
    }
    try {
      const data = await apiGet<PerformaMonth[]>(`${getApiBase()}/operasional/rekap-tahun?tahun=${year}`, token);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;

    const loadInitial = async () => {
      try {
        const data = await apiGet<PerformaMonth[]>(`${getApiBase()}/operasional/rekap-tahun?tahun=${year}`, token);
        setRows(Array.isArray(data) ? data : []);
      } catch {
        setRows([]);
      }
    };

    void loadInitial();
  }, [ready, token, year]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Performa"
        description="Rekap tahunan dari produksi, pakan, dan operasional."
      />

      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Tahun">
            <select value={year} onChange={(event) => setYear(event.target.value)} className="field-input sm:w-48">
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <button onClick={() => void load()} type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d]">
            <Search className="h-4 w-4" />
            Filter
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-[26px] border border-white/70 bg-white/85 p-8 text-sm text-slate-500">Memuat performa...</div>
        ) : rows.map((row) => (
          <div key={row.bulan} className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{monthNames[row.bulan - 1] ?? `Bulan ${row.bulan}`}</h2>
                <p className="text-sm text-slate-500">{row.detail.length} kandang tercatat</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#0f7963]">
                Laba {formatCurrency(Number(row.total_laba))}
              </div>
            </div>

            <div className="mt-4 space-y-3 md:hidden">
              {row.detail.length > 0 ? row.detail.map((detail) => (
                <div key={`${row.bulan}-${detail.nama_kandang}`} className="rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{detail.nama_kandang}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">Laporan detail</p>
                    </div>
                    <span className="text-right text-sm font-semibold text-[#0f7963]">
                      {formatCurrency(Number(detail.laba))}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {[
                      ["Berat", `${formatNumber(Number(detail.total_berat), 2)} kg`],
                      ["Pendapatan", formatCurrency(Number(detail.pendapatan))],
                      ["Pakan", formatCurrency(Number(detail.pakan))],
                      ["Rak", formatCurrency(Number(detail.rak))],
                      ["Gaji", formatCurrency(Number(detail.gaji))],
                      ["Lain", formatCurrency(Number(detail.lain))],
                    ].map(([label, value]) => (
                      <div key={`${detail.nama_kandang}-${label}`} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-slate-500">{label}</span>
                        <span className="text-right text-slate-700">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-emerald-950/10 bg-white px-4 py-8 text-sm text-slate-500">
                  Belum ada detail bulan ini.
                </div>
              )}
            </div>

            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-emerald-950/5 md:block">
              <div className="grid min-w-[920px] grid-cols-8 bg-[#f3fbf5] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {["Kandang", "Berat", "Pendapatan", "Pakan", "Rak", "Gaji", "Lain", "Laba"].map((column) => <span key={column}>{column}</span>)}
              </div>
              {row.detail.length > 0 ? row.detail.map((detail) => (
                <div key={`${row.bulan}-${detail.nama_kandang}`} className="grid min-w-[920px] grid-cols-8 border-t border-emerald-950/5 px-4 py-4 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{detail.nama_kandang}</span>
                  <span>{formatNumber(Number(detail.total_berat), 2)} kg</span>
                  <span>{formatCurrency(Number(detail.pendapatan))}</span>
                  <span>{formatCurrency(Number(detail.pakan))}</span>
                  <span>{formatCurrency(Number(detail.rak))}</span>
                  <span>{formatCurrency(Number(detail.gaji))}</span>
                  <span>{formatCurrency(Number(detail.lain))}</span>
                  <span className="font-semibold text-[#0f7963]">{formatCurrency(Number(detail.laba))}</span>
                </div>
              )) : (
                <div className="px-4 py-8 text-sm text-slate-500">Belum ada detail bulan ini.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FcrPage() {
  const { token, ready } = useAuth();
  const [kandangOptions, setKandangOptions] = useState<KandangOption[]>([]);
  const [periodeOptions, setPeriodeOptions] = useState<PeriodeOption[]>([]);
  const [selected, setSelected] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [result, setResult] = useState<KpiResult | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!ready) return;

    const load = async () => {
      try {
        const data = await apiGet<KandangOption[] | { data?: KandangOption[] }>(`${getApiBase()}/kandang`, token);
        setKandangOptions(Array.isArray(data) ? data : data?.data ?? []);
      } catch {
        setKandangOptions([]);
      }
    };

    void load();
  }, [ready, token]);

  useEffect(() => {
    const loadPeriods = async () => {
      await Promise.resolve();

      if (!ready || !selected) {
        setPeriodeOptions([]);
        setSelectedPeriod("");
        return;
      }

      try {
        const data = await apiGet<PeriodeOption[] | { data?: PeriodeOption[] }>(`${getApiBase()}/kandang/periode?id_kandang=${selected}`, token);
        const periods = Array.isArray(data) ? data : data?.data ?? [];
        setPeriodeOptions(periods);
        setSelectedPeriod(periods[0]?.id_periode ? String(periods[0].id_periode) : "");
      } catch {
        setPeriodeOptions([]);
        setSelectedPeriod("");
      }
    };

    void loadPeriods();
  }, [ready, selected, token]);

  const calculate = async () => {
    if (!ready || !selected) return;
    setMessage("");
    try {
      const periodParam = selectedPeriod ? `&id_periode=${selectedPeriod}` : "";
      const data = await apiGet<KpiResult>(`${getApiBase()}/fcr/periode?id_kandang=${selected}${periodParam}&bulan=${month}&tahun=${year}`, token);
      setResult(data);
      if (data?.status === false) {
        setMessage(data?.message || "Tidak ada data pada periode yang dipilih.");
      } else {
        setMessage(data?.nama_kandang ? `Statistik ${data.nama_kandang} berhasil dimuat.` : "Statistik berhasil dimuat.");
      }
    } catch (caughtError) {
      setResult(null);
      setMessage(caughtError instanceof Error && caughtError.message ? caughtError.message : "Gagal menghitung statistik.");
    }
  };

  const ringkasan = result?.ringkasan ?? {};
  const kpi = result?.kpi ?? {};
  const selectedKandangName = kandangOptions.find((item) => String(item.id_kandang) === selected)?.nama_kandang ?? "";
  const selectedPeriodLabel = periodeOptions.find((item) => String(item.id_periode) === selectedPeriod)?.label ?? result?.nama_periode ?? "";
  const selectedMonthName = monthNames[Math.max(0, (Number(result?.periode?.bulan ?? month) || Number(month)) - 1)] ?? "";

  const totalPakan = ringkasan.total_pakan_kg ?? 0;
  const totalProduksi = ringkasan.total_produksi_kg ?? 0;
  const totalTelurButir = ringkasan.total_telur_butir ?? 0;
  const totalBiaya = ringkasan.total_biaya_rp ?? 0;
  const profit = ringkasan.profit_rp ?? 0;
  const totalPakanRp = ringkasan.total_pakan_rp ?? 0;
  const totalPendapatanRp = ringkasan.total_pendapatan_rp ?? 0;
  const activeBirds = ringkasan.ayam_hidup ?? 0;
  const initialBirds = ringkasan.populasi_awal ?? 0;
  const hdpValue = activeBirds > 0 ? (totalTelurButir / activeBirds) * 100 : null;
  const hhpValue = initialBirds > 0 ? (totalTelurButir / initialBirds) * 100 : null;
  const eggMassValue = activeBirds > 0 ? (totalProduksi * 1000) / activeBirds : null;
  const feedIntakeValue = activeBirds > 0 ? (totalPakan * 1000) / activeBirds : null;
  const feedCostPerKgTelur = totalProduksi > 0 ? (ringkasan.total_pakan_rp ?? 0) / totalProduksi : null;

  const groups = [
    {
      title: "KPI Produksi Utama",
      description: "Kinerja hasil telur per periode kandang.",
      items: [
        { label: "HDP", value: hdpValue !== null ? `${formatOptionalNumber(hdpValue, 2)}%` : "N/A", note: `(${formatNumber(totalTelurButir, 0)} ÷ ${formatNumber(activeBirds, 0)}) × 100%` },
        { label: "HHP", value: hhpValue !== null ? `${formatOptionalNumber(hhpValue, 2)}%` : "N/A", note: `(${formatNumber(totalTelurButir, 0)} ÷ ${formatNumber(initialBirds, 0)}) × 100%` },
        { label: "Egg Mass", value: eggMassValue !== null ? `${formatOptionalNumber(eggMassValue, 2)} g/ekor` : "N/A", note: `(${formatNumber(totalProduksi, 2)} kg × 1000) ÷ ${formatNumber(activeBirds, 0)}` },
        { label: "Berat Telur Rata-rata", value: `${formatOptionalNumber(kpi.avg_egg_weight_g ?? null, 0)} g`, note: `(${formatNumber(totalProduksi, 2)} kg × 1000) ÷ ${formatNumber(totalTelurButir, 0)} butir` },
      ],
    },
    {
      title: "KPI Pakan & Efisiensi",
      description: "Efisiensi pakan dan konversi produksi.",
      items: [
        { label: "Feed Intake", value: feedIntakeValue !== null ? `${formatOptionalNumber(feedIntakeValue, 2)} g/ekor` : "N/A", note: `(${formatNumber(totalPakan, 2)} kg × 1000) ÷ ${formatNumber(activeBirds, 0)}` },
        { label: "FCR", value: kpi.fcr !== null && kpi.fcr !== undefined ? formatOptionalNumber(kpi.fcr, 3) : "N/A", note: `${formatNumber(totalPakan, 2)} kg ÷ ${formatNumber(totalProduksi, 2)} kg` },
        { label: "Feed Cost/Egg", value: formatOptionalCurrency(kpi.feed_cost_per_egg_rp ?? null), note: `Rp ${formatNumber(totalPakanRp, 0)} ÷ ${formatNumber(totalTelurButir, 0)} butir` },
        { label: "Feed Cost/Kg Telur", value: formatOptionalCurrency(feedCostPerKgTelur), note: `Rp ${formatNumber(totalPakanRp, 0)} ÷ ${formatNumber(totalProduksi, 2)} kg` },
      ],
    },
    {
      title: "KPI Kesehatan & Populasi",
      description: "Populasi hidup, kematian, dan indikator kesehatan.",
      items: [
        { label: "Mortality", value: kpi.mortality_pct !== null && kpi.mortality_pct !== undefined ? `${formatOptionalNumber(kpi.mortality_pct, 2)}%` : "N/A", note: `(${formatOptionalNumber(ringkasan.total_kematian ?? null, 0)} ÷ ${formatNumber(initialBirds, 0)}) × 100%` },
        { label: "Livability", value: kpi.livability_pct !== null && kpi.livability_pct !== undefined ? `${formatOptionalNumber(kpi.livability_pct, 2)}%` : "N/A", note: `100% - ${formatOptionalNumber(kpi.mortality_pct ?? null, 2)}%` },
        { label: "Culling Rate", value: kpi.culling_rate_pct !== null && kpi.culling_rate_pct !== undefined ? `${formatOptionalNumber(kpi.culling_rate_pct, 2)}%` : "N/A", note: "Belum ada data afkir" },
        { label: "Uniformity", value: kpi.uniformity_pct !== null && kpi.uniformity_pct !== undefined ? `${formatOptionalNumber(kpi.uniformity_pct, 2)}%` : "N/A", note: "Belum ada data keseragaman" },
      ],
    },
    {
      title: "KPI Finansial",
      description: "Pendapatan, biaya, dan titik impas.",
      items: [
        { label: "Cost per Egg", value: formatOptionalCurrency(kpi.cost_per_egg_rp ?? null), note: `Rp ${formatNumber(totalBiaya, 0)} ÷ ${formatNumber(totalTelurButir, 0)} butir` },
        { label: "Revenue per Egg", value: formatOptionalCurrency(kpi.revenue_per_egg_rp ?? null), note: `Rp ${formatNumber(totalPendapatanRp, 0)} ÷ ${formatNumber(totalTelurButir, 0)} butir` },
        { label: "Profit Margin", value: kpi.profit_margin_pct !== null && kpi.profit_margin_pct !== undefined ? `${formatOptionalNumber(kpi.profit_margin_pct, 2)}%` : "N/A", note: `(${formatOptionalCurrency(profit)} ÷ ${formatOptionalCurrency(totalPendapatanRp)}) × 100%` },
        { label: "BEP", value: kpi.bep_egg_count !== null && kpi.bep_egg_count !== undefined ? `${formatOptionalNumber(kpi.bep_egg_count, 2)} butir` : "N/A", note: `Rp ${formatNumber(totalBiaya, 0)} ÷ ${formatOptionalCurrency(kpi.revenue_per_egg_rp ?? null)}` },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="KPI Kandang" description="Pilih kandang dan periode ayam, lalu lihat KPI produksi, pakan, kesehatan, dan finansial." />

      <div className="grid gap-5 lg:grid-cols-[0.82fr_1fr]">
        <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Kandang">
              <select value={selected} onChange={(event) => setSelected(event.target.value)} className="field-input">
                <option value="">Pilih kandang</option>
                {kandangOptions.map((item) => (
                  <option key={item.id_kandang} value={item.id_kandang}>
                    {item.nama_kandang}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Periode">
              <select value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)} className="field-input" disabled={!selected || periodeOptions.length === 0}>
                <option value="">Pilih periode</option>
                {periodeOptions.map((item) => (
                  <option key={item.id_periode} value={item.id_periode}>
                    {item.label ?? item.nama_periode}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bulan">
              <select value={month} onChange={(event) => setMonth(event.target.value)} className="field-input">
                {monthNames.map((item, index) => (
                  <option key={item} value={String(index + 1)}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tahun">
              <select value={year} onChange={(event) => setYear(event.target.value)} className="field-input">
                {Array.from({ length: 6 }, (_, index) => String(today.getFullYear() - index)).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button onClick={() => void calculate()} type="button" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d]">
            <Calculator className="h-4 w-4" />
            Hitung KPI
          </button>
          {message ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">{message}</p> : null}
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6fbf8] px-4 py-3">
              <span>Kandang aktif</span>
              <span className="font-semibold text-slate-900">{selectedKandangName || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6fbf8] px-4 py-3">
              <span>Periode</span>
              <span className="text-right font-semibold text-slate-900">{selectedPeriodLabel || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6fbf8] px-4 py-3">
              <span>Bulan KPI</span>
              <span className="font-semibold text-slate-900">{selectedMonthName ? `${selectedMonthName} ${year}` : "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6fbf8] px-4 py-3">
              <span>Total butir telur</span>
              <span className="font-semibold text-slate-900">{formatNumber(totalTelurButir, 0)} butir</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Package2} label="Total Pakan" value={`${formatOptionalNumber(totalPakan, 2)} kg`} />
          <SummaryCard icon={Egg} label="Total Produksi" value={`${formatOptionalNumber(totalProduksi, 2)} kg`} />
          <SummaryCard icon={Scale} label="Total Biaya" value={formatOptionalCurrency(totalBiaya)} />
          <SummaryCard icon={CircleDollarSign} label="Profit" value={formatOptionalCurrency(profit)} />
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.title} className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{group.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{group.description}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f7963]">{group.items.length} KPI</span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {group.items.map((item) => (
              <div key={`${group.title}-${item.label}`} className="rounded-[22px] border border-emerald-950/10 bg-[#fbfdfb] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{kpiMeaning(item.label)}</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-[#0f7963]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function kpiMeaning(label: string) {
  switch (label) {
    case "HDP":
      return "Hen Day Production";
    case "HHP":
      return "Hen Housed Production";
    case "Egg Mass":
      return "Massa telur";
    case "Berat Telur Rata-rata":
      return "Rata-rata berat per butir";
    case "Feed Intake":
      return "Konsumsi pakan";
    case "FCR":
      return "Feed Conversion Ratio";
    case "Feed Cost/Egg":
      return "Biaya pakan per butir";
    case "Feed Cost/Kg Telur":
      return "Biaya pakan per kg telur";
    case "Mortality":
      return "Persentase kematian";
    case "Livability":
      return "Persentase hidup";
    case "Culling Rate":
      return "Ayam afkir";
    case "Uniformity":
      return "Keseragaman populasi";
    case "Cost per Egg":
      return "HPP per butir";
    case "Revenue per Egg":
      return "Pendapatan per butir";
    case "Profit Margin":
      return "Margin keuntungan";
    case "BEP":
      return "Titik impas";
    default:
      return "";
  }
}
