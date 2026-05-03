"use client";

import { useCallback, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

type DialogState = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

export function useConfirmDialog() {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setDialog({
      confirmLabel: options.variant === "danger" ? "Hapus" : "Lanjutkan",
      cancelLabel: "Batal",
      variant: "default",
      ...options,
      resolve,
    });
  }), []);

  const close = useCallback((confirmed: boolean) => {
    setDialog((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const ConfirmDialog = useCallback((): ReactNode => {
    if (!dialog) return null;

    const danger = dialog.variant === "danger";
    const Icon = danger ? AlertTriangle : CheckCircle2;

    return (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
          <div className="flex items-start gap-4 p-5">
            <div className={[
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
              danger ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-[#0f7963]",
            ].join(" ")}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-slate-950">{dialog.title}</h2>
              {dialog.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{dialog.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => close(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100"
              aria-label="Tutup dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => close(false)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {dialog.cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              className={[
                "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition",
                danger
                  ? "bg-rose-600 shadow-rose-950/10 hover:bg-rose-700"
                  : "bg-[#0f7963] shadow-emerald-950/10 hover:bg-[#0d6f5d]",
              ].join(" ")}
            >
              {dialog.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }, [close, dialog]);

  return { confirm, ConfirmDialog };
}
