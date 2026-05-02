"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import { Eye, Pencil, PlugZap, Printer, RefreshCcw, Save, Trash2, Usb } from "lucide-react";
import { getApiBase, getOwnerScopeHeaders, readApiError, readJsonResponse } from "@/components/api";
import { PageHeader } from "@/components/page-shell";
import { useAuth } from "@/components/providers";
import { QrScannerPanel } from "@/components/qr-scanner";
import { saleTargets } from "@/lib/sale-targets";

type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
};

type NavigatorWithSerial = Navigator & {
  serial?: {
    requestPort(): Promise<SerialPortLike>;
  };
};

type DistributionNota = {
  id: number;
  tanggal: string;
  kandang: string;
  nomor_nota: string;
  weights: number[];
  total_berat: number;
  creator_name?: string | null;
};

type ApiListResponse = {
  status?: boolean;
  data?: DistributionNota[];
};

type ApiSingleResponse = {
  status?: boolean;
  message?: string;
  data?: DistributionNota;
};

const WEIGHT_COUNT = 50;
const DEFAULT_BAUD_RATE = 9600;
const encoder = new TextEncoder();

const escpos = {
  reset: [0x1b, 0x40],
  alignLeft: [0x1b, 0x61, 0x00],
  alignCenter: [0x1b, 0x61, 0x01],
  boldOn: [0x1b, 0x45, 0x01],
  boldOff: [0x1b, 0x45, 0x00],
  doubleSize: [0x1d, 0x21, 0x11],
  normalSize: [0x1d, 0x21, 0x00],
  qrModel2: [0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00],
  qrSize4: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04],
  qrErrorM: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31],
  qrPrint: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30],
  feed5: [0x1b, 0x64, 0x05],
  cut: [0x1d, 0x56, 0x41, 0x10],
};

function bytes(values: number[]) {
  return new Uint8Array(values);
}

function concatBytes(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });

  return result;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value || 0);
}

function todayString() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function notaQrPayload(nota: DistributionNota) {
  return JSON.stringify({
    type: "mawifarm_sale_note",
    tanggal: nota.tanggal,
    kandang: nota.kandang,
    nota: nota.nomor_nota,
    weights: nota.weights.filter((weight) => weight > 0).map((weight) => Number(weight.toFixed(2))),
  });
}

function buildNotaPrintPayload(nota: DistributionNota) {
  const printableWeights = nota.weights.filter((weight) => weight > 0);
  const lines = printableWeights.map((weight, index) => `${String(index + 1).padStart(2, "0")}. ${formatNumber(weight)} kg`);
  const qrData = encoder.encode(notaQrPayload(nota));
  const length = qrData.length + 3;

  return concatBytes([
    bytes(escpos.reset),
    bytes(escpos.alignCenter),
    bytes(escpos.boldOn),
    bytes(escpos.doubleSize),
    encoder.encode("NOTA\n"),
    bytes(escpos.normalSize),
    encoder.encode("MAWI FARM\n"),
    bytes(escpos.boldOff),
    encoder.encode("-------------------------------\n"),
    bytes(escpos.alignLeft),
    encoder.encode(`Tanggal : ${nota.tanggal}\n`),
    encoder.encode(`Kandang : ${nota.kandang}\n`),
    encoder.encode(`No Nota : ${nota.nomor_nota}\n`),
    encoder.encode("-------------------------------\n"),
    encoder.encode(`${lines.join("\n")}\n`),
    encoder.encode("-------------------------------\n"),
    bytes(escpos.boldOn),
    encoder.encode(`TOTAL   : ${formatNumber(nota.total_berat)} kg\n`),
    bytes(escpos.boldOff),
    encoder.encode("-------------------------------\n\n"),
    bytes(escpos.alignCenter),
    encoder.encode("Scan untuk input penjualan\n"),
    bytes(escpos.qrModel2),
    bytes(escpos.qrSize4),
    bytes(escpos.qrErrorM),
    bytes([0x1d, 0x28, 0x6b, length % 256, Math.floor(length / 256), 0x31, 0x50, 0x30]),
    qrData,
    bytes(escpos.qrPrint),
    bytes(escpos.feed5),
    bytes(escpos.cut),
  ]);
}

async function writePayload(port: SerialPortLike, payload: Uint8Array, baudRate: number) {
  await port.open({ baudRate });
  const writer = port.writable?.getWriter();

  if (!writer) {
    await port.close();
    throw new Error("Port printer tidak bisa ditulis.");
  }

  try {
    await writer.write(payload);
    await sleep(500);
  } finally {
    writer.releaseLock();
    await port.close();
  }
}

function portLabel(port: SerialPortLike | null) {
  const info = port?.getInfo?.();

  if (info?.usbVendorId || info?.usbProductId) {
    return `Printer terhubung (${info.usbVendorId ?? "-"}:${info.usbProductId ?? "-"})`;
  }

  return port ? "Printer terhubung" : "Belum pilih printer";
}

function emptyWeights() {
  return Array.from({ length: WEIGHT_COUNT }, () => "");
}

export function DistributionNotaPage() {
  const { ready, token, user } = useAuth();
  const [rows, setRows] = useState<DistributionNota[]>([]);
  const [tanggal, setTanggal] = useState(todayString());
  const [kandang, setKandang] = useState("");
  const [weights, setWeights] = useState<string[]>(emptyWeights);
  const [editing, setEditing] = useState<DistributionNota | null>(null);
  const [selected, setSelected] = useState<DistributionNota | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [port, setPort] = useState<SerialPortLike | null>(null);
  const [baudRate, setBaudRate] = useState(String(DEFAULT_BAUD_RATE));
  const [printingId, setPrintingId] = useState<number | null>(null);

  const serialSupported = typeof navigator !== "undefined" && Boolean((navigator as NavigatorWithSerial).serial);
  const ownerOptions = useMemo(() => user?.role === "admin" ? user.owner_options ?? [] : [], [user]);
  const kandangOptions = useMemo(() => {
    const options = saleTargets.map((target) => target.name);
    const existing = new Set(options.map((item) => item.trim().toLowerCase()));

    ownerOptions.forEach((owner) => {
      const name = owner.name.trim();
      if (name && !existing.has(name.toLowerCase())) {
        options.push(name);
        existing.add(name.toLowerCase());
      }
    });

    return options;
  }, [ownerOptions]);
  const totalBerat = useMemo(() => weights.reduce((sum, value) => sum + toNumber(value), 0), [weights]);

  const requestHeaders = useCallback((extra: HeadersInit = {}) => ({
    Accept: "application/json",
    ...getOwnerScopeHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }), [token]);

  const loadRows = useCallback(async () => {
    if (!ready) return;

    try {
      const response = await fetch(`${getApiBase()}/distribution/notas`, {
        credentials: "include",
        headers: requestHeaders(),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = await readJsonResponse<ApiListResponse>(response);
      setRows(data.data ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat data nota.");
    }
  }, [ready, requestHeaders]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const resetForm = () => {
    setTanggal(todayString());
    setKandang("");
    setWeights(emptyWeights());
    setEditing(null);
  };

  const updateWeight = (index: number, value: string) => {
    setWeights((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const fillNextWeight = (value: string) => {
    const normalized = value.replace(",", ".").trim();

    if (!normalized) return;

    setWeights((current) => {
      const index = current.findIndex((item) => item.trim() === "");
      if (index === -1) {
        setMessage("Semua kolom berat sudah terisi.");
        return current;
      }

      return current.map((item, itemIndex) => (itemIndex === index ? normalized : item));
    });
  };

  const selectPrinter = async () => {
    setMessage("");

    if (!serialSupported) {
      setMessage("Browser ini belum mendukung Web Serial. Pakai Chrome atau Edge untuk print thermal.");
      return;
    }

    try {
      const nextPort = await (navigator as NavigatorWithSerial).serial?.requestPort();
      if (nextPort) {
        setPort(nextPort);
        setMessage("Printer siap dipakai.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        setMessage("Pemilihan printer dibatalkan.");
        return;
      }

      setMessage(error instanceof Error ? error.message : "Gagal memilih printer.");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!kandang) {
      setMessage("Kandang harus dipilih.");
      return;
    }

    if (totalBerat <= 0) {
      setMessage("Isi minimal satu berat.");
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, string | number> = {
        tanggal,
        kandang,
      };

      weights.forEach((weight, index) => {
        payload[`berat${index + 1}`] = toNumber(weight);
      });

      const response = await fetch(`${getApiBase()}/distribution/notas${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: requestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = await readJsonResponse<ApiSingleResponse>(response);
      setMessage(data.message ?? "Nota berhasil disimpan.");
      resetForm();
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan nota.");
    } finally {
      setLoading(false);
    }
  };

  const editRow = (nota: DistributionNota) => {
    setEditing(nota);
    setSelected(nota);
    setTanggal(nota.tanggal);
    setKandang(nota.kandang);
    setWeights(Array.from({ length: WEIGHT_COUNT }, (_, index) => nota.weights[index] ? String(nota.weights[index]) : ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRow = async (nota: DistributionNota) => {
    const approved = window.confirm(`Hapus nota ${nota.nomor_nota}?`);
    if (!approved) return;

    try {
      const response = await fetch(`${getApiBase()}/distribution/notas/${nota.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: requestHeaders(),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setMessage("Nota berhasil dihapus.");
      if (selected?.id === nota.id) setSelected(null);
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus nota.");
    }
  };

  const printNota = async (nota: DistributionNota) => {
    if (!port) {
      setMessage("Printer belum dipilih.");
      return;
    }

    setPrintingId(nota.id);
    setMessage(`Mencetak ${nota.nomor_nota}...`);

    try {
      await writePayload(port, buildNotaPrintPayload(nota), Number(baudRate) || DEFAULT_BAUD_RATE);
      setMessage("Nota selesai dicetak.");
    } catch (error) {
      setMessage(`Koneksi printer gagal: ${error instanceof Error ? error.message : "error tidak diketahui"}`);
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distribution - Nota"
        description="Buat nota timbang, cetak thermal, lalu QR-nya bisa dipakai untuk input penjualan."
      />

      <div className="rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:rounded-[26px] sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <label className="block flex-1">
            <span className="mb-2 block text-sm font-medium text-slate-600">Printer</span>
            <button
              type="button"
              onClick={() => void selectPrinter()}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-emerald-50"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Usb className="h-4 w-4 shrink-0 text-[#0f7963]" />
                <span className="truncate">{portLabel(port)}</span>
              </span>
              <PlugZap className="h-4 w-4 shrink-0 text-[#0f7963]" />
            </button>
          </label>
          <label className="block md:w-40">
            <span className="mb-2 block text-sm font-medium text-slate-600">Baud Rate</span>
            <select value={baudRate} onChange={(event) => setBaudRate(event.target.value)} className="field-input">
              {["9600", "19200", "38400", "57600", "115200"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <form onSubmit={(event) => void submit(event)} className="min-w-0 rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:rounded-[26px] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{editing ? `Edit ${editing.nomor_nota}` : "Nota Baru"}</h2>
            <p className="mt-1 text-sm text-slate-500">Nomor nota dibuat otomatis saat disimpan.</p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            title="Reset form"
            className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-[#0f7963] transition hover:bg-emerald-100"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="grid min-w-0 gap-4 md:grid-cols-3">
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-medium text-slate-600">Tanggal</span>
              <input value={tanggal} onChange={(event) => setTanggal(event.target.value)} type="date" required className="field-input" />
            </label>
            <label className="block min-w-0">
              <span className="mb-2 block text-sm font-medium text-slate-600">Kandang</span>
              <select value={kandang} onChange={(event) => setKandang(event.target.value)} required className="field-input">
                <option value="">Pilih kandang</option>
                {kandangOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="min-w-0 rounded-2xl bg-[#f6fbf8] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Total Berat</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(totalBerat)} kg</p>
            </div>
          </div>

          <div>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Input Berat</h3>
                <p className="text-xs text-slate-500">Isi berat telur yang masuk ke nota ini.</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0f7963]">1 - 50</span>
            </div>
            <div className="mb-5 min-w-0">
              <QrScannerPanel onScan={fillNextWeight} compact />
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
              {weights.map((value, index) => (
                <label key={index} className="block min-w-0">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Berat {index + 1}</span>
                  <input
                    value={value}
                    onChange={(event) => updateWeight(index, event.target.value)}
                    inputMode="decimal"
                    type="number"
                    step="0.01"
                    className="field-input border-emerald-100 bg-white py-2.5"
                    placeholder="0"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-[#0f7963]">{message}</p> : null}

        <button disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d] disabled:opacity-70 sm:w-auto">
          <Save className="h-4 w-4" />
          {loading ? "Menyimpan..." : editing ? "Update Nota" : "Simpan Nota"}
        </button>
      </form>

      {selected ? (
        <div className="rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:rounded-[26px] sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{selected.nomor_nota}</h2>
              <p className="mt-1 text-sm text-slate-500">{selected.tanggal} - {selected.kandang}</p>
            </div>
            <p className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#0f7963]">
              Total {formatNumber(selected.total_berat)} kg
            </p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-5 md:grid-cols-10">
            {selected.weights.filter((weight) => weight > 0).map((weight, index) => (
              <div key={`${selected.id}-${index}`} className="rounded-xl bg-[#f6fbf8] px-3 py-2 text-sm font-semibold text-slate-700">
                {index + 1}. {formatNumber(weight)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[22px] border border-white/70 bg-white/85 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:rounded-[26px]">
        <div className="grid gap-3 p-4 md:hidden">
          {rows.length > 0 ? rows.map((row) => (
            <NotaCard
              key={row.id}
              row={row}
              printing={printingId === row.id}
              onShow={() => setSelected(row)}
              onEdit={() => editRow(row)}
              onPrint={() => void printNota(row)}
              onDelete={() => void deleteRow(row)}
            />
          )) : (
            <div className="py-4 text-sm text-slate-500">Belum ada nota.</div>
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
        <div className="grid min-w-[860px] grid-cols-[1fr_1fr_1fr_1fr_220px] bg-[#f3fbf5] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>Tanggal</span>
          <span>Kandang</span>
          <span>No Nota</span>
          <span>Total</span>
          <span>Aksi</span>
        </div>
          {rows.length > 0 ? rows.map((row) => (
            <div key={row.id} className="grid min-w-[860px] grid-cols-[1fr_1fr_1fr_1fr_220px] items-center border-t border-emerald-950/5 px-5 py-4 text-sm text-slate-700">
              <span>{row.tanggal}</span>
              <span className="font-semibold text-slate-900">{row.kandang}</span>
              <span>{row.nomor_nota}</span>
              <span>{formatNumber(row.total_berat)} kg</span>
              <span className="flex flex-wrap gap-2">
                <IconButton title="Show" onClick={() => setSelected(row)} icon={Eye} />
                <IconButton title="Edit" onClick={() => editRow(row)} icon={Pencil} />
                <IconButton title="Print" onClick={() => void printNota(row)} icon={Printer} disabled={printingId === row.id} />
                <IconButton title="Delete" onClick={() => void deleteRow(row)} icon={Trash2} danger />
              </span>
            </div>
          )) : (
            <div className="px-5 py-8 text-sm text-slate-500">Belum ada nota.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  title,
  icon: Icon,
  onClick,
  danger,
  disabled,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "grid h-9 w-9 place-items-center rounded-xl transition disabled:opacity-60",
        danger ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-[#0f7963] hover:bg-emerald-100",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function NotaCard({
  row,
  printing,
  onShow,
  onEdit,
  onPrint,
  onDelete,
}: {
  row: DistributionNota;
  printing: boolean;
  onShow: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-950/5 bg-white p-4 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{row.nomor_nota}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{row.tanggal}</p>
        </div>
        <span className="shrink-0 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0f7963]">
          {formatNumber(row.total_berat)} kg
        </span>
      </div>
      <p className="mt-3 break-words text-sm font-semibold text-slate-800">{row.kandang}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <IconButton title="Show" onClick={onShow} icon={Eye} />
        <IconButton title="Edit" onClick={onEdit} icon={Pencil} />
        <IconButton title="Print" onClick={onPrint} icon={Printer} disabled={printing} />
        <IconButton title="Delete" onClick={onDelete} icon={Trash2} danger />
      </div>
    </div>
  );
}
