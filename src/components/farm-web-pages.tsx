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
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  Egg,
  Info,
  Lightbulb,
  Package2,
  Scale,
  Search,
  ShieldUser,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";

type KandangOption = {
  id_kandang: string | number;
  nama_kandang: string;
  primary_owner_id?: string | number | null;
  primary_owner_name?: string | null;
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

type FinanceTrendPoint = {
  tanggal: string;
  cash_in: number;
  cash_out: number;
  net_cash: number;
};

type FinanceCategory = {
  label: string;
  value: number;
};

type FinanceKandangRow = {
  id_kandang: number | string;
  nama_kandang: string;
  cash_in: number;
  cash_out: number;
  net_cash: number;
  margin_pct?: number | null;
  production_kg: number;
  fcr?: number | null;
  avg_price_per_kg?: number | null;
  cost_per_kg?: number | null;
  feed_cost_per_kg_egg?: number | null;
  profit_per_kg?: number | null;
  break_even_price_per_kg?: number | null;
  risk_level?: string;
  risk_score?: number;
  root_causes?: InsightMessage[];
  is_active_period?: boolean;
  status: string;
};

type FinanceSensitivityPoint = {
  change_pct: number;
  net_cash: number;
  margin_pct?: number | null;
};

type FinanceAction = {
  priority: number;
  title: string;
  text: string;
};

type FinanceSafetyBuffer = {
  status?: string;
  level?: string;
  production_drop_pct?: number | null;
  price_drop_pct?: number | null;
  feed_cost_increase_pct?: number | null;
  cash_buffer?: number;
  text?: string;
};

type FinanceData = {
  period?: {
    start?: string;
    end?: string;
    days?: number;
  };
  summary?: {
    cash_in?: number;
    cash_out?: number;
    net_cash?: number;
    profit_margin_pct?: number | null;
    cost_ratio_pct?: number | null;
    production_kg?: number;
    feed_kg?: number;
    fcr?: number | null;
    kandang_count?: number;
    avg_price_per_kg?: number | null;
    cost_per_kg?: number | null;
    feed_cost_per_kg_egg?: number | null;
    profit_per_kg?: number | null;
  };
  comparison?: {
    period?: {
      start?: string;
      end?: string;
      days?: number;
    };
    cash_in_pct?: number | null;
    cash_out_pct?: number | null;
    net_cash_pct?: number | null;
    previous_cash_in?: number;
    previous_cash_out?: number;
    previous_net_cash?: number;
  };
  break_even?: {
    price_per_kg?: number | null;
    production_kg?: number | null;
    price_gap_per_kg?: number | null;
    production_gap_kg?: number | null;
  };
  sensitivity?: {
    feed_price?: FinanceSensitivityPoint[];
    selling_price?: FinanceSensitivityPoint[];
  };
  safety_buffer?: FinanceSafetyBuffer;
  benchmark?: {
    best_cost_kandang?: {
      nama_kandang?: string;
      cost_per_kg?: number | null;
      gap_to_average?: number | null;
    } | null;
    best_margin_kandang?: {
      nama_kandang?: string;
      margin_pct?: number | null;
    } | null;
  };
  categories?: FinanceCategory[];
  forecast?: {
    net_cash_7_days?: number;
    net_cash_30_days?: number;
    cash_in_30_days?: number;
    cash_out_30_days?: number;
  };
  health?: {
    score?: number;
    status?: string;
  };
  trend?: FinanceTrendPoint[];
  kandang?: FinanceKandangRow[];
  recommendations?: InsightMessage[];
  action_plan?: FinanceAction[];
};

type KpiResult = {
  status?: boolean;
  message?: string;
  id_periode?: number;
  nama_kandang?: string;
  primary_owner_id?: number | string | null;
  primary_owner_name?: string | null;
  nama_periode?: string;
  periode?: {
    bulan?: number;
    tahun?: number;
    mulai?: string;
    sampai?: string;
    hari?: number;
    mode?: string;
    label?: string;
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

type FarmInsight = {
  generated_at?: string;
  summary?: {
    kandang_count?: number;
    active_period_count?: number;
    live_birds?: number;
    production_30_days_kg?: number;
    feed_30_days_kg?: number;
    profit_30_days_rp?: number;
    fcr_30_days?: number | null;
    analysis_start?: string;
    analysis_end?: string;
    analysis_days?: number;
  };
  predictions?: {
    production_daily_kg?: number;
    production_7_days_kg?: number;
    production_30_days_kg?: number;
    production_trend_pct?: number | null;
    feed_daily_kg?: number;
    feed_7_days_kg?: number;
    profit_7_days_rp?: number;
    profit_30_days_rp?: number;
  };
  health?: {
    score?: number;
    status?: string;
  };
  anomalies?: InsightMessage[];
  recommendations?: InsightMessage[];
  early_warning?: {
    level?: string;
    label?: string;
    text?: string;
  };
  kandang_rankings?: {
    risk?: KandangInsight[];
    champion?: KandangInsight[];
  };
  root_causes?: RootCauseInsight[];
};

type InsightMessage = {
  tone?: string;
  title: string;
  text: string;
};

type RootCauseInsight = InsightMessage & {
  id_kandang?: number | string;
  nama_kandang?: string;
};

type KandangInsight = {
  id_kandang: number | string;
  nama_kandang: string;
  risk_score?: number;
  health?: {
    score?: number;
    status?: string;
  };
  metrics?: {
    live_birds?: number;
    production_30_days_kg?: number;
    production_7_days_kg?: number;
    production_trend_pct?: number | null;
    feed_30_days_kg?: number;
    fcr_30_days?: number | null;
    mortality_7_days_pct?: number | null;
    profit_30_days_rp?: number;
    profit_margin_pct?: number | null;
  };
  prediction?: {
    production_7_days_kg?: number;
    feed_7_days_kg?: number;
    profit_7_days_rp?: number;
  };
  root_causes?: InsightMessage[];
  suggestion?: InsightMessage;
  explanation?: {
    analysis_period?: {
      start?: string | null;
      end?: string | null;
      days?: number;
      note?: string;
    };
    fcr?: {
      formula?: string;
      feed_kg?: number;
      production_kg?: number;
      result?: number | null;
    };
    trend?: {
      formula?: string;
      last_7_days_kg?: number;
      previous_7_days_kg?: number;
      result_pct?: number | null;
    };
    score?: {
      formula?: string;
      start?: number;
      penalties?: {
        fcr?: number;
        mortality?: number;
        margin?: number;
        missing_production?: number;
        production_trend?: number;
      };
      result?: number;
    };
    reason?: string;
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

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 1)}%`;
}

function formatOptionalSignedPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return formatSignedPercent(value);
}

function toNumber(value: unknown) {
  const normalized = String(value ?? "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseSaleNoteQr(value: string): { tanggal: string; kandang: string; nota: string; weights: string[] } | null {
  try {
    const data = JSON.parse(value) as {
      type?: string;
      tanggal?: string;
      kandang?: string;
      nota?: string;
      weights?: Array<string | number>;
    };

    if (data.type !== "mawifarm_sale_note" || !Array.isArray(data.weights)) {
      return null;
    }

    return {
      tanggal: String(data.tanggal ?? ""),
      kandang: String(data.kandang ?? ""),
      nota: String(data.nota ?? ""),
      weights: data.weights.map((weight) => String(weight).replace(",", ".")),
    };
  } catch {
    return null;
  }
}

const notaApplyStorageKey = "mawifarm:nota-apply";

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
          relaxed
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

function formatKpiKandangOption(option: KandangOption) {
  return option.primary_owner_name
    ? `${option.nama_kandang} - Primary: ${option.primary_owner_name}`
    : option.nama_kandang;
}

function TrendPanel({
  title,
  subtitle,
  icon: Icon,
  points,
  unit,
  relaxed = false,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  points: Array<{ label: string; value: number }>;
  unit: string;
  relaxed?: boolean;
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 0);
  const displayPoints = points.length > 0 ? points : Array.from({ length: 6 }, (_, index) => ({ label: String(index + 1), value: 0 }));

  return (
    <div className="min-w-0 overflow-hidden rounded-[26px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 break-words text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#0f7963]">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className={["mt-6 h-48 min-w-0 overflow-x-auto overflow-y-hidden rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] py-4", relaxed ? "px-8" : "px-3"].join(" ")}>
        <div
          className={["flex h-full min-w-full items-end sm:w-full", relaxed ? "gap-4" : "gap-3"].join(" ")}
          style={{ width: `max(100%, ${displayPoints.length * (relaxed ? 62 : 88)}px)` }}
        >
          {displayPoints.map((point, index) => {
            const height = maxValue > 0 ? Math.min(88, Math.max(8, (point.value / maxValue) * 100)) : 8;

            return (
              <div key={`${point.label}-${index}`} className={["flex shrink-0 flex-col items-center justify-end gap-2 sm:min-w-0 sm:flex-1 sm:shrink sm:basis-0", relaxed ? "w-12" : "w-20"].join(" ")}>
                <div className="flex h-32 w-full max-w-7 items-end sm:max-w-9">
                  <div
                    className="w-full rounded-t-xl bg-[#0f7963] shadow-sm transition"
                    style={{ height: `${height}%` }}
                    title={`${formatNumber(point.value, 2)} ${unit}`}
                  />
                </div>
                <span className="w-full text-center text-[11px] font-medium leading-3 text-slate-500">
                  <span className="block">{point.label}</span>
                  <span className="block whitespace-nowrap">{formatNumber(point.value, 2)} {unit}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PenjualanPage() {
  const { user } = useAuth();
  const [weights, setWeights] = useState<string[]>(() => Array.from({ length: 60 }, () => ""));
  const [saleDate, setSaleDate] = useState("");
  const [notaNumber, setNotaNumber] = useState("");
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

  useEffect(() => {
    const payload = window.sessionStorage.getItem(notaApplyStorageKey);
    if (!payload) return;

    try {
      const note = JSON.parse(payload) as {
        tanggal?: string;
        kandang?: string;
        nota?: string;
        weights?: Array<string | number>;
      };

      setSaleDate(String(note.tanggal ?? ""));
      setSelectedKandang(String(note.kandang ?? ""));
      setNotaNumber(String(note.nota ?? ""));
      setWeights(Array.from({ length: 60 }, (_, index) => note.weights?.[index] !== undefined ? String(note.weights[index]).replace(",", ".") : ""));
      setMessage(note.nota ? `Nota ${note.nota} berhasil diterapkan.` : "Nota berhasil diterapkan.");
    } catch {
      setMessage("Data nota tidak bisa diterapkan.");
    } finally {
      window.sessionStorage.removeItem(notaApplyStorageKey);
    }
  }, []);

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

  const handleScan = (value: string) => {
    const note = parseSaleNoteQr(value);

    if (!note) {
      fillNextWeight(value.replace(",", "."));
      return;
    }

    setSaleDate(note.tanggal);
    setSelectedKandang(note.kandang);
    setNotaNumber(note.nota);
    setWeights(Array.from({ length: 60 }, (_, index) => note.weights[index] ?? ""));
    setMessage("QR scanned.");
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
      setSaleDate("");
      setNotaNumber("");
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
            <input name="tanggal" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} type="date" required className="field-input" />
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
            <input name="nota" value={notaNumber} onChange={(event) => setNotaNumber(event.target.value)} className="field-input" placeholder="Nomor nota" />
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
          <QrScannerPanel onScan={handleScan} />
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

function defaultFinanceStart() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function defaultFinanceEnd() {
  return new Date().toISOString().slice(0, 10);
}

export function FinancePage() {
  const { token, ready } = useAuth();
  const [kandangOptions, setKandangOptions] = useState<KandangOption[]>([]);
  const [selectedKandang, setSelectedKandang] = useState("0");
  const [startDate, setStartDate] = useState(defaultFinanceStart);
  const [endDate, setEndDate] = useState(defaultFinanceEnd);
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeHelp, setActiveHelp] = useState<FinanceHelpKey | null>(null);

  useEffect(() => {
    if (!ready) return;

    const loadOptions = async () => {
      try {
        const result = await apiGet<KandangOption[] | { data?: KandangOption[] }>(`${getApiBase()}/kandang`, token);
        setKandangOptions(Array.isArray(result) ? result : result.data ?? []);
      } catch {
        setKandangOptions([]);
      }
    };

    void loadOptions();
  }, [ready, token]);

  useEffect(() => {
    if (!ready) return;

    const loadFinance = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          tanggal_mulai: startDate,
          tanggal_selesai: endDate,
        });
        if (selectedKandang !== "0") {
          params.set("id_kandang", selectedKandang);
        }

        const result = await apiGet<{ data?: FinanceData }>(`${getApiBase()}/finance/summary?${params.toString()}`, token);
        setData(result.data ?? null);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : "Gagal memuat data finance.");
      } finally {
        setLoading(false);
      }
    };

    void loadFinance();
  }, [ready, token, startDate, endDate, selectedKandang]);

  const summary = data?.summary ?? {};
  const forecast = data?.forecast ?? {};
  const health = data?.health ?? {};
  const comparison = data?.comparison ?? {};
  const breakEven = data?.break_even ?? {};
  const sensitivity = data?.sensitivity ?? {};
  const safetyBuffer = data?.safety_buffer ?? {};
  const benchmark = data?.benchmark ?? {};
  const actionPlan = data?.action_plan ?? [];
  const trend = data?.trend ?? [];
  const categories = data?.categories ?? [];
  const kandangRows = data?.kandang ?? [];
  const recommendations = data?.recommendations ?? [];
  const activeKandangRows = kandangRows.filter((row) => row.is_active_period !== false);
  const bestKandang = [...activeKandangRows].sort((a, b) => Number(b.net_cash ?? 0) - Number(a.net_cash ?? 0))[0];
  const riskKandang = [...activeKandangRows]
    .filter((row) => Number(row.production_kg ?? 0) > 0 || Number(row.cash_in ?? 0) > 0 || Number(row.cash_out ?? 0) > 0)
    .sort((a, b) => Number(a.net_cash ?? 0) - Number(b.net_cash ?? 0))[0];
  const healthScore = Number(health.score ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Optimasi laba dan keberlanjutan finansial berdasarkan produksi, pakan, dan operasional yang sudah tercatat."
      />

      <div className="rounded-[26px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.3fr]">
          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Mulai</span>
            <input className="field-input mt-2" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sampai</span>
            <input className="field-input mt-2" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kandang</span>
            <select className="field-input mt-2" value={selectedKandang} onChange={(event) => setSelectedKandang(event.target.value)}>
              <option value="0">Semua kandang</option>
              {kandangOptions.map((option) => (
                <option key={String(option.id_kandang)} value={String(option.id_kandang)}>
                  {formatKpiKandangOption(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-[26px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HelpCard onHelp={() => setActiveHelp("cashIn")}>
          <StatCard icon={CircleDollarSign} label="Pendapatan" value={formatCurrency(Number(summary.cash_in ?? 0))} delta="Dari produksi telur" tone="teal" />
        </HelpCard>
        <HelpCard onHelp={() => setActiveHelp("cashOut")}>
          <StatCard icon={Package2} label="Biaya" value={formatCurrency(Number(summary.cash_out ?? 0))} delta="Pakan dan operasional" tone="amber" />
        </HelpCard>
        <HelpCard onHelp={() => setActiveHelp("netCash")}>
          <StatCard icon={TrendingUp} label="Laba" value={formatCurrency(Number(summary.net_cash ?? 0))} delta={`${formatOptionalNumber(summary.profit_margin_pct ?? null, 2)}% margin`} tone="green" />
        </HelpCard>
        <HelpCard onHelp={() => setActiveHelp("health")}>
          <StatCard icon={Activity} label="Health score" value={loading ? "..." : formatNumber(healthScore)} delta={health.status ?? "Belum ada data"} tone={healthScore >= 82 ? "green" : healthScore >= 60 ? "amber" : "teal"} />
        </HelpCard>
      </div>

      <CashFlowTrend points={trend} loading={loading} onHelp={() => setActiveHelp("cashFlowTrend")} />

      <FinanceHealthPanel
        score={healthScore}
        status={health.status ?? "Belum ada data"}
        margin={summary.profit_margin_pct ?? null}
        costRatio={summary.cost_ratio_pct ?? null}
        fcr={summary.fcr ?? null}
        productionKg={Number(summary.production_kg ?? 0)}
        onHelp={() => setActiveHelp("sustainability")}
      />

      <div className="grid gap-5">
        <BreakEvenPanel breakEven={breakEven} summary={summary} comparison={comparison} benchmark={benchmark} onHelp={() => setActiveHelp("breakEven")} />
        <SafetyBufferPanel buffer={safetyBuffer} onHelp={() => setActiveHelp("safetyBuffer")} />
      </div>

      <div className="grid gap-5">
        <SensitivityPanel sensitivity={sensitivity} onHelp={() => setActiveHelp("sensitivity")} />
        <ForecastPanel forecast={forecast} recommendations={recommendations} actionPlan={actionPlan} onHelp={() => setActiveHelp("forecast")} />
      </div>

      <div className="grid gap-5">
        <CostBreakdownPanel categories={categories} onHelp={() => setActiveHelp("costBreakdown")} />
        <FinanceKandangPanel title="Kandang paling kuat" row={bestKandang} emptyText="Belum ada kandang dengan surplus pada periode ini." onHelp={() => setActiveHelp("kandangInsight")} />
      </div>

      <div className="grid gap-5">
        <FinanceKandangPanel title="Kandang prioritas cek" row={riskKandang} emptyText="Belum ada kandang yang perlu diprioritaskan." onHelp={() => setActiveHelp("kandangInsight")} />
      </div>

      <FinanceTable rows={kandangRows} onHelp={() => setActiveHelp("kandangTable")} />
      <FinanceHelpDialog helpKey={activeHelp} onClose={() => setActiveHelp(null)} />
    </div>
  );
}

type FinanceHelpKey =
  | "cashIn"
  | "cashOut"
  | "netCash"
  | "health"
  | "cashFlowTrend"
  | "sustainability"
  | "breakEven"
  | "sensitivity"
  | "safetyBuffer"
  | "costBreakdown"
  | "forecast"
  | "kandangInsight"
  | "kandangTable";

const financeHelp: Record<FinanceHelpKey, { title: string; source: string; formula: string; note: string }> = {
  cashIn: {
    title: "Pendapatan",
    source: "Total nilai penjualan atau pendapatan telur yang tercatat pada periode dan kandang yang dipilih.",
    formula: "Semua pendapatan telur pada periode terpilih dijumlahkan.",
    note: "Angka ini menunjukkan uang masuk dari hasil produksi telur yang sudah dicatat.",
  },
  cashOut: {
    title: "Biaya",
    source: "Biaya pakan, biaya rak, gaji, dan biaya lain yang tercatat pada periode dan kandang yang dipilih.",
    formula: "Total biaya = biaya pakan + biaya rak + gaji + biaya lain.",
    note: "Tidak memakai data transfer, rekening, hutang, atau pembayaran eksternal.",
  },
  netCash: {
    title: "Laba",
    source: "Uang masuk dari telur dan uang keluar dari biaya kandang.",
    formula: "Laba = pendapatan - biaya. Margin = laba / pendapatan x 100.",
    note: "Jika negatif, biaya periode ini lebih besar dari pendapatan yang tercatat.",
  },
  health: {
    title: "Health score",
    source: "Laba, margin, rasio biaya, efisiensi pakan, dan kelengkapan pendapatan.",
    formula: "Skor awal 100 dikurangi poin risiko dari laba negatif, margin rendah, biaya terlalu tinggi, efisiensi pakan melemah, atau belum ada pendapatan.",
    note: "Skor ini adalah indikator cepat, bukan laporan akuntansi formal.",
  },
  cashFlowTrend: {
    title: "Grafik laba harian",
    source: "Catatan harian pendapatan telur dan biaya kandang.",
    formula: "Setiap hari dihitung: pendapatan, biaya, lalu laba harian.",
    note: "Dipakai untuk melihat hari mana yang paling menekan laba.",
  },
  sustainability: {
    title: "Financial Sustainability",
    source: "Total produksi telur, pemakaian pakan, pendapatan, dan biaya kandang.",
    formula: "Margin = laba / pendapatan. Rasio biaya = biaya / pendapatan. FCR = total pakan / total berat telur.",
    note: "Bagian ini membaca daya tahan finansial kandang dari efisiensi dan margin.",
  },
  breakEven: {
    title: "Break-even dan efisiensi",
    source: "Uang masuk, uang keluar, dan total berat telur pada periode terpilih.",
    formula: "Harga impas per kg = total biaya / total kg telur. Produksi impas = total biaya / harga jual rata-rata per kg. Biaya per kg = total biaya / total kg telur.",
    note: "Gap positif berarti posisi periode ini masih di atas titik impas.",
  },
  sensitivity: {
    title: "Sensitivity check",
    source: "Pendapatan telur, total biaya, dan biaya pakan.",
    formula: "Simulasi pakan naik: biaya pakan dinaikkan 5%, 10%, 15%. Simulasi harga jual turun: pendapatan diturunkan 5%, 10%, 15%. Setelah itu laba dan margin dihitung ulang.",
    note: "Ini simulasi sederhana untuk melihat daya tahan terhadap perubahan harga.",
  },
  safetyBuffer: {
    title: "Batas Aman Sebelum Rugi",
    source: "Laba, total produksi telur, harga jual rata-rata, dan biaya pakan.",
    formula: "Produksi boleh turun = jarak produksi aktual ke produksi impas. Harga boleh turun = jarak harga jual aktual ke harga impas. Pakan boleh naik = laba / biaya pakan.",
    note: "Semakin kecil persentasenya, semakin dekat kandang ke posisi rugi.",
  },
  costBreakdown: {
    title: "Breakdown biaya",
    source: "Biaya pakan, rak, gaji, dan biaya lain.",
    formula: "Persentase setiap kategori = nilai kategori / total biaya x 100.",
    note: "Membantu melihat biaya mana yang paling dominan.",
  },
  forecast: {
    title: "Forecast dan action plan",
    source: "Rata-rata laba harian pada periode terpilih dan risiko tiap kandang.",
    formula: "Prediksi 7/30 hari = rata-rata laba harian x 7 atau x 30. Urutan tindakan dimulai dari kandang dengan risiko tertinggi.",
    note: "Forecast mengikuti pola periode terpilih, jadi makin rapi data harian, makin berguna hasilnya.",
  },
  kandangInsight: {
    title: "Insight kandang",
    source: "Uang masuk, uang keluar, margin, efisiensi pakan, biaya per kg, dan produksi tiap kandang.",
    formula: "Level risiko naik jika belum ada pendapatan, belum ada produksi, laba negatif, margin rendah, atau pakan kurang efisien.",
    note: "Root cause menampilkan penyebab dominan seperti defisit, margin rendah, FCR tinggi, atau pakan dominan.",
  },
  kandangTable: {
    title: "Detail kandang",
    source: "Ringkasan data keuangan dan produksi per kandang pada periode terpilih.",
    formula: "Setiap kandang dihitung dengan cara yang sama: pendapatan, biaya, laba, margin, efisiensi pakan, dan level risiko.",
    note: "Gunakan tabel ini untuk membandingkan kandang secara cepat.",
  },
};

function HelpCard({ children, onHelp }: { children: ReactNode; onHelp: () => void }) {
  return (
    <div className="relative min-w-0">
      {children}
      <HelpButton onClick={onHelp} className="absolute right-3 top-3" />
    </div>
  );
}

function HelpButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Lihat perhitungan"
      title="Lihat perhitungan"
      className={`grid h-8 w-8 place-items-center rounded-full border border-emerald-950/10 bg-white/90 text-[#0f7963] shadow-sm transition hover:bg-emerald-50 ${className}`}
    >
      <Info className="h-4 w-4" />
    </button>
  );
}

function FinanceHelpDialog({ helpKey, onClose }: { helpKey: FinanceHelpKey | null; onClose: () => void }) {
  if (!helpKey) return null;

  const item = financeHelp[helpKey];

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[26px] border border-white/80 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f7963]">Perhitungan</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">{item.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
          <div className="rounded-2xl bg-[#f6fbf8] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sumber data</p>
            <p className="mt-1 font-medium text-slate-900">{item.source}</p>
          </div>
          <div className="rounded-2xl bg-[#f6fbf8] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rumus</p>
            <p className="mt-1 font-medium text-slate-900">{item.formula}</p>
          </div>
          <p>{item.note}</p>
        </div>
      </div>
    </div>
  );
}

function CashFlowTrend({ points, loading, onHelp }: { points: FinanceTrendPoint[]; loading: boolean; onHelp: () => void }) {
  const displayPoints = points.length > 0 ? points : Array.from({ length: 7 }, (_, index) => ({
    tanggal: String(index + 1),
    cash_in: 0,
    cash_out: 0,
    net_cash: 0,
  }));
  const maxValue = Math.max(...displayPoints.map((point) => Math.max(Math.abs(Number(point.cash_in ?? 0)), Math.abs(Number(point.cash_out ?? 0)), Math.abs(Number(point.net_cash ?? 0)))), 1);

  return (
    <div className="min-w-0 overflow-hidden rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950">Optimasi Laba</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Pendapatan, biaya, dan laba per hari.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HelpButton onClick={onHelp} />
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-[#0f7963]">
            <Calculator className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] px-4 py-5">
        <div
          className="grid min-w-full items-end gap-3"
          style={{
            gridTemplateColumns: `repeat(${displayPoints.length}, minmax(56px, 1fr))`,
            minWidth: `${displayPoints.length * 64}px`,
          }}
        >
          {displayPoints.map((point, index) => {
            const cashInHeight = Math.max(8, (Math.abs(Number(point.cash_in ?? 0)) / maxValue) * 112);
            const cashOutHeight = Math.max(8, (Math.abs(Number(point.cash_out ?? 0)) / maxValue) * 112);
            const netPositive = Number(point.net_cash ?? 0) >= 0;

            return (
              <div key={`${point.tanggal}-${index}`} className="flex min-w-0 flex-col items-center gap-2">
                <div className="flex h-32 items-end gap-1">
                  <div className="w-4 rounded-t-lg bg-[#0f7963]" style={{ height: `${cashInHeight}px` }} title={`Pendapatan ${formatCurrency(Number(point.cash_in ?? 0))}`} />
                  <div className="w-4 rounded-t-lg bg-[#d8d06c]" style={{ height: `${cashOutHeight}px` }} title={`Biaya ${formatCurrency(Number(point.cash_out ?? 0))}`} />
                </div>
                <span className={["rounded-full px-2 py-1 text-[10px] font-semibold", netPositive ? "bg-emerald-50 text-[#0f7963]" : "bg-rose-50 text-rose-700"].join(" ")}>
                  {formatCurrency(Number(point.net_cash ?? 0))}
                </span>
                <span className="text-[11px] font-medium text-slate-500">{formatDateLabel(point.tanggal)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#0f7963]" /> Pendapatan</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#d8d06c]" /> Biaya</span>
        {loading ? <span>Memuat data...</span> : null}
      </div>
    </div>
  );
}

function FinanceHealthPanel({
  score,
  status,
  margin,
  costRatio,
  fcr,
  productionKg,
  onHelp,
}: {
  score: number;
  status: string;
  margin?: number | null;
  costRatio?: number | null;
  fcr?: number | null;
  productionKg: number;
  onHelp: () => void;
}) {
  const width = Math.max(0, Math.min(100, score));

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Financial Sustainability</h3>
          <p className="mt-1 text-sm text-slate-500">Skor dari laba, margin, rasio biaya, dan FCR.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HelpButton onClick={onHelp} />
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-[#0f7963]">
            <Lightbulb className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Health score</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">{formatNumber(score)}</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0f7963]">{status}</span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-[#0f7963]" style={{ width: `${width}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetric label="Profit margin" value={`${formatOptionalNumber(margin, 2)}%`} />
        <FinanceMetric label="Cost ratio" value={`${formatOptionalNumber(costRatio, 2)}%`} />
        <FinanceMetric label="FCR" value={formatOptionalNumber(fcr, 3)} />
        <FinanceMetric label="Produksi" value={`${formatNumber(productionKg, 2)} kg`} />
      </div>
    </div>
  );
}

function FinanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-950/5 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CostBreakdownPanel({ categories, onHelp }: { categories: FinanceCategory[]; onHelp: () => void }) {
  const total = categories.reduce((sum, item) => sum + Number(item.value ?? 0), 0);

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Breakdown Biaya</h3>
          <p className="mt-1 text-sm text-slate-500">Porsi pengeluaran dari data pakan dan operasional.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HelpButton onClick={onHelp} />
          <Package2 className="h-5 w-5 text-[#0f7963]" />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {(categories.length > 0 ? categories : [{ label: "Belum ada biaya", value: 0 }]).map((item) => {
          const percent = total > 0 ? (Number(item.value ?? 0) / total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="font-semibold text-slate-950">{formatCurrency(Number(item.value ?? 0))}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-emerald-50">
                <div className="h-full rounded-full bg-[#0f7963]" style={{ width: `${Math.max(3, percent)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BreakEvenPanel({
  breakEven,
  summary,
  comparison,
  benchmark,
  onHelp,
}: {
  breakEven: FinanceData["break_even"];
  summary: NonNullable<FinanceData["summary"]>;
  comparison: FinanceData["comparison"];
  benchmark: FinanceData["benchmark"];
  onHelp: () => void;
}) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Break-even dan Efisiensi</h3>
          <p className="mt-1 text-sm text-slate-500">Titik impas dan biaya per kg telur dari data periode ini.</p>
        </div>
        <HelpButton onClick={onHelp} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <FinanceMetric label="Harga impas/kg" value={formatOptionalCurrency(breakEven?.price_per_kg)} />
        <FinanceMetric label="Harga aktual/kg" value={formatOptionalCurrency(summary.avg_price_per_kg)} />
        <FinanceMetric label="Biaya/kg telur" value={formatOptionalCurrency(summary.cost_per_kg)} />
        <FinanceMetric label="Profit/kg telur" value={formatOptionalCurrency(summary.profit_per_kg)} />
        <FinanceMetric label="Gap harga/kg" value={formatOptionalCurrency(breakEven?.price_gap_per_kg)} />
        <FinanceMetric label="Gap produksi" value={`${formatOptionalNumber(breakEven?.production_gap_kg, 2)} kg`} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <FinanceMetric label="Pendapatan vs lalu" value={formatOptionalSignedPercent(comparison?.cash_in_pct)} />
        <FinanceMetric label="Biaya vs lalu" value={formatOptionalSignedPercent(comparison?.cash_out_pct)} />
        <FinanceMetric label="Laba vs lalu" value={formatOptionalSignedPercent(comparison?.net_cash_pct)} />
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Benchmark</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {benchmark?.best_cost_kandang?.nama_kandang
            ? `${benchmark.best_cost_kandang.nama_kandang} paling efisien di biaya/kg (${formatOptionalCurrency(benchmark.best_cost_kandang.cost_per_kg)}).`
            : "Belum ada benchmark biaya karena produksi belum cukup."}
          {benchmark?.best_margin_kandang?.nama_kandang
            ? ` Margin terbaik: ${benchmark.best_margin_kandang.nama_kandang} (${formatOptionalNumber(benchmark.best_margin_kandang.margin_pct, 2)}%).`
            : ""}
        </p>
      </div>
    </div>
  );
}

function SensitivityPanel({ sensitivity, onHelp }: { sensitivity: FinanceData["sensitivity"]; onHelp: () => void }) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Sensitivity Check</h3>
          <p className="mt-1 text-sm text-slate-500">Dampak jika pakan naik atau harga jual turun.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HelpButton onClick={onHelp} />
          <AlertTriangle className="h-5 w-5 text-[#0f7963]" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SensitivityList title="Harga pakan naik" rows={sensitivity?.feed_price ?? []} suffix="naik" />
        <SensitivityList title="Harga jual turun" rows={sensitivity?.selling_price ?? []} suffix="berubah" />
      </div>
    </div>
  );
}

function SafetyBufferPanel({ buffer, onHelp }: { buffer: FinanceSafetyBuffer; onHelp: () => void }) {
  const level = buffer.level ?? "empty";
  const tone = level === "safe" ? "text-[#0f7963] bg-emerald-50 border-emerald-100" : level === "thin" ? "text-amber-800 bg-amber-50 border-amber-100" : "text-rose-800 bg-rose-50 border-rose-100";

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Batas Aman Sebelum Rugi</h3>
          <p className="mt-1 text-sm text-slate-500">Jarak aman produksi, harga jual, dan pakan sebelum menyentuh titik rugi.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HelpButton onClick={onHelp} />
          <ShieldUser className="h-5 w-5 text-[#0f7963]" />
        </div>
      </div>

      <div className={`mt-5 rounded-2xl border px-4 py-4 ${tone}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">Status</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{buffer.status ?? "Belum ada data"}</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{buffer.text ?? "Data belum cukup untuk menghitung batas aman sebelum rugi."}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <FinanceMetric label="Produksi boleh turun" value={`${formatOptionalNumber(buffer.production_drop_pct ?? null, 1)}%`} />
        <FinanceMetric label="Harga jual boleh turun" value={`${formatOptionalNumber(buffer.price_drop_pct ?? null, 1)}%`} />
        <FinanceMetric label="Pakan boleh naik" value={`${formatOptionalNumber(buffer.feed_cost_increase_pct ?? null, 1)}%`} />
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] px-4 py-3">
        <FinanceRow label="Laba saat ini" value={formatCurrency(Number(buffer.cash_buffer ?? 0))} />
      </div>
    </div>
  );
}

function SensitivityList({ title, rows, suffix }: { title: string; rows: FinanceSensitivityPoint[]; suffix: string }) {
  return (
    <div className="rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-3 space-y-2">
        {(rows.length > 0 ? rows : [{ change_pct: 0, net_cash: 0, margin_pct: null }]).map((row) => (
          <div key={`${title}-${row.change_pct}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
            <span className="font-medium text-slate-600">{formatSignedPercent(row.change_pct)} {suffix}</span>
            <span className={["text-right font-semibold", Number(row.net_cash ?? 0) >= 0 ? "text-[#0f7963]" : "text-rose-700"].join(" ")}>
              {formatCurrency(Number(row.net_cash ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastPanel({ forecast, recommendations, actionPlan, onHelp }: { forecast: FinanceData["forecast"]; recommendations: InsightMessage[]; actionPlan: FinanceAction[]; onHelp: () => void }) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Forecast dan Action Plan</h3>
          <p className="mt-1 text-sm text-slate-500">Proyeksi sederhana dari rata-rata periode terpilih.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HelpButton onClick={onHelp} />
          <TrendingUp className="h-5 w-5 text-[#0f7963]" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <FinanceMetric label="Laba 7 hari" value={formatCurrency(Number(forecast?.net_cash_7_days ?? 0))} />
        <FinanceMetric label="Laba 30 hari" value={formatCurrency(Number(forecast?.net_cash_30_days ?? 0))} />
        <FinanceMetric label="Pendapatan 30 hari" value={formatCurrency(Number(forecast?.cash_in_30_days ?? 0))} />
        <FinanceMetric label="Biaya 30 hari" value={formatCurrency(Number(forecast?.cash_out_30_days ?? 0))} />
      </div>

      {actionPlan.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] p-4">
          <p className="text-sm font-semibold text-slate-950">Prioritized Action Plan</p>
          <div className="mt-3 space-y-3">
            {actionPlan.map((item) => (
              <div key={`${item.priority}-${item.title}`} className="flex gap-3 rounded-xl bg-white px-3 py-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0f7963] text-xs font-semibold text-white">{item.priority}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {recommendations.map((item) => (
          <div key={`${item.title}-${item.text}`} className={["rounded-2xl border px-4 py-3", item.tone === "rose" ? "border-rose-100 bg-rose-50" : item.tone === "amber" ? "border-amber-100 bg-amber-50" : "border-emerald-100 bg-emerald-50"].join(" ")}>
            <p className={["text-sm font-semibold", item.tone === "rose" ? "text-rose-800" : item.tone === "amber" ? "text-amber-800" : "text-[#0f7963]"].join(" ")}>{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceKandangPanel({ title, row, emptyText, onHelp }: { title: string; row?: FinanceKandangRow; emptyText: string; onHelp: () => void }) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{row ? row.status : emptyText}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HelpButton onClick={onHelp} />
          <Warehouse className="h-5 w-5 text-[#0f7963]" />
        </div>
      </div>
      {row ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <FinanceMetric label="Kandang" value={row.nama_kandang} />
          <FinanceMetric label="Laba" value={formatCurrency(Number(row.net_cash ?? 0))} />
          <FinanceMetric label="Margin" value={`${formatOptionalNumber(row.margin_pct ?? null, 2)}%`} />
          <FinanceMetric label="FCR" value={formatOptionalNumber(row.fcr ?? null, 3)} />
          <FinanceMetric label="Risk level" value={row.risk_level ?? "N/A"} />
          <FinanceMetric label="Biaya/kg" value={formatOptionalCurrency(row.cost_per_kg ?? null)} />
        </div>
      ) : null}
      {row?.root_causes?.length ? (
        <div className="mt-4 space-y-2">
          {row.root_causes.map((cause) => (
            <div key={`${row.id_kandang}-${cause.title}`} className="rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{cause.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{cause.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FinanceTable({ rows, onHelp }: { rows: FinanceKandangRow[]; onHelp: () => void }) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Detail Kandang</h3>
          <p className="mt-1 text-sm text-slate-500">Perbandingan laba dan sustainability per kandang.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HelpButton onClick={onHelp} />
          <Scale className="h-5 w-5 text-[#0f7963]" />
        </div>
      </div>

      <div className="mt-5 space-y-3 md:hidden">
        {rows.length > 0 ? rows.map((row) => (
          <div key={String(row.id_kandang)} className="rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{row.nama_kandang}</p>
                <p className="mt-1 text-sm text-slate-500">{row.risk_level ?? row.status}</p>
              </div>
              <span className={["text-right text-sm font-semibold", Number(row.net_cash ?? 0) >= 0 ? "text-[#0f7963]" : "text-rose-700"].join(" ")}>
                {formatCurrency(Number(row.net_cash ?? 0))}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <FinanceRow label="Pendapatan" value={formatCurrency(Number(row.cash_in ?? 0))} />
              <FinanceRow label="Biaya" value={formatCurrency(Number(row.cash_out ?? 0))} />
              <FinanceRow label="Margin" value={`${formatOptionalNumber(row.margin_pct ?? null, 2)}%`} />
              <FinanceRow label="Produksi" value={`${formatNumber(Number(row.production_kg ?? 0), 2)} kg`} />
              <FinanceRow label="Biaya/kg" value={formatOptionalCurrency(row.cost_per_kg ?? null)} />
              <FinanceRow label="Root cause" value={row.root_causes?.[0]?.title ?? "-"} />
            </div>
          </div>
        )) : (
          <div className="grid place-items-center px-4 py-12 text-center text-sm text-slate-500">Belum ada data finance pada periode ini.</div>
        )}
      </div>

      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-emerald-950/5 md:block">
        <div className="grid min-w-[920px] grid-cols-7 bg-[#f3fbf5] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>Kandang</span>
          <span className="text-right">Pendapatan</span>
          <span className="text-right">Biaya</span>
          <span className="text-right">Laba</span>
          <span className="text-right">Margin</span>
          <span className="text-right">FCR</span>
          <span className="text-right">Status</span>
        </div>
        {rows.length > 0 ? rows.map((row) => (
          <div key={String(row.id_kandang)} className="grid min-w-[920px] grid-cols-7 border-t border-emerald-950/5 px-4 py-4 text-sm">
            <span className="font-semibold text-slate-900">{row.nama_kandang}</span>
            <span className="text-right text-slate-700">{formatCurrency(Number(row.cash_in ?? 0))}</span>
            <span className="text-right text-slate-700">{formatCurrency(Number(row.cash_out ?? 0))}</span>
            <span className={["text-right font-semibold", Number(row.net_cash ?? 0) >= 0 ? "text-[#0f7963]" : "text-rose-700"].join(" ")}>{formatCurrency(Number(row.net_cash ?? 0))}</span>
            <span className="text-right text-slate-700">{formatOptionalNumber(row.margin_pct ?? null, 2)}%</span>
            <span className="text-right text-slate-700">{formatOptionalNumber(row.fcr ?? null, 3)}</span>
          <span className="text-right font-medium text-slate-700">{row.risk_level ?? row.status}</span>
          </div>
        )) : (
          <div className="grid place-items-center px-4 py-12 text-center text-sm text-slate-500">Belum ada data finance pada periode ini.</div>
        )}
      </div>
    </div>
  );
}

function FinanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
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
  const [kpiMode, setKpiMode] = useState("month");
  const [singleDate, setSingleDate] = useState(today.toISOString().slice(0, 10));
  const [rangeStart, setRangeStart] = useState(today.toISOString().slice(0, 10));
  const [rangeEnd, setRangeEnd] = useState(today.toISOString().slice(0, 10));
  const [result, setResult] = useState<KpiResult | null>(null);
  const [autoInsight, setAutoInsight] = useState<FarmInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [infoKandang, setInfoKandang] = useState<KandangInsight | null>(null);
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
    if (!ready) return;

    const loadInsight = async () => {
      setInsightLoading(true);
      try {
        const data = await apiGet<{ data?: FarmInsight }>(`${getApiBase()}/insights/prediksi`, token);
        setAutoInsight(data?.data ?? null);
      } catch {
        setAutoInsight(null);
      } finally {
        setInsightLoading(false);
      }
    };

    void loadInsight();
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
      const params = new URLSearchParams({
        id_kandang: selected,
        mode: kpiMode,
        bulan: month,
        tahun: year,
      });
      if (selectedPeriod) params.set("id_periode", selectedPeriod);
      if (kpiMode === "day") params.set("tanggal", singleDate);
      if (kpiMode === "range") {
        params.set("tanggal_mulai", rangeStart);
        params.set("tanggal_selesai", rangeEnd);
      }
      const data = await apiGet<KpiResult>(`${getApiBase()}/fcr/periode?${params.toString()}`, token);
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
  const selectedKandangOption = kandangOptions.find((item) => String(item.id_kandang) === selected) ?? null;
  const selectedKandangName = result?.nama_kandang ?? selectedKandangOption?.nama_kandang ?? "";
  const selectedKandangOwnerName = result?.primary_owner_name ?? selectedKandangOption?.primary_owner_name ?? "";
  const selectedPeriodLabel = periodeOptions.find((item) => String(item.id_periode) === selectedPeriod)?.label ?? result?.nama_periode ?? "";
  const resultRangeLabel = result?.periode?.mulai && result?.periode?.sampai ? `${result.periode.mulai} s/d ${result.periode.sampai}` : "-";

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
  const periodDays = Math.max(1, Number(result?.periode?.hari ?? 0) || 1);
  const avgProductionPerDay = totalProduksi > 0 ? totalProduksi / periodDays : 0;
  const avgFeedPerDay = totalPakan > 0 ? totalPakan / periodDays : 0;
  const avgProfitPerDay = profit !== 0 ? profit / periodDays : 0;
  const projectedProduction7Days = avgProductionPerDay * 7;
  const projectedFeed7Days = avgFeedPerDay * 7;
  const projectedProfit7Days = avgProfitPerDay * 7;
  const productionPerHenKg = activeBirds > 0 ? totalProduksi / activeBirds : 0;
  const breakEvenGap = totalTelurButir > 0 && kpi.bep_egg_count ? totalTelurButir - kpi.bep_egg_count : null;
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      100
        - Math.max(0, (Number(kpi.fcr ?? 0) - 2.4) * 18)
        - Math.max(0, (Number(kpi.mortality_pct ?? 0) - 3) * 6)
        - Math.max(0, 20 - Number(kpi.profit_margin_pct ?? 0)) * 0.8
        - (totalProduksi <= 0 ? 18 : 0)
    )
  );
  const healthStatus = healthScore >= 80 ? "Sehat" : healthScore >= 60 ? "Perlu dipantau" : "Perlu tindakan";
  const autoPredictions = autoInsight?.predictions;
  const autoHealth = autoInsight?.health;
  const autoSummary = autoInsight?.summary;
  const autoTrend = autoPredictions?.production_trend_pct;
  const analysisDays = autoSummary?.analysis_days ?? 30;
  const analysisRangeLabel = autoSummary?.analysis_start && autoSummary?.analysis_end
    ? `${autoSummary.analysis_start} s/d ${autoSummary.analysis_end}`
    : "";
  const earlyWarning = autoInsight?.early_warning;
  const riskKandang = autoInsight?.kandang_rankings?.risk ?? [];
  const championKandang = autoInsight?.kandang_rankings?.champion ?? [];
  const rootCauses = autoInsight?.root_causes ?? [];
  const insightItems = [
    {
      icon: Egg,
      label: "Prediksi Produksi 7 Hari",
      value: autoPredictions?.production_7_days_kg ? `${formatNumber(autoPredictions.production_7_days_kg, 2)} kg` : (totalProduksi > 0 ? `${formatNumber(projectedProduction7Days, 2)} kg` : "N/A"),
      note: autoPredictions?.production_daily_kg
        ? `Otomatis dari semua kandang: rata-rata ${formatNumber(autoPredictions.production_daily_kg, 2)} kg/hari${autoTrend !== null && autoTrend !== undefined ? `, tren ${formatSignedPercent(autoTrend)}` : ""}.`
        : (totalProduksi > 0 ? `Rata-rata ${formatNumber(avgProductionPerDay, 2)} kg/hari dari ${formatNumber(periodDays)} hari KPI.` : "Data produksi belum cukup untuk diproyeksikan."),
    },
    {
      icon: Package2,
      label: "Estimasi Pakan 7 Hari",
      value: autoPredictions?.feed_7_days_kg ? `${formatNumber(autoPredictions.feed_7_days_kg, 2)} kg` : (totalPakan > 0 ? `${formatNumber(projectedFeed7Days, 2)} kg` : "N/A"),
      note: autoPredictions?.feed_daily_kg
        ? `Otomatis dari pemakaian ${formatNumber(analysisDays, 0)} hari: ${formatNumber(autoPredictions.feed_daily_kg, 2)} kg/hari.`
        : (totalPakan > 0 ? `Rata-rata pemakaian ${formatNumber(avgFeedPerDay, 2)} kg/hari.` : "Data pakan belum cukup untuk diproyeksikan."),
    },
    {
      icon: CircleDollarSign,
      label: "Proyeksi Profit 7 Hari",
      value: autoPredictions?.profit_7_days_rp ? formatCurrency(autoPredictions.profit_7_days_rp) : (profit !== 0 ? formatCurrency(projectedProfit7Days) : "N/A"),
      note: autoPredictions?.profit_30_days_rp !== undefined
        ? `Estimasi bulan berjalan ${formatCurrency(autoPredictions.profit_30_days_rp)} jika tren tetap.`
        : (profit !== 0 ? `Berdasarkan profit rata-rata ${formatCurrency(avgProfitPerDay)} per hari.` : "Profit belum terbentuk pada range ini."),
    },
    {
      icon: TrendingUp,
      label: "Skor Kandang",
      value: autoHealth?.score !== undefined ? `${formatNumber(autoHealth.score, 0)}/100` : (result ? `${formatNumber(healthScore, 0)}/100` : "N/A"),
      note: autoHealth?.status
        ? `${autoHealth.status}. Dinilai otomatis dari ${formatNumber(autoSummary?.kandang_count ?? 0)} kandang, FCR, mortalitas, profit, dan tren.`
        : (result ? `${healthStatus}. Dinilai dari FCR, mortalitas, margin, dan produksi.` : "Data belum cukup untuk membuat skor."),
    },
  ];
  const autoRecommendationItems = [
    ...(autoInsight?.anomalies ?? []),
    ...(autoInsight?.recommendations ?? []),
  ];
  const recommendationItems = autoRecommendationItems.length > 0 ? autoRecommendationItems : (result ? [
    ...(Number(kpi.fcr ?? 0) > 2.4 ? [{ tone: "amber", title: "FCR mulai tinggi", text: `FCR ${formatOptionalNumber(kpi.fcr ?? null, 3)}. Cek konsistensi pakan, bobot telur, dan data produksi harian.` }] : []),
    ...(Number(kpi.mortality_pct ?? 0) > 3 ? [{ tone: "rose", title: "Mortalitas perlu perhatian", text: `Mortalitas ${formatOptionalNumber(kpi.mortality_pct ?? null, 2)}%. Periksa kondisi kandang, kepadatan, dan catatan kematian terbaru.` }] : []),
    ...(Number(kpi.profit_margin_pct ?? 0) < 15 && totalPendapatanRp > 0 ? [{ tone: "amber", title: "Margin tipis", text: `Margin ${formatOptionalNumber(kpi.profit_margin_pct ?? null, 2)}%. Evaluasi biaya pakan, biaya operasional, dan efisiensi produksi.` }] : []),
    ...(breakEvenGap !== null && breakEvenGap < 0 ? [{ tone: "rose", title: "Belum melewati BEP", text: `Produksi masih kurang sekitar ${formatNumber(Math.abs(breakEvenGap), 0)} butir dari titik impas.` }] : []),
    ...(productionPerHenKg > 0 && productionPerHenKg < 0.6 ? [{ tone: "amber", title: "Produksi per ekor rendah", text: `Produksi sekitar ${formatNumber(productionPerHenKg, 3)} kg/ekor pada range ini. Pantau umur periode dan pola pakan.` }] : []),
    ...(healthScore >= 80 ? [{ tone: "green", title: "Kandang stabil", text: `Indikator utama masih baik. Pertahankan pencatatan harian agar tren cepat terbaca.` }] : []),
  ] : [
    { tone: "green", title: "Insight otomatis", text: insightLoading ? "Sedang memuat prediksi dan saran dari semua kandang." : "Data otomatis belum tersedia. Pastikan API aktif dan data harian sudah tercatat." },
  ]);
  const displayedRecommendations = recommendationItems.length > 0 ? recommendationItems.slice(0, 4) : [
    { tone: "green", title: "Tidak ada alarm utama", text: "KPI pada range ini belum menunjukkan risiko besar. Tetap pantau produksi, pakan, dan kematian harian." },
  ];
  const warningTone = earlyWarning?.level === "tindakan" ? "rose" : earlyWarning?.level === "pantau" ? "amber" : "green";

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
      title: "KPI Finansial",
      description: "Pendapatan, biaya, dan titik impas.",
      items: [
        { label: "Cost per Egg", value: formatOptionalCurrency(kpi.cost_per_egg_rp ?? null), note: `Rp ${formatNumber(totalBiaya, 0)} ÷ ${formatNumber(totalTelurButir, 0)} butir` },
        { label: "Revenue per Egg", value: formatOptionalCurrency(kpi.revenue_per_egg_rp ?? null), note: `Rp ${formatNumber(totalPendapatanRp, 0)} ÷ ${formatNumber(totalTelurButir, 0)} butir` },
        { label: "Profit Margin", value: kpi.profit_margin_pct !== null && kpi.profit_margin_pct !== undefined ? `${formatOptionalNumber(kpi.profit_margin_pct, 2)}%` : "N/A", note: `(${formatOptionalCurrency(profit)} ÷ ${formatOptionalCurrency(totalPendapatanRp)}) × 100%` },
        { label: "BEP", value: kpi.bep_egg_count !== null && kpi.bep_egg_count !== undefined ? `${formatOptionalNumber(kpi.bep_egg_count, 2)} butir` : "N/A", note: `Rp ${formatNumber(totalBiaya, 0)} ÷ ${formatOptionalCurrency(kpi.revenue_per_egg_rp ?? null)}` },
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="KPI Kandang" description="Pilih kandang dan periode ayam, lalu lihat KPI produksi, pakan, kesehatan, dan finansial." />

      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Prediksi & Saran</h3>
            <p className="mt-1 text-sm text-slate-500">
              Ringkasan otomatis dari produksi, pakan, biaya, profit, FCR, dan mortalitas{analysisRangeLabel ? ` (${analysisRangeLabel}, sampai kemarin)` : ""}.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0f7963]">
            <Lightbulb className="h-4 w-4" />
            Insight KPI
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {insightItems.map((item) => (
            <div key={item.label} className="rounded-[22px] border border-emerald-950/10 bg-[#fbfdfb] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#0f7963]">
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-950">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {displayedRecommendations.map((item) => (
            <div
              key={item.title}
              className={[
                "flex gap-3 rounded-[22px] border p-4",
                item.tone === "rose"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : item.tone === "amber"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-950",
              ].join(" ")}
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm leading-6 opacity-80">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
          <div
            className={[
              "rounded-[22px] border p-4",
              warningTone === "rose"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : warningTone === "amber"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950",
            ].join(" ")}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">Early Warning</p>
            <p className="mt-2 text-2xl font-semibold">{earlyWarning?.label ?? (insightLoading ? "Memuat" : "Belum ada data")}</p>
            <p className="mt-2 text-sm leading-6 opacity-80">{earlyWarning?.text ?? "Prediksi otomatis akan muncul setelah data dari API tersedia."}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[22px] border border-emerald-950/10 bg-[#fbfdfb] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Kandang Prioritas</p>
                  <p className="mt-1 text-sm text-slate-500">Urutan kandang yang perlu dicek lebih dulu.</p>
                </div>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{riskKandang.length} risiko</span>
              </div>
              <div className="mt-4 space-y-3">
                {riskKandang.length > 0 ? riskKandang.slice(0, 3).map((item) => (
                  <div key={`risk-${item.id_kandang}`} className="rounded-2xl bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{item.nama_kandang}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          FCR {formatOptionalNumber(item.metrics?.fcr_30_days ?? null, 3)} · Tren {item.metrics?.production_trend_pct !== null && item.metrics?.production_trend_pct !== undefined ? formatSignedPercent(item.metrics.production_trend_pct) : "N/A"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Skor {formatNumber(item.health?.score ?? 0, 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInfoKandang(item)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                          aria-label={`Lihat penjelasan ${item.nama_kandang}`}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.suggestion?.text ?? "Cek data produksi, pakan, dan kematian harian."}</p>
                  </div>
                )) : (
                  <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">Belum ada kandang prioritas.</p>
                )}
              </div>
            </div>

            <div className="rounded-[22px] border border-emerald-950/10 bg-[#fbfdfb] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Kandang Champion</p>
                  <p className="mt-1 text-sm text-slate-500">Pembanding untuk pola kandang yang lebih efisien.</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0f7963]">{championKandang.length} baik</span>
              </div>
              <div className="mt-4 space-y-3">
                {championKandang.length > 0 ? championKandang.slice(0, 3).map((item) => (
                  <div key={`champion-${item.id_kandang}`} className="rounded-2xl bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{item.nama_kandang}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Produksi 7 hari {formatNumber(item.metrics?.production_7_days_kg ?? 0, 2)} kg · FCR {formatOptionalNumber(item.metrics?.fcr_30_days ?? null, 3)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0f7963]">
                          Skor {formatNumber(item.health?.score ?? 0, 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInfoKandang(item)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                          aria-label={`Lihat penjelasan ${item.nama_kandang}`}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.suggestion?.text ?? "Pakai sebagai benchmark internal."}</p>
                  </div>
                )) : (
                  <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">Belum ada kandang pembanding.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-emerald-950/10 bg-[#fbfdfb] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Dugaan Penyebab</p>
              <p className="mt-1 text-sm text-slate-500">Saran dipertimbangkan dari prediksi, tren produksi, FCR, mortalitas, dan margin.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f7963]">{rootCauses.length} sinyal</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rootCauses.length > 0 ? rootCauses.slice(0, 6).map((item, index) => (
              <div
                key={`${item.nama_kandang}-${item.title}-${index}`}
                className={[
                  "rounded-2xl border px-4 py-3",
                  item.tone === "rose"
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : item.tone === "amber"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-950",
                ].join(" ")}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{item.nama_kandang ?? "Kandang"}</p>
                <p className="mt-1 font-semibold">{item.title}</p>
                <p className="mt-1 text-sm leading-6 opacity-80">{item.text}</p>
              </div>
            )) : (
              <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">Belum ada dugaan penyebab. Data harian perlu lebih lengkap atau kondisi umum sedang stabil.</p>
            )}
          </div>
        </div>
      </div>

      {infoKandang ? (
        <KandangInsightDialog item={infoKandang} onClose={() => setInfoKandang(null)} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.82fr_1fr]">
        <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Kandang">
              <select value={selected} onChange={(event) => setSelected(event.target.value)} className="field-input">
                <option value="">Pilih kandang</option>
                {kandangOptions.map((item) => (
                  <option key={item.id_kandang} value={item.id_kandang}>
                    {formatKpiKandangOption(item)}
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
            <Field label="Mode KPI">
              <select value={kpiMode} onChange={(event) => setKpiMode(event.target.value)} className="field-input">
                <option value="day">Per 1 Hari</option>
                <option value="range">Date to Date</option>
                <option value="period">Per Periode</option>
                <option value="month">Per Bulan</option>
                <option value="year">Per Tahun</option>
              </select>
            </Field>
            {kpiMode === "day" ? (
              <Field label="Tanggal">
                <input value={singleDate} onChange={(event) => setSingleDate(event.target.value)} type="date" className="field-input" />
              </Field>
            ) : null}
            {kpiMode === "range" ? (
              <>
                <Field label="Tanggal Awal">
                  <input value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} type="date" className="field-input" />
                </Field>
                <Field label="Tanggal Akhir">
                  <input value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} type="date" className="field-input" />
                </Field>
              </>
            ) : null}
            {kpiMode === "month" ? (
              <Field label="Bulan">
                <select value={month} onChange={(event) => setMonth(event.target.value)} className="field-input">
                  {monthNames.map((item, index) => (
                    <option key={item} value={String(index + 1)}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            {(kpiMode === "month" || kpiMode === "year") ? (
              <Field label="Tahun">
                <select value={year} onChange={(event) => setYear(event.target.value)} className="field-input">
                  {Array.from({ length: 6 }, (_, index) => String(today.getFullYear() - index)).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            {kpiMode === "period" ? (
              <div className="rounded-2xl bg-[#f6fbf8] px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Range Periode</p>
                <p className="mt-1 font-semibold text-slate-900">Tanggal awal sampai sekarang/selesai</p>
              </div>
            ) : null}
          </div>
          <button onClick={() => void calculate()} type="button" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d]">
            <Calculator className="h-4 w-4" />
            Hitung KPI
          </button>
          {message ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">{message}</p> : null}
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6fbf8] px-4 py-3">
              <span>Kandang aktif</span>
              <span className="inline-flex flex-col text-right font-semibold text-slate-900">
                <span>{selectedKandangName || "-"}</span>
                {selectedKandangOwnerName ? <span className="text-xs font-medium text-slate-400">Primary: {selectedKandangOwnerName}</span> : null}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6fbf8] px-4 py-3">
              <span>Periode</span>
              <span className="text-right font-semibold text-slate-900">{selectedPeriodLabel || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6fbf8] px-4 py-3">
              <span>Range KPI</span>
              <span className="text-right font-semibold text-slate-900">{resultRangeLabel}</span>
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

function KandangInsightDialog({ item, onClose }: { item: KandangInsight; onClose: () => void }) {
  const explanation = item.explanation ?? {};
  const penalties = explanation.score?.penalties ?? {};
  const totalPenalty = Object.values(penalties).reduce((sum, value) => sum + Number(value ?? 0), 0);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start gap-4 border-b border-slate-100 p-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#0f7963]">
            <Info className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-950">Penjelasan {item.nama_kandang}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {explanation.analysis_period?.start ?? "-"} s/d {explanation.analysis_period?.end ?? "-"} · {formatNumber(explanation.analysis_period?.days ?? 0, 0)} hari · {item.health?.status ?? "N/A"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100"
            aria-label="Tutup penjelasan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(88vh-92px)] overflow-y-auto p-5">
          <div className="rounded-[22px] border border-emerald-950/10 bg-[#fbfdfb] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Kenapa muncul</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{explanation.reason ?? "Sistem menilai kandang dari produksi, pakan, FCR, mortalitas, margin, dan tren."}</p>
            {explanation.analysis_period?.note ? <p className="mt-2 text-sm leading-6 text-slate-500">{explanation.analysis_period.note}</p> : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormulaBox
              title="FCR"
              formula={explanation.fcr?.formula ?? "Total pakan ÷ total produksi telur"}
              rows={[
                ["Total pakan", `${formatNumber(explanation.fcr?.feed_kg ?? 0, 2)} kg`],
                ["Total produksi", `${formatNumber(explanation.fcr?.production_kg ?? 0, 2)} kg`],
                ["Hasil FCR", formatOptionalNumber(explanation.fcr?.result ?? null, 3)],
              ]}
            />
            <FormulaBox
              title="Tren Produksi"
              formula={explanation.trend?.formula ?? "Selisih produksi dua minggu ÷ produksi minggu sebelumnya × 100"}
              rows={[
                ["Produksi 7 hari terakhir", `${formatNumber(explanation.trend?.last_7_days_kg ?? 0, 2)} kg`],
                ["Produksi 7 hari sebelumnya", `${formatNumber(explanation.trend?.previous_7_days_kg ?? 0, 2)} kg`],
                ["Hasil tren", explanation.trend?.result_pct !== null && explanation.trend?.result_pct !== undefined ? formatSignedPercent(explanation.trend.result_pct) : "N/A"],
              ]}
            />
          </div>

          <div className="mt-4 rounded-[22px] border border-emerald-950/10 bg-[#fbfdfb] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Skor Kesehatan</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{explanation.score?.formula ?? "100 dikurangi penalti dari indikator risiko."}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryTile label="Skor awal" value={formatNumber(explanation.score?.start ?? 100, 0)} />
              <SummaryTile label="Total penalti" value={formatNumber(totalPenalty, 2)} />
              <SummaryTile label="Skor akhir" value={formatNumber(explanation.score?.result ?? item.health?.score ?? 0, 0)} />
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <ScorePenalty label="Penalti FCR" value={penalties.fcr} />
              <ScorePenalty label="Penalti mortalitas" value={penalties.mortality} />
              <ScorePenalty label="Penalti margin" value={penalties.margin} />
              <ScorePenalty label="Penalti data produksi" value={penalties.missing_production} />
              <ScorePenalty label="Penalti tren turun" value={penalties.production_trend} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormulaBox
              title="Prediksi 7 Hari"
              formula="rata-rata harian dari data valid x 7"
              rows={[
                ["Produksi", `${formatNumber(item.prediction?.production_7_days_kg ?? 0, 2)} kg`],
                ["Pakan", `${formatNumber(item.prediction?.feed_7_days_kg ?? 0, 2)} kg`],
                ["Profit", formatCurrency(item.prediction?.profit_7_days_rp ?? 0)],
              ]}
            />
            <FormulaBox
              title="Metrik Pendukung"
              formula="dipakai untuk menimbang saran"
              rows={[
                ["Mortalitas 7 hari", item.metrics?.mortality_7_days_pct !== null && item.metrics?.mortality_7_days_pct !== undefined ? `${formatNumber(item.metrics.mortality_7_days_pct, 2)}%` : "N/A"],
                ["Margin profit", item.metrics?.profit_margin_pct !== null && item.metrics?.profit_margin_pct !== undefined ? `${formatNumber(item.metrics.profit_margin_pct, 2)}%` : "N/A"],
                ["Ayam hidup", formatNumber(item.metrics?.live_birds ?? 0, 0)],
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FormulaBox({ title, formula, rows }: { title: string; formula: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-[22px] border border-emerald-950/10 bg-[#fbfdfb] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <p className="mt-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium leading-6 text-slate-700">{formula}</p>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="text-right font-semibold text-slate-950">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorePenalty({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-slate-950">-{formatNumber(value ?? 0, 2)}</span>
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
