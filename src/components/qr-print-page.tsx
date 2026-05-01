"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, PlugZap, Printer, RefreshCcw, Scissors, Usb } from "lucide-react";
import { PageHeader } from "@/components/page-shell";

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

const INPUT_COUNT = 10;
const DEFAULT_BAUD_RATE = 9600;
const encoder = new TextEncoder();

const escpos = {
  reset: [0x1b, 0x40],
  alignCenter: [0x1b, 0x61, 0x01],
  qrModel2: [0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00],
  qrSize8: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x08],
  qrErrorM: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31],
  qrPrint: [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30],
  feed7: [0x1b, 0x64, 0x07],
  doubleSize: [0x1d, 0x21, 0x11],
  normalSize: [0x1d, 0x21, 0x00],
  feed5: [0x1b, 0x64, 0x05],
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

function buildQrPrintPayload(dataQR: string) {
  const qrData = encoder.encode(dataQR);
  const length = qrData.length + 3;

  return concatBytes([
    bytes(escpos.reset),
    bytes(escpos.alignCenter),
    bytes(escpos.qrModel2),
    bytes(escpos.qrSize8),
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

export function QrPrintPage() {
  const [weights, setWeights] = useState<string[]>(() => Array.from({ length: INPUT_COUNT }, () => ""));
  const [port, setPort] = useState<SerialPortLike | null>(null);
  const [baudRate, setBaudRate] = useState(String(DEFAULT_BAUD_RATE));
  const [message, setMessage] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  const printableWeights = useMemo(() => weights.map((weight) => weight.trim()).filter(Boolean), [weights]);
  const selectedPreview = printableWeights[0] ?? weights.find((weight) => weight.trim()) ?? "";
  const serialSupported = typeof navigator !== "undefined" && Boolean((navigator as NavigatorWithSerial).serial);

  const updateWeight = (index: number, value: string) => {
    setWeights((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

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
        await writePayload(port, buildQrPrintPayload(weight), resolvedBaudRate);
        await sleep(1500);
      }

      setMessage("Selesai mencetak semua data.");
    } catch (error) {
      setMessage(`Koneksi printer gagal: ${error instanceof Error ? error.message : "error tidak diketahui"}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const resetWeights = () => {
    setWeights(Array.from({ length: INPUT_COUNT }, () => ""));
    setMessage("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR Print"
        description="Cetak QR berat telur ke printer thermal dengan format native yang sama seperti aplikasi Android."
      />

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
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
              <InfoTile icon={CheckCircle2} label="Antrian" value={`${printableWeights.length} data`} />
            </div>
          </div>

          <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Berat</h3>
                <p className="mt-1 text-sm text-slate-500">Isi sampai 10 data, kosongkan baris yang tidak dicetak.</p>
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

            <button
              type="button"
              disabled={isPrinting}
              onClick={() => void printAll()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d] disabled:opacity-70 sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? "Mencetak..." : "Print"}
            </button>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Preview Format</h3>
              <p className="mt-1 text-sm text-slate-500">Printer mencetak QR native di tengah, lalu teks berat double-size dan satuan kg.</p>
            </div>
            {!serialSupported ? <CircleAlert className="h-5 w-5 shrink-0 text-amber-500" /> : null}
          </div>

          <div className="mt-5 flex justify-center rounded-2xl border border-emerald-950/5 bg-[#f6fbf8] p-4">
            <div className="w-full max-w-[288px] bg-white px-6 py-7 text-center shadow-sm">
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
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Command print</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <CommandRow label="Reset + Center" value="1B 40, 1B 61 01" />
              <CommandRow label="QR" value="Model 2, Size 8, Error M" />
              <CommandRow label="Text" value="GS ! 11, data + spasi, GS ! 00, kg" />
              <CommandRow label="Feed + Cut" value="1B 64 05, 1D 56 41 10" />
            </div>
          </div>
        </div>
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
