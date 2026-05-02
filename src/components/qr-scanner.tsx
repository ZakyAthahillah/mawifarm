"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";
import { Camera, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function QrScannerPanel({ onScan, compact = false }: { onScan: (value: string) => void; compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<{ stop: () => Promise<void> | void } | null>(null);
  const lastScanRef = useRef("");
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");

  const stop = async () => {
    try {
      await controlsRef.current?.stop?.();
    } catch {
      // kamera sudah berhenti atau device tidak lagi tersedia
    } finally {
      controlsRef.current = null;
      setActive(false);
    }
  };

  useEffect(() => {
    return () => {
      void stop();
    };
  }, []);

  const start = async () => {
    setMessage("");
    lastScanRef.current = "";

    if (!videoRef.current) {
      setMessage("Elemen kamera belum siap.");
      return;
    }

    try {
      if (!readerRef.current) {
        readerRef.current = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 100,
          delayBetweenScanSuccess: 150,
          tryPlayVideoTimeout: 15000,
        });
        readerRef.current.possibleFormats = [BarcodeFormat.QR_CODE];
        readerRef.current.hints.set(DecodeHintType.TRY_HARDER, true);
      }

      await stop();
      setActive(true);

      const controls = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const value = result.getText().trim();
            if (value && value !== lastScanRef.current) {
              lastScanRef.current = value;
              onScan(value);
              setMessage(`Scan masuk: ${value}`);
              window.setTimeout(() => {
                void stop();
              }, 150);
            }
            return;
          }

          if (error && !(error instanceof NotFoundException)) {
            setMessage("Kamera aktif, tapi QR belum terbaca.");
          }
        }
      );

      controlsRef.current = controls;
    } catch {
      setActive(false);
      setMessage("Kamera tidak bisa dibuka. Pastikan izin kamera aktif dan buka web lewat localhost/HTTPS.");
    }
  };

  const decodeImageFile = async (file: File) => {
    setMessage("");

    if (!readerRef.current) {
      readerRef.current = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 100,
        delayBetweenScanSuccess: 150,
        tryPlayVideoTimeout: 15000,
      });
      readerRef.current.possibleFormats = [BarcodeFormat.QR_CODE];
      readerRef.current.hints.set(DecodeHintType.TRY_HARDER, true);
    }

    const url = URL.createObjectURL(file);

    try {
      const result = await readerRef.current.decodeFromImageUrl(url);
      const value = result.getText().trim();
      if (value) {
        lastScanRef.current = value;
        onScan(value);
        setMessage(`Scan masuk: ${value}`);
      } else {
        setMessage("Gambar belum terbaca.");
      }
    } catch {
      setMessage("Gambar belum terbaca. Coba foto yang lebih tajam atau QR yang lebih besar.");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={compact ? "rounded-2xl bg-[#f6fbf8] p-3" : "rounded-2xl bg-[#f6fbf8] p-4"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Scan QR Berat</p>
          {!compact ? (
            <p className="mt-1 text-sm text-slate-500">Hasil scan otomatis masuk ke kolom berat kosong berikutnya.</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void start()}
            disabled={active}
            className={compact
              ? "inline-flex items-center gap-2 rounded-xl bg-[#0f7963] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0d6f5d] disabled:opacity-60"
              : "inline-flex items-center gap-2 rounded-2xl bg-[#0f7963] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d6f5d] disabled:opacity-60"}
          >
            <Camera className="h-4 w-4" />
            Scan
          </button>
          <button
            type="button"
            onClick={() => void stop()}
            disabled={!active}
            className={compact
              ? "inline-flex items-center gap-2 rounded-xl border border-emerald-950/10 bg-white px-3 py-2 text-xs font-semibold text-[#0f7963] transition hover:bg-emerald-50 disabled:opacity-60"
              : "inline-flex items-center gap-2 rounded-2xl border border-emerald-950/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0f7963] transition hover:bg-emerald-50 disabled:opacity-60"}
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={compact
              ? "inline-flex items-center gap-2 rounded-xl border border-emerald-950/10 bg-white px-3 py-2 text-xs font-semibold text-[#0f7963] transition hover:bg-emerald-50"
              : "inline-flex items-center gap-2 rounded-2xl border border-emerald-950/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0f7963] transition hover:bg-emerald-50"}
          >
            Upload QR
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            void stop();
            void decodeImageFile(file);
          }
        }}
      />

      <div className={active ? "mt-4 overflow-hidden rounded-2xl border border-emerald-950/10 bg-black" : "mt-4 hidden"}>
        <div className="relative aspect-video w-full overflow-hidden">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),rgba(255,255,255,0.04))]" />

          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-[62%] w-[62%] min-w-[180px] min-h-[180px] max-w-[320px] max-h-[320px] rounded-3xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(8,15,13,0.18)]">
              <span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-[#69d85f] rounded-tl-2xl" />
              <span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-[#69d85f] rounded-tr-2xl" />
              <span className="absolute left-0 bottom-0 h-8 w-8 border-b-4 border-l-4 border-[#69d85f] rounded-bl-2xl" />
              <span className="absolute right-0 bottom-0 h-8 w-8 border-b-4 border-r-4 border-[#69d85f] rounded-br-2xl" />

              <div className="absolute inset-x-4 top-4 rounded-full bg-black/55 px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                Taruh QR di dalam kotak
              </div>

              <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-white/30" />
              <div className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 bg-white/30" />

              <div className="absolute inset-x-0 bottom-4 text-center text-xs font-medium text-white/90">
                Tahan QR tetap diam 1-2 detik
              </div>
            </div>
          </div>
        </div>
      </div>

      {!compact ? (
        <p className="mt-3 text-xs text-slate-500">
          Pusatkan QR di kotak hijau. Setelah terbaca, kamera akan berhenti sendiri. Tekan Scan lagi untuk data berikutnya.
        </p>
      ) : null}

      {message ? <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
