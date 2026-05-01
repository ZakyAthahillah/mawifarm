"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getApiBase, getOwnerScopeHeaders, readApiError, readJsonResponse } from "@/components/api";
import { PageHeader, WideTablePage } from "@/components/page-shell";
import { useAuth } from "@/components/providers";
import { QrScannerPanel } from "@/components/qr-scanner";
import { Eye, PencilLine, Plus, Trash2 } from "lucide-react";

type SectionKey = "kandang" | "produksi" | "pakan" | "operasional";

type ApiRecord = Record<string, string | number | null>;
type ApiListResponse = ApiRecord[] | { data?: ApiRecord[] };

type FieldDef = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
};

type SectionConfig = {
  title: string;
  listTitle: string;
  description: string;
  listColumns: string[];
  showColumns: string[];
  createFields: FieldDef[];
  listUrl: (userName: string) => string;
  optionsUrl?: (userName: string) => string;
  createUrl: () => string;
  updateUrl: () => string;
  deleteUrl: () => string;
  recordIdField: "id" | "id_kandang";
  mapListRow: (record: ApiRecord) => string[];
  mapShowRow: (record: ApiRecord) => string[];
  rowId: (record: ApiRecord) => string | number;
  normalizePayload: (values: Record<string, string>) => Record<string, unknown>;
};

const productionWeightFields = Array.from({ length: 25 }, (_, index) => ({
  name: `berat${index + 1}`,
  label: `Berat ${index + 1}`,
  type: "number",
  placeholder: "0",
}));

const sectionConfig: Record<SectionKey, SectionConfig> = {
  kandang: {
    title: "Kandang",
    listTitle: "Kandang",
    description: "Daftar kandang yang aktif dan periode terpantau.",
    listColumns: ["Nama Kandang", "Periode Aktif", "Total Periode", "Status", "Populasi", "Ayam Hidup", "Rentang", "Aksi"],
    showColumns: ["Nama Kandang", "Kapasitas", "Periode Aktif", "Jumlah Periode", "Status", "Populasi", "Kematian", "Ayam Hidup", "Mulai", "Selesai"],
    createFields: [
      { name: "nama_kandang", label: "Nama Kandang", placeholder: "Kandang A" },
      { name: "kapasitas", label: "Kapasitas", type: "number", placeholder: "0" },
      { name: "populasi", label: "Populasi", type: "number", placeholder: "0" },
      { name: "tanggal_mulai", label: "Tanggal Mulai", type: "date" },
      { name: "tanggal_selesai", label: "Tanggal Selesai", type: "date" },
    ],
    listUrl: () => `${getApiBase()}/kandang/show`,
    optionsUrl: () => `${getApiBase()}/kandang`,
    createUrl: () => `${getApiBase()}/kandang/tambah`,
    updateUrl: () => `${getApiBase()}/kandang/edit`,
    deleteUrl: () => `${getApiBase()}/kandang/hapus`,
    recordIdField: "id_kandang",
    mapListRow: (record) => [
      String(record.nama_kandang ?? "-"),
      String(record.nama_periode ?? "-"),
      String(record.jumlah_periode ?? 0),
      String(record.status_periode ?? (record.tanggal_selesai && record.tanggal_selesai !== "-" ? "selesai" : "aktif")),
      `${formatInteger(record.populasi)} / ${formatInteger(record.kapasitas)} ekor`,
      `${formatInteger(record.ayam_sekarang)} ekor`,
      `${formatDateOnly(record.tanggal_mulai)} s/d ${formatDateOnly(record.tanggal_selesai)}`,
      "",
    ],
    mapShowRow: (record) => [
      String(record.nama_kandang ?? "-"),
      String(record.kapasitas ?? 0),
      String(record.nama_periode ?? "-"),
      String(record.jumlah_periode ?? 0),
      String(record.status_periode ?? "-"),
      String(record.populasi ?? 0),
      String(record.total_kematian ?? 0),
      String(record.ayam_sekarang ?? 0),
      formatDateOnly(record.tanggal_mulai),
      formatDateOnly(record.tanggal_selesai),
    ],
    rowId: (record) => record.id_kandang ?? record.id ?? "",
    normalizePayload: (values) => ({
      nama_kandang: values.nama_kandang,
      kapasitas: Number(values.kapasitas || 0),
      populasi: Number(values.populasi || 0),
      tanggal_mulai: values.tanggal_mulai,
      tanggal_selesai: values.tanggal_selesai || null,
    }),
  },
  produksi: {
    title: "Produksi",
    listTitle: "Produksi",
    description: "Rekap produksi harian per kandang.",
    listColumns: ["Tanggal", "Kandang", "Periode", "Total Berat", "Total Harga", "Aksi"],
    showColumns: [
      "Tanggal",
      "Kandang",
      "Periode",
      ...productionWeightFields.map((field) => field.label),
      "Harga/Kg",
      "Total Harga",
    ],
    createFields: [
      { name: "id_kandang", label: "Kandang", type: "select" },
      { name: "tanggal", label: "Tanggal", type: "date" },
      { name: "harga_per_kg", label: "Harga per Kg", type: "number", placeholder: "0" },
      ...productionWeightFields,
    ],
    listUrl: () => `${getApiBase()}/produksi`,
    optionsUrl: () => `${getApiBase()}/kandang`,
    createUrl: () => `${getApiBase()}/produksi/tambah`,
    updateUrl: () => `${getApiBase()}/produksi/edit`,
    deleteUrl: () => `${getApiBase()}/produksi/hapus`,
    recordIdField: "id",
    mapListRow: (record) => {
      const totalBerat = productionWeightFields.reduce((sum, field) => sum + Number(record[field.name] ?? 0), 0);
      const totalHarga = Number(record.total_harga ?? 0);

      return [
        formatDateOnly(record.tanggal),
        String(record.nama_kandang ?? "-"),
        String(record.nama_periode ?? "-"),
        formatDecimal(totalBerat, 1),
        `Rp ${totalHarga.toLocaleString("id-ID")}`,
        "",
      ];
    },
    mapShowRow: (record) => [
      formatDateOnly(record.tanggal),
      String(record.nama_kandang ?? "-"),
      String(record.nama_periode ?? "-"),
      ...productionWeightFields.map((field) => String(record[field.name] ?? 0)),
      String(record.harga_per_kg ?? 0),
      String(record.total_harga ?? 0),
    ],
    rowId: (record) => record.id ?? "",
    normalizePayload: (values) => {
      const totalBerat = productionWeightFields.reduce(
        (sum, field) => sum + Number(String(values[field.name] ?? "0").replace(",", ".")),
        0
      );
      const hargaPerKg = Number(String(values.harga_per_kg ?? "0").replace(",", "."));

      const payload: Record<string, unknown> = {
        id_kandang: Number(values.id_kandang || 0),
        tanggal: values.tanggal,
        harga_per_kg: hargaPerKg,
        total_harga: totalBerat * hargaPerKg,
      };

      productionWeightFields.forEach((field) => {
        payload[field.name] = Number(values[field.name] || 0);
      });

      return payload;
    },
  },
  pakan: {
    title: "Pakan",
    listTitle: "Pakan",
    description: "Pemakaian pakan yang tercatat.",
    listColumns: ["Tanggal", "Kandang", "Periode", "Kg", "Aksi"],
    showColumns: ["Tanggal", "Kandang", "Periode", "Jumlah Kg", "Harga/Kg", "Total Harga"],
    createFields: [
      { name: "id_kandang", label: "Kandang", type: "select" },
      { name: "tanggal", label: "Tanggal", type: "date" },
      { name: "jumlah_kg", label: "Jumlah Kg", type: "number", placeholder: "0" },
      { name: "harga_per_kg", label: "Harga per Kg", type: "number", placeholder: "0" },
      { name: "total_harga", label: "Total Harga", type: "number", placeholder: "0" },
    ],
    listUrl: () => `${getApiBase()}/pakan`,
    optionsUrl: () => `${getApiBase()}/kandang`,
    createUrl: () => `${getApiBase()}/pakan/tambah`,
    updateUrl: () => `${getApiBase()}/pakan/edit`,
    deleteUrl: () => `${getApiBase()}/pakan/hapus`,
    recordIdField: "id",
    mapListRow: (record) => [
      formatDateOnly(record.tanggal),
      String(record.nama_kandang ?? "-"),
      String(record.nama_periode ?? "-"),
      String(record.jumlah_kg ?? 0),
      "",
    ],
    mapShowRow: (record) => [
      formatDateOnly(record.tanggal),
      String(record.nama_kandang ?? "-"),
      String(record.nama_periode ?? "-"),
      String(record.jumlah_kg ?? 0),
      String(record.harga_per_kg ?? 0),
      String(record.total_harga ?? 0),
    ],
    rowId: (record) => record.id ?? "",
    normalizePayload: (values) => ({
      id_kandang: Number(values.id_kandang || 0),
      tanggal: values.tanggal,
      jumlah_kg: Number(values.jumlah_kg || 0),
      harga_per_kg: Number(values.harga_per_kg || 0),
      total_harga:
        Number(values.jumlah_kg || 0) * Number(values.harga_per_kg || 0),
    }),
  },
  operasional: {
    title: "Operasional",
    listTitle: "Operasional",
    description: "Biaya rak, gaji, dan lain-lain.",
    listColumns: ["Tanggal", "Kandang", "Periode", "Biaya", "Aksi"],
    showColumns: ["Tanggal", "Kandang", "Periode", "Rak", "Gaji", "Lain-lain"],
    createFields: [
      { name: "id_kandang", label: "Kandang", type: "select" },
      { name: "tanggal", label: "Tanggal", type: "date" },
      { name: "rak", label: "Rak", type: "number", placeholder: "0" },
      { name: "gaji", label: "Gaji", type: "number", placeholder: "0" },
      { name: "lain", label: "Lain-lain", type: "number", placeholder: "0" },
    ],
    listUrl: () => `${getApiBase()}/operasional`,
    optionsUrl: () => `${getApiBase()}/kandang`,
    createUrl: () => `${getApiBase()}/operasional/tambah`,
    updateUrl: () => `${getApiBase()}/operasional/edit`,
    deleteUrl: () => `${getApiBase()}/operasional/hapus`,
    recordIdField: "id",
    mapListRow: (record) => {
      const total = Number(record.rak ?? 0) + Number(record.gaji ?? 0) + Number(record.lain ?? 0);

      return [
        formatDateOnly(record.tanggal),
        String(record.nama_kandang ?? "-"),
        String(record.nama_periode ?? "-"),
        `Rp ${total.toLocaleString("id-ID")}`,
        "",
      ];
    },
    mapShowRow: (record) => [
      formatDateOnly(record.tanggal),
      String(record.nama_kandang ?? "-"),
      String(record.nama_periode ?? "-"),
      String(record.rak ?? 0),
      String(record.gaji ?? 0),
      String(record.lain ?? 0),
    ],
    rowId: (record) => record.id ?? "",
    normalizePayload: (values) => ({
      id_kandang: Number(values.id_kandang || 0),
      tanggal: values.tanggal,
      rak: Number(values.rak || 0),
      gaji: Number(values.gaji || 0),
      lain: Number(values.lain || 0),
    }),
  },
};

function fieldValue(record: ApiRecord, key: string) {
  const value = record[key];
  return value === null || value === undefined ? "" : String(value);
}

function formatDateOnly(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value).slice(0, 10);
}

function dateInputValue(value: unknown) {
  const formatted = formatDateOnly(value);
  return formatted === "-" ? "" : formatted;
}

function formatInteger(value: unknown) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDecimal(value: unknown, digits = 1) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

async function apiRequest(
  url: string,
  token?: string | null,
  options: RequestInit = {}
): Promise<Response> {
  const hasBody = options.body !== undefined && options.body !== null;

  return fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      Accept: "application/json",
      ...getOwnerScopeHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

export function SectionListView({ section }: { section: SectionKey }) {
  const { token, user, ready } = useAuth();
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kandangFilter, setKandangFilter] = useState("");
  const [tanggalFilter, setTanggalFilter] = useState("");
  const [kandangAction, setKandangAction] = useState<"periode" | "mati" | "koreksi">("periode");
  const [periodForm, setPeriodForm] = useState({
    id_kandang: "",
    nama_periode: "",
    populasi_awal: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
  });
  const [periodMessage, setPeriodMessage] = useState("");
  const [mortalityForm, setMortalityForm] = useState({ id_kandang: "", jumlah_kematian: "" });
  const [mortalityMessage, setMortalityMessage] = useState("");
  const [mortalityCorrectionForm, setMortalityCorrectionForm] = useState({ id_kandang: "", jumlah_koreksi: "" });
  const [mortalityCorrectionMessage, setMortalityCorrectionMessage] = useState("");
  const config = sectionConfig[section] ?? null;

  const loadRows = async (showLoading = true) => {
    if (!ready || !config) return;
    if (showLoading) {
      setLoading(true);
    }
    setError("");
    try {
      const response = await apiRequest(config.listUrl(user?.name ?? ""), token);
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = await readJsonResponse<ApiListResponse>(response);
      setRows(Array.isArray(data) ? data : data?.data ?? []);
    } catch (caughtError) {
      setRows([]);
      setError(caughtError instanceof Error && caughtError.message ? caughtError.message : "Tidak bisa terhubung ke API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !config) return;

    let cancelled = false;

    const loadInitialRows = async () => {
      await Promise.resolve();
      if (cancelled) return;

      setLoading(true);
      setError("");
      try {
        const response = await apiRequest(config.listUrl(user?.name ?? ""), token);
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }
        const data = await readJsonResponse<ApiListResponse>(response);
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : data?.data ?? []);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setRows([]);
          setError(caughtError instanceof Error && caughtError.message ? caughtError.message : "Tidak bisa terhubung ke API");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInitialRows();

    return () => {
      cancelled = true;
    };
  }, [config, ready, token, user?.name]);

  const kandangOptions = useMemo(() => {
    if (section !== "produksi") return [];

    return Array.from(
      new Set(
        rows
          .map((record) => String(record.nama_kandang ?? "").trim())
          .filter((value) => value.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [rows, section]);

  const filteredRows = useMemo(() => {
    if (section !== "produksi") return rows;

    return rows.filter((record) => {
      const recordKandang = String(record.nama_kandang ?? "").trim();
      const recordTanggal = formatDateOnly(record.tanggal);

      const matchKandang = kandangFilter ? recordKandang === kandangFilter : true;
      const matchTanggal = tanggalFilter ? recordTanggal === tanggalFilter : true;

      return matchKandang && matchTanggal;
    });
  }, [kandangFilter, tanggalFilter, rows, section]);

  if (!config) {
    return (
      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <p className="text-sm font-semibold text-slate-900">Menu ini belum punya konfigurasi CRUD.</p>
        <p className="mt-1 text-sm text-slate-500">Pilih menu kandang, pakan, produksi, atau operasional.</p>
      </div>
    );
  }

  const deleteRecord = async (record: ApiRecord) => {
    if (!ready || !config) return;
    const id = config.rowId(record);

    if (!window.confirm("Hapus data ini?")) return;

    try {
      await apiRequest(config.deleteUrl(), token, {
        method: "POST",
        body: JSON.stringify({ [config.recordIdField]: id }),
      });
      setRows((current) => current.filter((item) => config.rowId(item) !== id));
    } catch {
      // no-op, UI tetap sederhana
    }
  };

  const createPeriod = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || section !== "kandang") return;

    setPeriodMessage("");
    try {
      const response = await apiRequest(`${getApiBase()}/kandang/periode`, token, {
        method: "POST",
        body: JSON.stringify({
          id_kandang: Number(periodForm.id_kandang || 0),
          nama_periode: periodForm.nama_periode || undefined,
          populasi_awal: Number(periodForm.populasi_awal || 0),
          tanggal_mulai: periodForm.tanggal_mulai,
          tanggal_selesai: periodForm.tanggal_selesai || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setPeriodMessage("Periode baru berhasil dibuat.");
      setPeriodForm({ id_kandang: "", nama_periode: "", populasi_awal: "", tanggal_mulai: "", tanggal_selesai: "" });
      await loadRows(false);
    } catch (caughtError) {
      setPeriodMessage(caughtError instanceof Error && caughtError.message ? caughtError.message : "Gagal membuat periode baru.");
    }
  };

  const addMortality = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || section !== "kandang") return;

    setMortalityMessage("");
    try {
      const response = await apiRequest(`${getApiBase()}/kandang/mati`, token, {
        method: "POST",
        body: JSON.stringify({
          id_kandang: Number(mortalityForm.id_kandang || 0),
          jumlah_kematian: Number(mortalityForm.jumlah_kematian || 0),
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setMortalityMessage("Kematian ayam berhasil dicatat.");
      setMortalityForm({ id_kandang: "", jumlah_kematian: "" });
      await loadRows(false);
    } catch (caughtError) {
      setMortalityMessage(caughtError instanceof Error && caughtError.message ? caughtError.message : "Gagal mencatat kematian ayam.");
    }
  };

  const correctMortality = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || section !== "kandang") return;

    setMortalityCorrectionMessage("");
    try {
      const response = await apiRequest(`${getApiBase()}/kandang/koreksi-mati`, token, {
        method: "POST",
        body: JSON.stringify({
          id_kandang: Number(mortalityCorrectionForm.id_kandang || 0),
          jumlah_koreksi: Number(mortalityCorrectionForm.jumlah_koreksi || 0),
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setMortalityCorrectionMessage("Koreksi kematian berhasil disimpan.");
      setMortalityCorrectionForm({ id_kandang: "", jumlah_koreksi: "" });
      await loadRows(false);
    } catch (caughtError) {
      setMortalityCorrectionMessage(caughtError instanceof Error && caughtError.message ? caughtError.message : "Gagal menyimpan koreksi kematian.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[22px] border border-white/85 bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(7,46,40,0.12)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{`Data ${config.title}`}</h2>
          <p className="mt-1 text-sm text-slate-700">{config.description}</p>
        </div>
        <Link
          href={`/dashboard/${section}/create`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 text-sm font-semibold text-[#0f7963] shadow-sm transition hover:bg-emerald-50 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Input Data
        </Link>
      </div>

      <div className="rounded-[26px] border border-white/80 bg-white px-3 py-3 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:px-5 sm:py-5">
        {section === "kandang" ? (
          <div className="mb-4 rounded-[22px] border border-emerald-950/5 bg-[#f6fbf8] p-4">
            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_260px] lg:items-end">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Aksi Kandang</h3>
                <p className="text-sm text-slate-600">Kelola periode dan kematian ayam dari satu tempat.</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">Jenis Aksi</span>
                <select value={kandangAction} onChange={(event) => setKandangAction(event.target.value as "periode" | "mati" | "koreksi")} className="field-input">
                  <option value="periode">Tambah Periode</option>
                  <option value="mati">Catat Kematian</option>
                  <option value="koreksi">Batalkan Salah Input</option>
                </select>
              </label>
            </div>

            {kandangAction === "periode" ? (
              <form onSubmit={(event) => void createPeriod(event)}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Kandang</span>
                    <select value={periodForm.id_kandang} onChange={(event) => setPeriodForm((current) => ({ ...current, id_kandang: event.target.value }))} className="field-input" required>
                      <option value="">Pilih kandang</option>
                      {rows.map((record) => (
                        <option key={String(config.rowId(record))} value={String(config.rowId(record))}>
                          {String(record.nama_kandang ?? "-")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Nama Periode</span>
                    <input value={periodForm.nama_periode} onChange={(event) => setPeriodForm((current) => ({ ...current, nama_periode: event.target.value }))} className="field-input" placeholder="Periode 2" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Populasi Awal</span>
                    <input value={periodForm.populasi_awal} onChange={(event) => setPeriodForm((current) => ({ ...current, populasi_awal: event.target.value }))} type="number" className="field-input" placeholder="0" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Mulai</span>
                    <input value={periodForm.tanggal_mulai} onChange={(event) => setPeriodForm((current) => ({ ...current, tanggal_mulai: event.target.value }))} type="date" className="field-input" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Selesai</span>
                    <input value={periodForm.tanggal_selesai} onChange={(event) => setPeriodForm((current) => ({ ...current, tanggal_selesai: event.target.value }))} type="date" className="field-input" />
                  </label>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d]">
                    Buat Periode
                  </button>
                  {periodMessage ? <p className="text-sm font-semibold text-[#0f7963]">{periodMessage}</p> : null}
                </div>
              </form>
            ) : null}

            {kandangAction === "mati" ? (
              <form onSubmit={(event) => void addMortality(event)}>
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Kandang</span>
                    <select value={mortalityForm.id_kandang} onChange={(event) => setMortalityForm((current) => ({ ...current, id_kandang: event.target.value }))} className="field-input" required>
                      <option value="">Pilih kandang</option>
                      {rows.map((record) => (
                        <option key={String(config.rowId(record))} value={String(config.rowId(record))}>
                          {String(record.nama_kandang ?? "-")} - {String(record.nama_periode ?? "-")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Jumlah Mati</span>
                    <input value={mortalityForm.jumlah_kematian} onChange={(event) => setMortalityForm((current) => ({ ...current, jumlah_kematian: event.target.value }))} type="number" min="1" className="field-input" placeholder="0" required />
                  </label>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d]">
                    Simpan Kematian
                  </button>
                  {mortalityMessage ? <p className="text-sm font-semibold text-[#0f7963]">{mortalityMessage}</p> : null}
                </div>
              </form>
            ) : null}

            {kandangAction === "koreksi" ? (
              <form onSubmit={(event) => void correctMortality(event)}>
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Kandang</span>
                    <select value={mortalityCorrectionForm.id_kandang} onChange={(event) => setMortalityCorrectionForm((current) => ({ ...current, id_kandang: event.target.value }))} className="field-input" required>
                      <option value="">Pilih kandang</option>
                      {rows.map((record) => (
                        <option key={String(config.rowId(record))} value={String(config.rowId(record))}>
                          {String(record.nama_kandang ?? "-")} - {String(record.nama_periode ?? "-")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Jumlah yang Dibatalkan</span>
                    <input value={mortalityCorrectionForm.jumlah_koreksi} onChange={(event) => setMortalityCorrectionForm((current) => ({ ...current, jumlah_koreksi: event.target.value }))} type="number" min="1" className="field-input" placeholder="0" required />
                  </label>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d]">
                    Batalkan Input
                  </button>
                  {mortalityCorrectionMessage ? <p className="text-sm font-semibold text-[#0f7963]">{mortalityCorrectionMessage}</p> : null}
                </div>
              </form>
            ) : null}
          </div>
        ) : null}

        {section === "produksi" ? (
          <div className="mb-4 rounded-[22px] border border-emerald-950/5 bg-[#f6fbf8] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="block flex-1">
                <span className="mb-2 block text-sm font-medium text-slate-600">Filter Kandang</span>
                <select
                  value={kandangFilter}
                  onChange={(event) => setKandangFilter(event.target.value)}
                  className="field-input"
                >
                  <option value="">Semua kandang</option>
                  {kandangOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block flex-1">
                <span className="mb-2 block text-sm font-medium text-slate-600">Filter Tanggal</span>
                <input
                  type="date"
                  value={tanggalFilter}
                  onChange={(event) => setTanggalFilter(event.target.value)}
                  className="field-input"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setKandangFilter("");
                  setTanggalFilter("");
                }}
                className="inline-flex h-[52px] items-center justify-center rounded-2xl border border-emerald-950/10 bg-white px-4 text-sm font-semibold text-[#0f7963] transition hover:bg-emerald-50"
              >
                Reset Filter
              </button>
            </div>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Menampilkan {filteredRows.length} dari {rows.length} data
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="px-4 py-10 text-sm text-slate-500">Memuat data...</div>
        ) : error ? (
          <div className="grid place-items-center px-4 py-12 text-center">
            <div>
              <p className="text-sm font-semibold text-rose-700">Error koneksi</p>
              <p className="mt-1 text-sm text-slate-500">{error}</p>
            </div>
          </div>
        ) : filteredRows.length > 0 ? (
          <>
            <div className="space-y-3 md:hidden">
              {filteredRows.map((record) => (
                <div key={String(config.rowId(record))} className="rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] p-4">
                  <div className="space-y-2">
                    {config.mapListRow(record)
                      .slice(0, config.listColumns.length - 1)
                      .map((cell, index) => (
                        <div key={`${cell}-${index}`} className="flex items-start justify-between gap-4 text-sm">
                          <span className="text-slate-500">{config.listColumns[index]}</span>
                          <span className="text-right text-slate-700">{cell}</span>
                        </div>
                      ))}
                    <div className="flex justify-end gap-2 pt-2">
                      <Link
                        href={`/dashboard/${section}/show?id=${config.rowId(record)}`}
                        aria-label="Show"
                        title="Show"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#0f7963] ring-1 ring-emerald-950/10 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/dashboard/${section}/create?mode=edit&id=${config.rowId(record)}`}
                        aria-label="Edit"
                        title="Edit"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f7963] text-white hover:bg-[#0d6f5d]"
                      >
                        <PencilLine className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => void deleteRecord(record)}
                        aria-label="Hapus"
                        title="Hapus"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-emerald-950/5 md:block">
              <div
                className="grid bg-emerald-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"
                style={{ gridTemplateColumns: `repeat(${config.listColumns.length}, minmax(120px, 1fr))` }}
              >
                {config.listColumns.map((column, index) => (
                  <span key={column} className={index === config.listColumns.length - 1 ? "text-right" : ""}>
                    {column}
                  </span>
                ))}
              </div>

              {filteredRows.map((record) => (
                <div
                  key={String(config.rowId(record))}
                  className="grid border-t border-emerald-950/5 px-4 py-4 text-sm"
                  style={{ gridTemplateColumns: `repeat(${config.listColumns.length}, minmax(120px, 1fr))` }}
                >
                  {config.mapListRow(record)
                    .slice(0, config.listColumns.length - 1)
                    .map((cell, index) => (
                      <span key={`${cell}-${index}`} className="text-slate-700">
                        {cell}
                      </span>
                    ))}
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/${section}/show?id=${config.rowId(record)}`}
                      aria-label="Show"
                      title="Show"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#0f7963] ring-1 ring-emerald-950/10 hover:bg-emerald-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/dashboard/${section}/create?mode=edit&id=${config.rowId(record)}`}
                      aria-label="Edit"
                      title="Edit"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f7963] text-white hover:bg-[#0d6f5d]"
                    >
                      <PencilLine className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void deleteRecord(record)}
                      aria-label="Hapus"
                      title="Hapus"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid place-items-center px-4 py-12 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {section === "produksi" && (kandangFilter || tanggalFilter) ? "Tidak ada data sesuai filter" : "Belum ada data"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionCreateView({ section, mode = "create", id }: { section: SectionKey; mode?: "create" | "edit"; id?: string }) {
  const { token, ready, user } = useAuth();
  const [kandangOptions, setKandangOptions] = useState<Array<{ id_kandang: string | number; nama_kandang: string }>>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [scannerKey, setScannerKey] = useState(0);
  const config = sectionConfig[section] ?? null;

  useEffect(() => {
    if (!ready || !config) return;

    const loadKandang = async () => {
      if (!config.optionsUrl || !user?.name) {
        setKandangOptions([]);
        return;
      }

      try {
        const response = await apiRequest(config.optionsUrl(user.name), token);
        if (!response.ok) {
          throw new Error("Gagal");
        }
        const data = await readJsonResponse<Array<{ id_kandang: string | number; nama_kandang: string }> | { data?: Array<{ id_kandang: string | number; nama_kandang: string }> }>(response);
        setKandangOptions(Array.isArray(data) ? data : data?.data ?? []);
      } catch {
        setKandangOptions([]);
        setLoadError("Tidak bisa memuat pilihan kandang");
      }
    };

    void loadKandang();
  }, [config, ready, token, user?.name]);

  useEffect(() => {
    if (!ready || !id || mode !== "edit") return;

    const loadCurrent = async () => {
      try {
        const response = await apiRequest(config.listUrl(user?.name ?? ""), token);
        if (!response.ok) {
          throw new Error("Gagal");
        }
        const data = await readJsonResponse<ApiListResponse>(response);
        const list = Array.isArray(data) ? data : data?.data ?? [];
        const current = list.find((record: ApiRecord) => String(config.rowId(record)) === id);

        if (current) {
          const next: Record<string, string> = {};
          config.createFields.forEach((field) => {
            next[field.name] = field.type === "date"
              ? dateInputValue(current[field.name])
              : fieldValue(current, field.name);
          });
          setValues(next);
        }
      } catch {
        //
      }
    };

    void loadCurrent();
  }, [config, id, mode, ready, token, user?.name]);

  if (!config) {
    return (
      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <p className="text-sm font-semibold text-slate-900">Menu ini tidak mendukung input data.</p>
        <p className="mt-1 text-sm text-slate-500">Silakan buka kandang, pakan, produksi, atau operasional.</p>
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || !config) return;

    const form = event.currentTarget;
    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData(form);
      const rawValues = Object.fromEntries(
        Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
      ) as Record<string, string>;

      const missingFields: string[] = [];

      if (section === "kandang") {
        if (!rawValues.nama_kandang?.trim()) missingFields.push("Nama kandang");
        if (!rawValues.tanggal_mulai?.trim()) missingFields.push("Tanggal mulai");
      } else {
        if (!rawValues.id_kandang?.trim()) missingFields.push("Kandang");
        if (!rawValues.tanggal?.trim()) missingFields.push("Tanggal");
      }

      if (missingFields.length > 0) {
        setMessage(
          missingFields.length === 1
            ? `${missingFields[0]} harus diisi.`
            : `${missingFields.slice(0, -1).join(", ")} dan ${missingFields[missingFields.length - 1]} harus diisi.`
        );
        return;
      }

      const payload = config.normalizePayload(rawValues);
      if (mode === "edit") {
        payload[config.recordIdField] = Number(id ?? 0);
      }
      const response = await apiRequest(mode === "edit" ? config.updateUrl() : config.createUrl(), token, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan");
      }

      const data = await readJsonResponse<{ message?: string }>(response).catch(() => ({ message: "" }));
      setMessage(data?.message || "Berhasil disimpan");
      form.reset();
      setValues({});
      setScannerKey((current) => current + 1);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : "Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const isProduction = section === "produksi";
  const fillNextProductionWeight = (value: string) => {
    setValues((current) => {
      const target = productionWeightFields.find((field) => !current[field.name]);
      if (!target) return current;

      return { ...current, [target.name]: value.replace(",", ".") };
    });
  };
  const productionTotalWeight = productionWeightFields.reduce(
    (sum, field) => sum + Number(String(values[field.name] ?? "0").replace(",", ".")),
    0
  );
  const productionTotalPrice =
    productionTotalWeight * Number(String(values.harga_per_kg ?? "0").replace(",", "."));
  const feedTotalPrice =
    Number(String(values.jumlah_kg ?? "0").replace(",", ".")) *
    Number(String(values.harga_per_kg ?? "0").replace(",", "."));
  const primaryFields = isProduction
    ? config.createFields.filter((field) => !field.name.startsWith("berat"))
    : config.createFields;
  const weightFields = isProduction ? productionWeightFields : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "edit" ? `Edit ${config.title}` : `Input Data ${config.title}`}
        description={config.description}
        actions={[{ label: "Kembali", href: `/dashboard/${section}`, variant: "secondary" }]}
      />

      <form onSubmit={(event) => void submit(event)} className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:p-6">
        {loadError ? (
          <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {primaryFields.map((field) => {
            if (field.type === "select") {
              return (
                <label key={field.name} className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-600">{field.label}</span>
                  <select
                    name={field.name}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValues((current) => ({ ...current, [field.name]: e.target.value }))}
                    className="w-full rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f7963]"
                  >
                    <option value="">Pilih kandang</option>
                    {kandangOptions.map((option) => (
                      <option key={option.id_kandang} value={option.id_kandang}>
                        {option.nama_kandang}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            return (
              <label key={field.name} className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">{field.label}</span>
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  value={
                    section === "pakan" && field.name === "total_harga"
                      ? String(feedTotalPrice)
                      : values[field.name] ?? ""
                  }
                  onChange={(e) => {
                    if (field.name === "total_harga" && section === "pakan") return;
                    setValues((current) => ({ ...current, [field.name]: e.target.value }));
                  }}
                  placeholder={field.placeholder}
                  readOnly={section === "pakan" && field.name === "total_harga"}
                  className={[
                    "w-full rounded-2xl border border-emerald-950/10 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0f7963]",
                    section === "pakan" && field.name === "total_harga"
                      ? "cursor-not-allowed bg-slate-50 text-slate-700"
                      : "bg-white",
                  ].join(" ")}
                />
              </label>
            );
          })}
        </div>

        {isProduction ? (
          <>
            {mode !== "edit" ? (
              <div className="mt-5 grid gap-3 rounded-2xl bg-[#f6fbf8] p-4 md:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-600">
                    Isi dari QR/manual ke berat kosong berikutnya
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    className="field-input"
                    placeholder="Contoh: 12.5"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        fillNextProductionWeight(event.currentTarget.value);
                        event.currentTarget.value = "";
                      }
                    }}
                  />
                </label>
                <div className="grid gap-3 md:w-[300px] md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Total Kg</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {productionTotalWeight.toLocaleString("id-ID", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Total Harga</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      Rp {productionTotalPrice.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {mode !== "edit" ? (
              <div className="mt-5">
                <QrScannerPanel key={scannerKey} onScan={fillNextProductionWeight} />
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {weightFields.map((field) => (
                <label key={field.name} className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">{field.label}</span>
                  <input
                    name={field.name}
                    type="number"
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValues((current) => ({ ...current, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="field-input py-2.5"
                  />
                </label>
              ))}
            </div>
          </>
        ) : null}

        {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-[#0f7963]">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d] disabled:opacity-70"
          >
            {loading ? "Menyimpan..." : mode === "edit" ? "Update" : "Simpan"}
          </button>
          <Link
            href={`/dashboard/${section}`}
            className="rounded-2xl border border-emerald-950/10 bg-white px-5 py-3 text-sm font-semibold text-[#0f7963] transition hover:bg-emerald-50"
          >
            Kembali
          </Link>
        </div>
      </form>
    </div>
  );
}

export function SectionShowView({ section, id }: { section: SectionKey; id?: string }) {
  const { token, user, ready } = useAuth();
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const config = sectionConfig[section] ?? null;

  useEffect(() => {
    if (!ready || !config) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiRequest(config.listUrl(user?.name ?? ""), token);
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }
        const data = await readJsonResponse<ApiListResponse>(response);
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setRows(
          id ? list.filter((record: ApiRecord) => String(config.rowId(record)) === id) : list
        );
      } catch (caughtError) {
        setRows([]);
        setError(caughtError instanceof Error && caughtError.message ? caughtError.message : "Tidak bisa terhubung ke API");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [config, id, ready, token, user?.name]);

  const dataRows = useMemo(
    () => rows.map((record) => config.mapShowRow(record)),
    [config, rows]
  );

  if (!config) {
    return (
      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <p className="text-sm font-semibold text-slate-900">Menu ini tidak mendukung tampilan detail.</p>
        <p className="mt-1 text-sm text-slate-500">Gunakan menu kandang, pakan, produksi, atau operasional.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Show Data ${config.title}`}
        description="Detail data lengkap yang diambil langsung dari API."
        actions={[
          { label: "Edit", href: `/dashboard/${section}/create?mode=edit&id=${id}`, variant: "primary" },
          { label: "Kembali", href: `/dashboard/${section}`, variant: "secondary" },
        ]}
      />

      <WideTablePage
        title={`Detail ${config.title}`}
        description=""
        columns={config.showColumns}
        rows={loading ? [] : dataRows}
        emptyState={error ? "Error koneksi" : "Belum ada data"}
        emptyHint={error || ""}
      />
    </div>
  );
}
