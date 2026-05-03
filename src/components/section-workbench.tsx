"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase, getOwnerScopeHeaders, readApiError, readJsonResponse } from "@/components/api";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader, WideTablePage } from "@/components/page-shell";
import { useAuth } from "@/components/providers";
import { QrScannerPanel } from "@/components/qr-scanner";
import { Eye, FileText, PencilLine, Plus, Trash2 } from "lucide-react";

type SectionKey = "kandang" | "produksi" | "pakan" | "operasional";

type ApiRecord = Record<string, string | number | null>;
type ApiListResponse = ApiRecord[] | { data?: ApiRecord[] };

type MortalityLog = {
  id: number;
  id_kandang: number;
  nama_kandang: string;
  primary_owner_id?: number | null;
  primary_owner_name?: string | null;
  nama_periode?: string | null;
  tanggal: string;
  jumlah_kematian: number;
  creator_name?: string | null;
  created_at?: string | null;
  can_edit?: boolean;
};

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

const productionWeightFields = Array.from({ length: 30 }, (_, index) => ({
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
    listColumns: ["Tanggal", "Kandang", "Periode", "Kg", "Total Harga", "Aksi"],
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
      `Rp ${Number(record.total_harga ?? 0).toLocaleString("id-ID")}`,
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

function canSeeTotalHarga(role?: string) {
  return role === "owner" || role === "developer";
}

function visibleFinancialColumns(columns: string[], allowed: boolean) {
  return allowed ? columns : columns.filter((column) => column.toLowerCase() !== "total harga");
}

function visibleFinancialRow(columns: string[], row: string[], allowed: boolean) {
  return allowed ? row : row.filter((_, index) => columns[index]?.toLowerCase() !== "total harga");
}

const ownerMarker = "[[OWNER_UTAMA]]";

function sharedOwnerName(record: ApiRecord, user?: { id?: number; role?: string } | null) {
  if (user?.role === "admin" || user?.role === "developer" || user?.role === "farm_worker") {
    return String(record.primary_owner_name ?? "").trim();
  }

  if (user?.role !== "owner") return "";

  const primaryOwnerId = Number(record.primary_owner_id ?? 0);
  const currentUserId = Number(user.id ?? 0);

  if (!primaryOwnerId || !currentUserId || primaryOwnerId === currentUserId) {
    return "";
  }

  return String(record.primary_owner_name ?? "").trim();
}

function decorateKandangCells(columns: string[], row: string[], record: ApiRecord, user?: { id?: number; role?: string } | null) {
  const ownerName = sharedOwnerName(record, user);
  if (!ownerName) return row;

  return row.map((cell, index) => {
    const column = columns[index]?.toLowerCase() ?? "";
    return column.includes("kandang") ? `${cell}${ownerMarker}${ownerName}` : cell;
  });
}

function pdfCellText(value: string) {
  return value.replace(ownerMarker, "\nPrimary: ");
}

async function imageToDataUrl(src: string) {
  const response = await fetch(src);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function savePdfBlob(blob: Blob, filename: string) {
  type SaveFilePickerWindow = Window & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;

  if (picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  const [kandangAction, setKandangAction] = useState<"periode" | "mati" | "riwayat">("periode");
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
  const [mortalityLogs, setMortalityLogs] = useState<MortalityLog[]>([]);
  const [mortalityDrafts, setMortalityDrafts] = useState<Record<number, { tanggal: string; jumlah_kematian: string }>>({});
  const [mortalityHistoryMessage, setMortalityHistoryMessage] = useState("");
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const config = sectionConfig[section] ?? null;
  const showTotalHarga = canSeeTotalHarga(user?.role);
  const isFarmWorker = user?.role === "farm_worker";
  const visibleListColumns = config ? visibleFinancialColumns(config.listColumns, showTotalHarga) : [];
  const mapVisibleListRow = (record: ApiRecord) => {
    if (!config) return [];

    const decorated = decorateKandangCells(config.listColumns, config.mapListRow(record), record, user);
    return visibleFinancialRow(config.listColumns, decorated, showTotalHarga);
  };

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

  const activeKandangAction = isFarmWorker && kandangAction === "periode" ? "mati" : kandangAction;

  const loadMortalityLogs = useCallback(async () => {
    if (!ready || section !== "kandang") return;

    try {
      const response = await apiRequest(`${getApiBase()}/kandang/kematian`, token);
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = await readJsonResponse<{ status?: boolean; data?: MortalityLog[] }>(response);
      const logs = data.data ?? [];
      setMortalityLogs(logs);
      setMortalityDrafts(Object.fromEntries(logs.map((log) => [log.id, {
        tanggal: log.tanggal,
        jumlah_kematian: String(log.jumlah_kematian),
      }])));
    } catch {
      setMortalityLogs([]);
      setMortalityDrafts({});
    }
  }, [ready, section, token]);

  useEffect(() => {
    if (!ready || section !== "kandang") return;

    const timer = window.setTimeout(() => {
      void loadMortalityLogs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, section, token, loadMortalityLogs]);

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

    const approved = await confirm({
      title: "Hapus data?",
      description: "Data ini akan dihapus permanen dari tabel.",
      confirmLabel: "Hapus data",
      variant: "danger",
    });
    if (!approved) return;

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

  const exportProductionPdf = async () => {
    if (section !== "produksi") return;

    const [{ default: jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableModule.default;
    const columns = visibleListColumns.filter((column) => column !== "Aksi");
    const reportRows = filteredRows.map((record) => mapVisibleListRow(record).slice(0, columns.length).map(pdfCellText));
    const printedAt = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());
    const filterText = [
      kandangFilter ? `Kandang: ${kandangFilter}` : "Kandang: Semua",
      tanggalFilter ? `Tanggal: ${tanggalFilter}` : "Tanggal: Semua",
    ].join(" | ");
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const logo = await imageToDataUrl("/mawi-farm-logo.png").catch(() => "");

    if (logo) {
      doc.addImage(logo, "PNG", 40, 28, 54, 54);
    }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.text("Laporan Produksi Mawi Farm", 110, 45);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(filterText, 110, 62);
    doc.text(`Dicetak: ${printedAt} | Total data: ${reportRows.length}`, 110, 78);
    doc.setDrawColor(15, 121, 99);
    doc.setLineWidth(2);
    doc.line(40, 96, 802, 96);

    autoTable(doc, {
      head: [columns],
      body: reportRows.length ? reportRows : [["Tidak ada data produksi sesuai filter.", ...Array.from({ length: Math.max(0, columns.length - 1) }, () => "")]],
      startY: 112,
      theme: "grid",
      headStyles: { fillColor: [232, 247, 239], textColor: [15, 81, 63], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
      margin: { left: 40, right: 40 },
    });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Mawi Farm", 40, 570);

    const filename = `laporan-produksi-${new Date().toISOString().slice(0, 10)}.pdf`;
    const blob = doc.output("blob");
    await savePdfBlob(blob, filename);
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
          tanggal: new Date().toISOString().slice(0, 10),
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setMortalityMessage("Kematian ayam berhasil dicatat.");
      setMortalityForm({ id_kandang: "", jumlah_kematian: "" });
      await loadRows(false);
      await loadMortalityLogs();
    } catch (caughtError) {
      setMortalityMessage(caughtError instanceof Error && caughtError.message ? caughtError.message : "Gagal mencatat kematian ayam.");
    }
  };

  const updateMortalityLog = async (log: MortalityLog) => {
    const draft = mortalityDrafts[log.id];
    if (!draft) return;

    setMortalityHistoryMessage("");
    try {
      const response = await apiRequest(`${getApiBase()}/kandang/kematian/${log.id}`, token, {
        method: "PUT",
        body: JSON.stringify({
          tanggal: draft.tanggal,
          jumlah_kematian: Number(draft.jumlah_kematian || 0),
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setMortalityHistoryMessage("Catatan kematian berhasil dikoreksi.");
      await loadRows(false);
      await loadMortalityLogs();
    } catch (caughtError) {
      setMortalityHistoryMessage(caughtError instanceof Error && caughtError.message ? caughtError.message : "Gagal menyimpan koreksi kematian.");
    }
  };

  const deleteMortalityLog = async (log: MortalityLog) => {
    const approved = await confirm({
      title: "Hapus catatan kematian?",
      description: "Catatan kematian ini akan dihapus dari riwayat kandang.",
      confirmLabel: "Hapus catatan",
      variant: "danger",
    });
    if (!approved) return;

    setMortalityHistoryMessage("");
    try {
      const response = await apiRequest(`${getApiBase()}/kandang/kematian/${log.id}`, token, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setMortalityHistoryMessage("Catatan kematian berhasil dihapus.");
      await loadRows(false);
      await loadMortalityLogs();
    } catch (caughtError) {
      setMortalityHistoryMessage(caughtError instanceof Error && caughtError.message ? caughtError.message : "Gagal menghapus catatan kematian.");
    }
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      <div className="flex flex-col gap-3 rounded-[22px] border border-white/85 bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(7,46,40,0.12)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{`Data ${config.title}`}</h2>
          <p className="mt-1 text-sm text-slate-700">{config.description}</p>
        </div>
        {!isFarmWorker ? (
          <Link
            href={`/dashboard/${section}/create`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 text-sm font-semibold text-[#0f7963] shadow-sm transition hover:bg-emerald-50 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Input Data
          </Link>
        ) : null}
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
                <select value={activeKandangAction} onChange={(event) => setKandangAction(event.target.value as "periode" | "mati" | "riwayat")} className="field-input">
                  {!isFarmWorker ? <option value="periode">Tambah Periode</option> : null}
                  <option value="mati">Catat Kematian</option>
                  <option value="riwayat">Riwayat Kematian</option>
                </select>
              </label>
            </div>

            {activeKandangAction === "periode" ? (
              <form onSubmit={(event) => void createPeriod(event)}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Kandang</span>
                    <select value={periodForm.id_kandang} onChange={(event) => setPeriodForm((current) => ({ ...current, id_kandang: event.target.value }))} className="field-input" required>
                      <option value="">Pilih kandang</option>
                      {rows.map((record) => (
                        <option key={String(config.rowId(record))} value={String(config.rowId(record))}>
                          {formatKandangRecord(record, user)}
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

            {activeKandangAction === "mati" ? (
              <form onSubmit={(event) => void addMortality(event)}>
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">Kandang</span>
                    <select value={mortalityForm.id_kandang} onChange={(event) => setMortalityForm((current) => ({ ...current, id_kandang: event.target.value }))} className="field-input" required>
                      <option value="">Pilih kandang</option>
                      {rows.map((record) => (
                        <option key={String(config.rowId(record))} value={String(config.rowId(record))}>
                          {formatKandangRecord(record, user)} - {String(record.nama_periode ?? "-")}
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

            {activeKandangAction === "riwayat" ? (
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Riwayat Kematian</h4>
                    <p className="text-sm text-slate-600">Pilih catatan yang salah, lalu koreksi jumlahnya atau hapus catatannya.</p>
                  </div>
                  <button type="button" onClick={() => void loadMortalityLogs()} className="rounded-2xl border border-emerald-950/10 bg-white px-4 py-2 text-sm font-semibold text-[#0f7963] hover:bg-emerald-50">
                    Refresh
                  </button>
                </div>
                {mortalityHistoryMessage ? <p className="mt-3 text-sm font-semibold text-[#0f7963]">{mortalityHistoryMessage}</p> : null}
                <div className="mt-4 grid gap-3">
                  {mortalityLogs.map((log) => {
                    const draft = mortalityDrafts[log.id] ?? { tanggal: log.tanggal, jumlah_kematian: String(log.jumlah_kematian) };
                    return (
                      <div key={log.id} className="rounded-2xl border border-emerald-950/5 bg-white p-4">
                        <div className="grid gap-3 lg:grid-cols-[1fr_160px_150px_auto] lg:items-end">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{formatKandangRecord(log as unknown as ApiRecord, user)} - {log.nama_periode ?? "-"}</p>
                            <p className="mt-1 text-xs text-slate-500">Dicatat oleh {log.creator_name ?? "-"} pada {log.created_at ?? "-"}</p>
                          </div>
                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold text-slate-500">Tanggal</span>
                            <input
                              type="date"
                              value={draft.tanggal}
                              disabled={!log.can_edit}
                              onChange={(event) => setMortalityDrafts((current) => ({ ...current, [log.id]: { ...draft, tanggal: event.target.value } }))}
                              className="field-input py-2.5"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold text-slate-500">Jumlah Mati</span>
                            <input
                              type="number"
                              min="1"
                              value={draft.jumlah_kematian}
                              disabled={!log.can_edit}
                              onChange={(event) => setMortalityDrafts((current) => ({ ...current, [log.id]: { ...draft, jumlah_kematian: event.target.value } }))}
                              className="field-input py-2.5"
                            />
                          </label>
                          <div className="flex gap-2">
                            <button type="button" disabled={!log.can_edit} onClick={() => void updateMortalityLog(log)} className="rounded-2xl bg-[#0f7963] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d6f5d] disabled:opacity-50">
                              Koreksi
                            </button>
                            <button type="button" disabled={!log.can_edit} onClick={() => void deleteMortalityLog(log)} className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!mortalityLogs.length ? <p className="rounded-2xl border border-dashed border-emerald-950/10 bg-white px-4 py-8 text-sm text-slate-500">Belum ada catatan kematian.</p> : null}
                </div>
              </div>
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

              <button
                type="button"
                onClick={() => void exportProductionPdf()}
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#0f7963] px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d]"
              >
                <FileText className="h-4 w-4" />
                Export PDF
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
                    {mapVisibleListRow(record)
                      .slice(0, visibleListColumns.length - 1)
                      .map((cell, index) => (
                        <div key={`${cell}-${index}`} className="flex items-start justify-between gap-4 text-sm">
                          <span className="text-slate-500">{visibleListColumns[index]}</span>
                          <CellValue value={cell} className="text-right text-slate-700" />
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
                      {!isFarmWorker ? (
                        <>
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
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-emerald-950/5 md:block">
              <div
                className="grid bg-emerald-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"
                style={{ gridTemplateColumns: `repeat(${visibleListColumns.length}, minmax(120px, 1fr))` }}
              >
                {visibleListColumns.map((column, index) => (
                  <span key={column} className={index === visibleListColumns.length - 1 ? "text-right" : ""}>
                    {column}
                  </span>
                ))}
              </div>

              {filteredRows.map((record) => (
                <div
                  key={String(config.rowId(record))}
                  className="grid border-t border-emerald-950/5 px-4 py-4 text-sm"
                  style={{ gridTemplateColumns: `repeat(${visibleListColumns.length}, minmax(120px, 1fr))` }}
                >
                  {mapVisibleListRow(record)
                    .slice(0, visibleListColumns.length - 1)
                    .map((cell, index) => (
                      <CellValue key={`${cell}-${index}`} value={cell} className="text-slate-700" />
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
                    {!isFarmWorker ? (
                      <>
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
                      </>
                    ) : null}
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
  const [kandangOptions, setKandangOptions] = useState<Array<{ id_kandang: string | number; nama_kandang: string; primary_owner_id?: string | number | null; primary_owner_name?: string | null }>>([]);
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
        const data = await readJsonResponse<Array<{ id_kandang: string | number; nama_kandang: string; primary_owner_id?: string | number | null; primary_owner_name?: string | null }> | { data?: Array<{ id_kandang: string | number; nama_kandang: string; primary_owner_id?: string | number | null; primary_owner_name?: string | null }> }>(response);
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

  if (user?.role === "farm_worker") {
    return (
      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <p className="text-sm font-semibold text-slate-900">Akses khusus farm worker.</p>
        <p className="mt-1 text-sm text-slate-500">Gunakan menu Kandang untuk catat kematian atau batalkan salah input.</p>
      </div>
    );
  }

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
    const productionBatch = parseProductionBatchQr(value);

    if (productionBatch) {
      setValues((current) => {
        const next = { ...current };
        if (productionBatch.id_kandang) {
          next.id_kandang = productionBatch.id_kandang;
        }
        if (productionBatch.tanggal) {
          next.tanggal = productionBatch.tanggal;
        }

        if (productionBatch.mode === "single") {
          const target = productionWeightFields.find((field) => !next[field.name]);
          if (target) {
            next[target.name] = productionBatch.weights[0] ?? "";
          }
          return next;
        }

        productionWeightFields.forEach((field, index) => {
          next[field.name] = productionBatch.weights[index] ?? "";
        });
        return next;
      });
      setMessage("QR scanned.");
      return;
    }

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
                        {formatKandangOption(option, user)}
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

function parseProductionBatchQr(value: string): { mode: "batch" | "single"; batch: string; tanggal: string; id_kandang: string; weights: string[] } | null {
  try {
    const data = JSON.parse(value) as {
      type?: string;
      batch?: string;
      tanggal?: string;
      id_kandang?: string | number;
      weight?: string | number;
      weights?: Array<string | number>;
    };

    if (data.type === "mawifarm_production_weight" && data.weight !== undefined) {
      return {
        mode: "single",
        batch: String(data.batch ?? ""),
        tanggal: String(data.tanggal ?? ""),
        id_kandang: data.id_kandang ? String(data.id_kandang) : "",
        weights: [String(data.weight).replace(",", ".")],
      };
    }

    if (data.type !== "mawifarm_production_weights" || !Array.isArray(data.weights)) {
      return null;
    }

    return {
      mode: "batch",
      batch: String(data.batch ?? ""),
      tanggal: String(data.tanggal ?? ""),
      id_kandang: data.id_kandang ? String(data.id_kandang) : "",
      weights: data.weights.map((weight) => String(weight).replace(",", ".")),
    };
  } catch {
    return null;
  }
}

function CellValue({ value, className = "" }: { value: string; className?: string }) {
  const [main, owner] = value.split(ownerMarker);

  if (!owner) {
    return <span className={className}>{main}</span>;
  }

  return (
    <span className={`${className} inline-flex flex-col gap-0.5`}>
      <span>{main}</span>
      <span className="text-xs font-medium text-slate-400">Primary: {owner}</span>
    </span>
  );
}

function formatKandangOption(
  option: { nama_kandang: string; primary_owner_id?: string | number | null; primary_owner_name?: string | null },
  user?: { id?: number; role?: string } | null
) {
  const ownerName = sharedOwnerName(option as ApiRecord, user);

  return ownerName ? `${option.nama_kandang} - Primary: ${ownerName}` : option.nama_kandang;
}

function formatKandangRecord(record: ApiRecord, user?: { id?: number; role?: string } | null) {
  return formatKandangOption({
    nama_kandang: String(record.nama_kandang ?? "-"),
    primary_owner_id: record.primary_owner_id,
    primary_owner_name: record.primary_owner_name ? String(record.primary_owner_name) : null,
  }, user);
}

export function SectionShowView({ section, id }: { section: SectionKey; id?: string }) {
  const { token, user, ready } = useAuth();
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const config = sectionConfig[section] ?? null;
  const showTotalHarga = canSeeTotalHarga(user?.role);
  const showColumns = config ? visibleFinancialColumns(config.showColumns, showTotalHarga) : [];

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
    () => rows.map((record) => {
      if (!config) return [];

      const decorated = decorateKandangCells(config.showColumns, config.mapShowRow(record), record, user);
      return visibleFinancialRow(config.showColumns, decorated, showTotalHarga);
    }),
    [config, rows, showTotalHarga, user]
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
        columns={showColumns}
        rows={loading ? [] : dataRows}
        emptyState={error ? "Error koneksi" : "Belum ada data"}
        emptyHint={error || ""}
      />
    </div>
  );
}
