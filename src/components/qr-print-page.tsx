"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { BarcodeFormat, EncodeHintType, QRCodeWriter } from "@zxing/library";
import { CheckCircle2, CircleAlert, Eye, Pencil, PlugZap, Printer, RefreshCcw, Save, Scissors, ToggleLeft, ToggleRight, Trash2, Usb } from "lucide-react";
import { getApiBase, getOwnerScopeHeaders, readApiError, readJsonResponse } from "@/components/api";
import { PageHeader } from "@/components/page-shell";
import { useAuth } from "@/components/providers";

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

const INPUT_COUNT = 30;
const DEFAULT_BAUD_RATE = 9600;
const encoder = new TextEncoder();

type QrPrintBatch = {
  id: number;
  id_kandang?: number | string | null;
  nama_kandang?: string | null;
  primary_owner_id?: number | string | null;
  primary_owner_name?: string | null;
  tanggal: string;
  nomor_batch: string;
  weights: number[];
  total_berat: number;
};

type KandangOption = {
  id_kandang: string | number;
  nama_kandang: string;
  primary_owner_name?: string | null;
};

type BatchListResponse = {
  status?: boolean;
  data?: QrPrintBatch[];
};

type BatchSingleResponse = {
  status?: boolean;
  message?: string;
  data?: QrPrintBatch;
};

const escpos = {
  reset: [0x1b, 0x40],
  alignLeft: [0x1b, 0x61, 0x00],
  alignCenter: [0x1b, 0x61, 0x01],
  qrModel2: [0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00],
  qrSize8: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x08],
  qrSize6: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06],
  qrSize4: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04],
  qrErrorM: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31],
  qrPrint: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30],
  feed7: [0x1b, 0x64, 0x07],
  doubleSize: [0x1d, 0x21, 0x11],
  normalSize: [0x1d, 0x21, 0x00],
  feed5: [0x1b, 0x64, 0x05],
  feed8: [0x1b, 0x64, 0x08],
  cut: [0x1d, 0x56, 0x41, 0x10],
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function bytes(values: number[]) {
  return new Uint8Array(values);
}

function todayInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function buildSingleProductionQrText(weight: string, tanggal: string, idKandang: string) {
  return JSON.stringify({
    type: "mawifarm_production_weight",
    tanggal,
    id_kandang: idKandang || undefined,
    weight: Number(toNumber(weight).toFixed(2)),
  });
}

function buildQrPrintPayload(dataQR: string, qrText = dataQR) {
  const qrData = encoder.encode(qrText);
  const length = qrData.length + 3;

  return concatBytes([
    bytes(escpos.reset),
    bytes(escpos.alignCenter),
    bytes(escpos.qrModel2),
    bytes(escpos.qrSize4),
    bytes(escpos.qrErrorM),
    bytes([0x1d, 0x28, 0x6b, length % 256, Math.floor(length / 256), 0x31, 0x50, 0x30]),
    qrData,
    bytes(escpos.qrPrint),
    bytes(escpos.feed7),
    bytes(escpos.doubleSize),
    encoder.encode(`${dataQR} `),
    bytes(escpos.normalSize),
    encoder.encode("kg\n"),
    bytes(escpos.feed5),
    bytes(escpos.cut),
  ]);
}

function buildProductionBatchQrPayload(batch: QrPrintBatch) {
  const qrText = JSON.stringify({
    type: "mawifarm_production_weights",
    batch: batch.nomor_batch,
    tanggal: batch.tanggal,
    id_kandang: batch.id_kandang,
    nama_kandang: batch.nama_kandang,
    weights: batch.weights.filter((weight) => weight > 0).map((weight) => Number(weight.toFixed(2))),
  });
  const qrData = encoder.encode(qrText);
  const length = qrData.length + 3;

  return concatBytes([
    bytes(escpos.reset),
    bytes(escpos.alignCenter),
    bytes(escpos.doubleSize),
    encoder.encode("PRODUKSI\n"),
    bytes(escpos.normalSize),
    encoder.encode(`${batch.nomor_batch}\n`),
    encoder.encode(`Total ${formatNumber(batch.total_berat)} kg\n\n`),
    bytes(escpos.qrModel2),
    bytes(escpos.qrSize4),
    bytes(escpos.qrErrorM),
    bytes([0x1d, 0x28, 0x6b, length % 256, Math.floor(length / 256), 0x31, 0x50, 0x30]),
    qrData,
    bytes(escpos.qrPrint),
    bytes(escpos.feed8),
    bytes(escpos.cut),
  ]);
}

function canvasToEscposRaster(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas printer tidak bisa dibuat.");
  }

  const widthBytes = Math.ceil(canvas.width / 8);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const raster = new Uint8Array(widthBytes * canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let xByte = 0; xByte < widthBytes; xByte += 1) {
      let value = 0;

      for (let bit = 0; bit < 8; bit += 1) {
        const x = xByte * 8 + bit;
        if (x >= canvas.width) continue;

        const offset = (y * canvas.width + x) * 4;
        const r = imageData[offset] ?? 255;
        const g = imageData[offset + 1] ?? 255;
        const b = imageData[offset + 2] ?? 255;
        const alpha = imageData[offset + 3] ?? 255;
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (alpha > 0 && luminance < 140) {
          value |= 0x80 >> bit;
        }
      }

      raster[y * widthBytes + xByte] = value;
    }
  }

  return concatBytes([
    bytes([0x1d, 0x76, 0x30, 0x00, widthBytes % 256, Math.floor(widthBytes / 256), canvas.height % 256, Math.floor(canvas.height / 256)]),
    raster,
  ]);
}

function buildSplitQrPrintPayload(dataQR: string, qrText = dataQR) {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 132;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas printer tidak bisa dibuat.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000000";
  context.font = "700 56px Arial, sans-serif";
  context.textBaseline = "middle";
  context.fillText(dataQR, 96, 66);

  const qrSize = 130;
  const qrX = canvas.width - qrSize - 2;
  const qrY = Math.floor((canvas.height - qrSize) / 2);
  const hints = new Map<EncodeHintType, number>();
  hints.set(EncodeHintType.MARGIN, 1);
  const matrix = new QRCodeWriter().encode(qrText, BarcodeFormat.QR_CODE, qrSize, qrSize, hints);

  for (let y = 0; y < qrSize; y += 1) {
    for (let x = 0; x < qrSize; x += 1) {
      if (matrix.get(x, y)) {
        context.fillRect(qrX + x, qrY + y, 1, 1);
      }
    }
  }

  return concatBytes([
    bytes(escpos.reset),
    canvasToEscposRaster(canvas),
    bytes(escpos.feed8),
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

function formatKandangLabel(option: KandangOption) {
  return option.primary_owner_name
    ? `${option.nama_kandang} - Primary: ${option.primary_owner_name}`
    : option.nama_kandang;
}

function formatBatchKandang(batch: QrPrintBatch) {
  const name = batch.nama_kandang ?? "-";
  return batch.primary_owner_name ? `${name} - Primary: ${batch.primary_owner_name}` : name;
}

export function QrPrintPage() {
  const { ready, token } = useAuth();
  const [weights, setWeights] = useState<string[]>(() => Array.from({ length: INPUT_COUNT }, () => ""));
  const [selectedKandang, setSelectedKandang] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayInputValue);
  const [kandangOptions, setKandangOptions] = useState<KandangOption[]>([]);
  const [rows, setRows] = useState<QrPrintBatch[]>([]);
  const [editing, setEditing] = useState<QrPrintBatch | null>(null);
  const [selected, setSelected] = useState<QrPrintBatch | null>(null);
  const [port, setPort] = useState<SerialPortLike | null>(null);
  const [baudRate, setBaudRate] = useState(String(DEFAULT_BAUD_RATE));
  const [message, setMessage] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [splitFormat, setSplitFormat] = useState(true);
  const [serialSupported, setSerialSupported] = useState(true);

  const printableWeights = useMemo(() => weights.map((weight) => weight.trim()).filter(Boolean), [weights]);
  const totalWeight = useMemo(() => weights.reduce((sum, value) => sum + toNumber(value), 0), [weights]);
  const selectedPreview = printableWeights[0] ?? weights.find((weight) => weight.trim()) ?? "";
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSerialSupported(Boolean((navigator as NavigatorWithSerial).serial));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const updateWeight = (index: number, value: string) => {
    setWeights((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const requestHeaders = useCallback((extra: HeadersInit = {}) => ({
    Accept: "application/json",
    ...getOwnerScopeHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }), [token]);

  const loadRows = useCallback(async () => {
    if (!ready) return;

    try {
      const response = await fetch(`${getApiBase()}/qr-print-batches`, {
        credentials: "include",
        headers: requestHeaders(),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const data = await readJsonResponse<BatchListResponse>(response);
      setRows(data.data ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat batch QR.");
    }
  }, [ready, requestHeaders]);

  const loadKandangOptions = useCallback(async () => {
    if (!ready) return;

    try {
      const response = await fetch(`${getApiBase()}/kandang`, {
        credentials: "include",
        headers: requestHeaders(),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const data = await readJsonResponse<KandangOption[] | { data?: KandangOption[] }>(response);
      setKandangOptions(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      setKandangOptions([]);
    }
  }, [ready, requestHeaders]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
      void loadKandangOptions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadKandangOptions, loadRows]);

  const selectPrinter = async () => {
    setMessage("");

    if (!serialSupported) {
      setMessage("Browser ini belum mendukung Web Serial. Pakai Chrome atau Edge, lalu pilih printer serial/Bluetooth yang sudah dipairing.");
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

  const printAll = async () => {
    if (isPrinting) {
      setMessage("Sedang mencetak, tunggu selesai...");
      return;
    }

    if (printableWeights.length === 0) {
      setMessage("Isi minimal satu berat.");
      return;
    }

    if (!port) {
      setMessage("Printer belum dipilih.");
      return;
    }

    const resolvedBaudRate = Number(baudRate) || DEFAULT_BAUD_RATE;
    setIsPrinting(true);
    setMessage(`Mencetak ${printableWeights.length} QR...`);

    try {
      for (const weight of printableWeights) {
        const qrText = buildSingleProductionQrText(weight, selectedDate, selectedKandang);
        await writePayload(port, splitFormat ? buildSplitQrPrintPayload(weight, qrText) : buildQrPrintPayload(weight, qrText), resolvedBaudRate);
        await sleep(1500);
      }

      setMessage("Selesai mencetak semua data.");
    } catch (error) {
      setMessage(`Koneksi printer gagal: ${error instanceof Error ? error.message : "error tidak diketahui"}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const saveBatch = async () => {
    if (printableWeights.length === 0) {
      setMessage("Isi minimal satu berat sebelum simpan batch.");
      return;
    }

    if (!selectedKandang) {
      setMessage("Pilih kandang sebelum simpan batch.");
      return;
    }

    try {
      const payload: Record<string, string | number> = { id_kandang: selectedKandang, tanggal: selectedDate };
      weights.forEach((weight, index) => {
        payload[`berat${index + 1}`] = toNumber(weight);
      });

      const response = await fetch(`${getApiBase()}/qr-print-batches${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: requestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(await readApiError(response));

      const data = await readJsonResponse<BatchSingleResponse>(response);
      setMessage(data.message ?? "Batch QR berhasil disimpan.");
      setEditing(null);
      setSelectedKandang("");
      setSelectedDate(todayInputValue());
      setWeights(Array.from({ length: INPUT_COUNT }, () => ""));
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan batch QR.");
    }
  };

  const editBatch = (batch: QrPrintBatch) => {
    setEditing(batch);
    setSelected(batch);
    setSelectedKandang(String(batch.id_kandang ?? ""));
    setSelectedDate(batch.tanggal || todayInputValue());
    setWeights(Array.from({ length: INPUT_COUNT }, (_, index) => batch.weights[index] ? String(batch.weights[index]) : ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteBatch = async (batch: QrPrintBatch) => {
    if (!window.confirm(`Hapus ${batch.nomor_batch}?`)) return;

    try {
      const response = await fetch(`${getApiBase()}/qr-print-batches/${batch.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: requestHeaders(),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setMessage("Batch QR berhasil dihapus.");
      if (selected?.id === batch.id) setSelected(null);
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus batch QR.");
    }
  };

  const printProductionBatch = async (batch: QrPrintBatch) => {
    if (!port) {
      setMessage("Printer belum dipilih.");
      return;
    }

    try {
      setIsPrinting(true);
      await writePayload(port, buildProductionBatchQrPayload(batch), Number(baudRate) || DEFAULT_BAUD_RATE);
      setMessage("QR batch Produksi selesai dicetak.");
    } catch (error) {
      setMessage(`Koneksi printer gagal: ${error instanceof Error ? error.message : "error tidak diketahui"}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const resetWeights = () => {
    setWeights(Array.from({ length: INPUT_COUNT }, () => ""));
    setSelectedKandang("");
    setSelectedDate(todayInputValue());
    setEditing(null);
    setMessage("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR Print"
        description="Cetak QR berat telur ke printer thermal."
      />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[0.92fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:rounded-[26px] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
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

              <label className="block sm:w-40">
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

            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <InfoTile icon={Printer} label="Mode" value="ESC/POS native QR" />
              <InfoTile icon={Scissors} label="Cut" value="GS V A 10" />
              <InfoTile icon={CheckCircle2} label="Antrian" value={`${printableWeights.length} data / ${formatNumber(totalWeight)} kg`} />
            </div>

            <button
              type="button"
              onClick={() => setSplitFormat((value) => !value)}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-emerald-50"
            >
              <span>
                {splitFormat ? "Format 2" : "Format 1"}
                <span className="ml-2 font-normal text-slate-500">
                  {splitFormat ? "Berat kiri, QR kanan" : "QR tengah, berat bawah"}
                </span>
              </span>
              {splitFormat ? <ToggleRight className="h-6 w-6 text-[#0f7963]" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
            </button>
          </div>

          <div className="rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:rounded-[26px] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">{editing ? `Edit ${editing.nomor_batch}` : "Berat"}</h3>
                <p className="mt-1 text-sm text-slate-500">Isi sampai 30 data, kosongkan baris yang tidak dicetak.</p>
              </div>
              <button
                type="button"
                onClick={resetWeights}
                title="Reset berat"
                className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-[#0f7963] transition hover:bg-emerald-100"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Kandang</span>
              <select value={selectedKandang} onChange={(event) => setSelectedKandang(event.target.value)} className="field-input">
                <option value="">Pilih kandang</option>
                {kandangOptions.map((option) => (
                  <option key={option.id_kandang} value={option.id_kandang}>
                    {formatKandangLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Tanggal Produksi</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="field-input"
              />
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {weights.map((weight, index) => (
                <label key={index} className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Berat {index + 1}</span>
                  <input
                    value={weight}
                    onChange={(event) => updateWeight(index, event.target.value)}
                    inputMode="decimal"
                    className="field-input py-2.5"
                    placeholder={`Berat ${index + 1}`}
                  />
                </label>
              ))}
            </div>

            {message ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-[#0f7963]">
                {message}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isPrinting}
                onClick={() => void printAll()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d] disabled:opacity-70 sm:w-auto"
              >
                <Printer className="h-4 w-4" />
                {isPrinting ? "Mencetak..." : "Print"}
              </button>
              <button
                type="button"
                onClick={() => void saveBatch()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-950/10 bg-white px-5 py-3 text-sm font-semibold text-[#0f7963] transition hover:bg-emerald-50 sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {editing ? "Update Batch" : "Simpan Batch"}
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:rounded-[26px] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Preview Format</h3>
              <p className="mt-1 text-sm text-slate-500">Printer mencetak QR native di tengah, lalu teks berat double-size dan satuan kg.</p>
            </div>
            {!serialSupported ? <CircleAlert className="h-5 w-5 shrink-0 text-amber-500" /> : null}
          </div>

          <div className="mt-5 flex justify-center rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] p-3 sm:p-4">
            <div className="w-full max-w-[288px] bg-white px-3 py-5 text-center shadow-sm sm:px-6 sm:py-7">
              {splitFormat ? (
                <div className="flex items-center justify-center gap-3 sm:justify-between sm:gap-4">
                  <p className="min-w-0 text-left text-3xl font-bold tracking-normal text-slate-950 sm:pl-8 sm:text-5xl">{selectedPreview || "0"}</p>
                  <div className="grid h-[96px] w-[96px] shrink-0 grid-cols-5 grid-rows-5 gap-0.5 bg-white p-1 ring-1 ring-slate-200 sm:h-[118px] sm:w-[118px]">
                    {Array.from({ length: 25 }, (_, index) => (
                      <span
                        key={index}
                        className={[
                          "block",
                          index % 2 === 0 || index === 7 || index === 13 || index === 21 ? "bg-slate-950" : "bg-white",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mx-auto grid h-[125px] w-[125px] grid-cols-5 grid-rows-5 gap-1 bg-white p-2 ring-1 ring-slate-200">
                    {Array.from({ length: 25 }, (_, index) => (
                      <span
                        key={index}
                        className={[
                          "block",
                          index % 2 === 0 || index === 7 || index === 13 || index === 21 ? "bg-slate-950" : "bg-white",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                  <p className="mt-7 text-3xl font-bold tracking-normal text-slate-950">{selectedPreview || "0"} <span className="text-base font-semibold">kg</span></p>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Command print</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <CommandRow label="Reset + Center" value="1B 40, 1B 61 01" />
              <CommandRow label="QR" value="Model 2, Size 8, Error M" />
              <CommandRow label="Format" value={splitFormat ? "Format 2" : "Format 1"} />
              <CommandRow label="Text" value="GS ! 11, data + spasi, GS ! 00, kg" />
              <CommandRow label="Feed + Cut" value="1B 64 05, 1D 56 41 10" />
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <div className="rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:rounded-[26px] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">{selected.nomor_batch}</h3>
              <p className="mt-1 text-sm text-slate-500">{selected.tanggal} - {formatBatchKandang(selected)}</p>
            </div>
            <span className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#0f7963]">{formatNumber(selected.total_berat)} kg</span>
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
            <QrBatchCard
              key={row.id}
              row={row}
              onShow={() => setSelected(row)}
              onEdit={() => editBatch(row)}
              onPrint={() => void printProductionBatch(row)}
              onDelete={() => void deleteBatch(row)}
            />
          )) : (
            <div className="py-4 text-sm text-slate-500">Belum ada batch QR.</div>
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
        <div className="grid min-w-[980px] grid-cols-[1fr_1.4fr_1fr_1fr_220px] bg-[#f3fbf5] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>Tanggal</span>
          <span>Kandang</span>
          <span>No Batch</span>
          <span>Total</span>
          <span>Aksi</span>
        </div>
          {rows.length > 0 ? rows.map((row) => (
            <div key={row.id} className="grid min-w-[980px] grid-cols-[1fr_1.4fr_1fr_1fr_220px] items-center border-t border-emerald-950/5 px-5 py-4 text-sm text-slate-700">
              <span>{row.tanggal}</span>
              <span className="font-semibold text-slate-900">{formatBatchKandang(row)}</span>
              <span className="font-semibold text-slate-900">{row.nomor_batch}</span>
              <span>{formatNumber(row.total_berat)} kg</span>
              <span className="flex flex-wrap gap-2">
                <IconButton title="Show" onClick={() => setSelected(row)} icon={Eye} />
                <IconButton title="Edit" onClick={() => editBatch(row)} icon={Pencil} />
                <IconButton title="Print QR Produksi" onClick={() => void printProductionBatch(row)} icon={Printer} />
                <IconButton title="Delete" onClick={() => void deleteBatch(row)} icon={Trash2} danger />
              </span>
            </div>
          )) : (
            <div className="px-5 py-8 text-sm text-slate-500">Belum ada batch QR.</div>
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
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "grid h-9 w-9 place-items-center rounded-xl transition",
        danger ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-[#0f7963] hover:bg-emerald-100",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function QrBatchCard({
  row,
  onShow,
  onEdit,
  onPrint,
  onDelete,
}: {
  row: QrPrintBatch;
  onShow: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-950/5 bg-white p-4 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{row.nomor_batch}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{row.tanggal}</p>
        </div>
        <span className="shrink-0 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0f7963]">
          {formatNumber(row.total_berat)} kg
        </span>
      </div>
      <p className="mt-3 break-words text-sm font-semibold text-slate-800">{formatBatchKandang(row)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <IconButton title="Show" onClick={onShow} icon={Eye} />
        <IconButton title="Edit" onClick={onEdit} icon={Pencil} />
        <IconButton title="Print QR Produksi" onClick={onPrint} icon={Printer} />
        <IconButton title="Delete" onClick={onDelete} icon={Trash2} danger />
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Printer; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f6fbf8] px-4 py-3">
      <div className="flex items-center gap-2 text-[#0f7963]">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CommandRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}
