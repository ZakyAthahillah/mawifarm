import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, CircleDollarSign, Egg, Layers3, Warehouse } from "lucide-react";

type ActionLink = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

type RowAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "danger";
  icon?: ComponentType<{ className?: string }>;
};

const ownerMarker = "[[OWNER_UTAMA]]";

function CellText({ value, className = "" }: { value: string; className?: string }) {
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

export function PageHeader({
  title,
  description,
  actions = [],
}: {
  title: string;
  description: string;
  actions?: ActionLink[];
}) {
  return (
    <div className="mb-6 rounded-[22px] border border-white/85 bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(7,46,40,0.12)] backdrop-blur-xl sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-700 sm:text-base">{description}</p> : null}
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={`${action.label}-${action.href}`}
                href={action.href}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  action.variant === "secondary"
                    ? "border border-emerald-950/10 bg-white text-[#0f7963] hover:bg-emerald-50"
                    : "bg-[#0f7963] text-white shadow-lg shadow-emerald-950/10 hover:bg-[#0d6f5d]",
                ].join(" ")}
              >
                {action.label}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SectionHero({
  title,
  description,
  actionLabel,
}: {
  title: string;
  description: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-6 rounded-[22px] border border-white/85 bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(7,46,40,0.12)] backdrop-blur-xl sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-700 sm:text-base">{description}</p> : null}
        </div>
        {actionLabel ? (
          <button className="inline-flex items-center gap-2 self-start rounded-2xl bg-[#0f7963] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d]">
            {actionLabel}
            <ArrowUpRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  tone = "green",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  tone?: "green" | "mint" | "teal" | "amber";
}) {
  const tones = {
    green: "from-[#69d85f] to-[#46b86c]",
    mint: "from-[#b4e8bb] to-[#69d85f]",
    teal: "from-[#0f7963] to-[#19a985]",
    amber: "from-[#d8d06c] to-[#67d85f]",
  };

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm font-medium text-[#0f7963]">{delta}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${tones[tone]} text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function MiniPanel({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eefaf0] text-[#0f7963]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function PlaceholderTable({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description?: string;
  columns?: string[];
  rows: Array<[string, string, string]>;
}) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        <button className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#0f7963]">
          Lihat semua <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {rows.map(([name, status, value]) => (
          <div key={`${name}-${status}-${value}`} className="rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{name}</p>
                <p className="mt-1 text-sm text-slate-500">{status}</p>
              </div>
              <span className="text-right text-sm font-semibold text-[#0f7963]">{value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 hidden overflow-hidden rounded-2xl border border-emerald-950/5 md:block">
        <div className="grid grid-cols-3 bg-[#f3fbf5] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {(columns ?? ["Nama", "Status", "Nilai"]).map((column) => (
            <span key={column} className={column === "Nilai" ? "text-right" : ""}>
              {column}
            </span>
          ))}
        </div>
        {rows.map(([name, status, value]) => (
          <div key={`${name}-${status}-${value}`} className="grid grid-cols-3 border-t border-emerald-950/5 px-4 py-4 text-sm">
            <span className="font-medium text-slate-800">{name}</span>
            <span className="text-slate-500">{status}</span>
            <span className="text-right font-semibold text-[#0f7963]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataTablePage({
  title,
  description,
  columns,
  rows,
  actions,
  rowActions = [],
  emptyState = "Belum ada data",
  emptyHint = "",
}: {
  title: string;
  description: string;
  columns: string[];
  rows: Array<string[]>;
  actions?: ActionLink[];
  rowActions?: RowAction[];
  emptyState?: string;
  emptyHint?: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {actions?.length ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={`${action.label}-${action.href}`}
                href={action.href}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                  action.variant === "secondary"
                    ? "border border-emerald-950/10 bg-white text-[#0f7963] hover:bg-emerald-50"
                    : "bg-[#0f7963] text-white shadow-lg shadow-emerald-950/10 hover:bg-[#0d6f5d]",
                ].join(" ")}
              >
                {action.label}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7963]">Tabel data</div>
        )}
      </div>

      <div className="mt-5 space-y-3 md:hidden">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.join("-")} className="rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] px-4 py-4">
              <div className="space-y-2">
                {row.map((cell, index) => (
                  <div key={`${cell}-${index}`} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-slate-500">{columns[index]}</span>
                    {index === row.length - 1 && rowActions.length > 0 ? (
                      <div className="flex gap-2">
                        {rowActions.map((action) => (
                          <Link
                            key={`${action.label}-${action.href}`}
                            href={action.href}
                            aria-label={action.label}
                            title={action.label}
                            className={[
                              "inline-flex h-9 w-9 items-center justify-center rounded-xl transition",
                              action.variant === "secondary"
                                ? "border border-emerald-950/10 bg-white text-[#0f7963] hover:bg-emerald-50"
                                : action.variant === "danger"
                                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                  : "bg-[#0f7963] text-white hover:bg-[#0d6f5d]",
                            ].join(" ")}
                          >
                            {action.icon ? <action.icon className="h-4 w-4" /> : <span className="text-xs font-semibold">{action.label}</span>}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className={index === row.length - 1 ? "text-right font-semibold text-[#0f7963]" : "text-right text-slate-700"}>
                        {cell}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="grid place-items-center px-4 py-12 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">{emptyState}</p>
              {emptyHint ? <p className="mt-1 text-sm text-slate-500">{emptyHint}</p> : null}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-emerald-950/5 md:block">
        <div
          className="min-w-max grid bg-[#f3fbf5] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))` }}
        >
          {columns.map((column, index) => (
            <span key={column} className={index === columns.length - 1 ? "text-right" : ""}>
              {column}
            </span>
          ))}
        </div>

        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={row.join("-")}
              className="min-w-max grid border-t border-emerald-950/5 px-4 py-4 text-sm"
              style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))` }}
            >
              {row.map((cell, index) =>
                index === row.length - 1 && rowActions.length > 0 ? (
                  <div key={`${cell}-${index}`} className="flex justify-end gap-2">
                    {rowActions.map((action) => (
                      <Link
                        key={`${action.label}-${action.href}`}
                        href={action.href}
                        aria-label={action.label}
                        title={action.label}
                        className={[
                          "inline-flex h-9 w-9 items-center justify-center rounded-xl transition",
                          action.variant === "secondary"
                            ? "border border-emerald-950/10 bg-white text-[#0f7963] hover:bg-emerald-50"
                            : action.variant === "danger"
                              ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "bg-[#0f7963] text-white hover:bg-[#0d6f5d]",
                        ].join(" ")}
                      >
                        {action.icon ? <action.icon className="h-4 w-4" /> : <span className="text-xs font-semibold">{action.label}</span>}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span
                    key={`${cell}-${index}`}
                    className={index === row.length - 1 ? "text-right font-semibold text-[#0f7963]" : "text-slate-700"}
                  >
                    {cell}
                  </span>
                )
              )}
            </div>
          ))
        ) : (
          <div className="grid place-items-center px-4 py-12 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">{emptyState}</p>
              {emptyHint ? <p className="mt-1 text-sm text-slate-500">{emptyHint}</p> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function WideTablePage({
  title,
  columns,
  rows,
  rowActions = [],
  emptyState = "Belum ada data",
  emptyHint = "",
}: {
  title: string;
  description: string;
  columns: string[];
  rows: Array<string[]>;
  actions?: ActionLink[];
  rowActions?: RowAction[];
  emptyState?: string;
  emptyHint?: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
      <div className="mt-5 space-y-4">
        {rows.length > 0 ? (
          rows.map((row) => {
            const titleValue = row[0] ?? title;
            const subtitleValue = row[1] ?? "";
            const bodyCells = row.length > 2 ? row.slice(2) : [];
            const actionCell = rowActions.length > 0;
            const priceFields: Array<{ label: string; value: string }> = [];
            const detailFields: Array<{ label: string; value: string }> = [];

            bodyCells.forEach((cell, index) => {
              const label = columns[index + 2] ?? `Kolom ${index + 3}`;
              const lowerLabel = label.toLowerCase();
              const isHighlighted = lowerLabel.includes("harga") || lowerLabel.includes("total");

              if (isHighlighted) {
                priceFields.push({ label, value: cell });
              } else {
                detailFields.push({ label, value: cell });
              }
            });

            return (
              <div key={row.join("-")} className="rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] px-4 py-4">
                <div className="flex flex-col gap-1 border-b border-emerald-950/10 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Detail data</p>
                  <CellText value={titleValue} className="text-sm font-semibold text-slate-900" />
                  {subtitleValue ? <p className="text-sm text-slate-500">{subtitleValue}</p> : null}
                </div>

                {priceFields.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {priceFields.map((field) => (
                      <div key={`${field.label}-${field.value}`} className="rounded-2xl border border-[#0f7963]/20 bg-emerald-50 px-4 py-3 shadow-[0_1px_0_rgba(15,121,99,0.03)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0f7963]">{field.label}</p>
                        <div className="mt-2 border-t border-emerald-950/10 pt-2">
                          <CellText value={field.value} className="break-words text-sm font-semibold text-slate-950" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {detailFields.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {detailFields.map((field) => (
                      <div key={`${field.label}-${field.value}`} className="rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,121,99,0.03)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{field.label}</p>
                        <div className="mt-2 border-t border-slate-100 pt-2">
                          <CellText value={field.value} className="break-words text-sm font-semibold text-slate-900" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {actionCell ? (
                  <div className="mt-4 border-t border-emerald-950/10 pt-4 flex justify-end gap-2">
                    {rowActions.map((action) => (
                      <Link
                        key={`${action.label}-${action.href}`}
                        href={action.href}
                        aria-label={action.label}
                        title={action.label}
                        className={[
                          "inline-flex h-9 w-9 items-center justify-center rounded-xl transition",
                          action.variant === "secondary"
                            ? "border border-emerald-950/10 bg-white text-[#0f7963] hover:bg-emerald-50"
                            : action.variant === "danger"
                              ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "bg-[#0f7963] text-white hover:bg-[#0d6f5d]",
                        ].join(" ")}
                      >
                        {action.icon ? <action.icon className="h-4 w-4" /> : <span className="text-xs font-semibold">{action.label}</span>}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="grid place-items-center px-4 py-12 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">{emptyState}</p>
              {emptyHint ? <p className="mt-1 text-sm text-slate-500">{emptyHint}</p> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BottomGrid() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
      <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Aktivitas harian</p>
            <p className="mt-1 text-sm text-slate-500">Produksi, pakan, dan operasional bergerak stabil</p>
          </div>
          <div className="rounded-2xl bg-[#eefaf0] px-3 py-2 text-xs font-semibold text-[#0f7963]">Live</div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <MiniPanel
            icon={Egg}
            title="Produksi telur"
            description="Input produksi harian dengan form yang ringan, cocok juga untuk layar ponsel."
          />
          <MiniPanel
            icon={CircleDollarSign}
            title="Keuangan operasional"
            description="Pantau rak, gaji, dan biaya lain dari satu tampilan yang sederhana."
          />
          <MiniPanel
            icon={Warehouse}
            title="Data kandang"
            description="Lihat periode, populasi, dan kematian per kandang secara cepat."
          />
          <MiniPanel
            icon={Layers3}
            title="Laporan ringkas"
            description="Ringkasan harian hingga tahunan dengan layout yang tetap nyaman dibaca."
          />
        </div>
      </div>

      <PlaceholderTable
        title="Kandang terpantau"
        rows={[]}
      />
    </div>
  );
}
