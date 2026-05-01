"use client";

import {
  BarChart3,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Package2,
  PanelLeftClose,
  PanelRightClose,
  ShieldUser,
  ShoppingCart,
  Warehouse,
  Waves,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { getApiBase, ownerScopeStorageKey } from "@/components/api";
import { useAuth } from "@/components/providers";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kandang", href: "/dashboard/kandang", icon: Warehouse },
  { label: "Produksi", href: "/dashboard/produksi", icon: ClipboardList },
  { label: "Penjualan", href: "/dashboard/penjualan", icon: ShoppingCart },
  { label: "Pakan", href: "/dashboard/pakan", icon: Package2 },
  { label: "Operasional", href: "/dashboard/operasional", icon: FileClock },
  { label: "KPI Kandang", href: "/dashboard/fcr", icon: Waves },
  { label: "Performa", href: "/dashboard/performa", icon: BarChart3 },
  { label: "Users", href: "/dashboard/users", icon: ShieldUser },
];

function canAccessPath(role: string | undefined, pathname: string) {
  if (pathname === "/dashboard") {
    return true;
  }

  const deniedByRole: Record<string, string[]> = {
    developer: [],
    owner: ["/dashboard/users", "/dashboard/penjualan"],
    admin: ["/dashboard/users", "/dashboard/performa", "/dashboard/fcr"],
    user: ["/dashboard/users", "/dashboard/performa", "/dashboard/operasional"],
  };

  const blockedPrefixes = deniedByRole[role ?? "user"] ?? deniedByRole.user;
  return !blockedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, ready, token } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ownerScope, setOwnerScope] = useState("");

  const visibleNavItems = navItems.filter((item) => canAccessPath(user?.role, item.href));
  const ownerOptions = useMemo(() => user?.role === "admin" ? user.owner_options ?? [] : [], [user]);
  const displayedOwnerScope = ownerScope || (typeof window !== "undefined" ? window.localStorage.getItem(ownerScopeStorageKey) ?? "" : "") || (ownerOptions[0]?.id ? String(ownerOptions[0].id) : "");

  useEffect(() => {
    if (ready && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, ready, router, user]);

  useEffect(() => {
    if (ready && !canAccessPath(user?.role, pathname) && pathname !== "/login") {
      router.replace("/dashboard");
    }
  }, [pathname, ready, router, user?.role]);

  useEffect(() => {
    if (!ready || user?.role !== "admin" || ownerOptions.length === 0) return;

    const stored = window.localStorage.getItem(ownerScopeStorageKey);
    const fallback = String(ownerOptions[0].id);
    const nextOwner = stored && ownerOptions.some((owner) => String(owner.id) === stored) ? stored : fallback;

    window.localStorage.setItem(ownerScopeStorageKey, nextOwner);
  }, [ownerOptions, ready, user?.role]);

  useEffect(() => {
    if (ready && user?.role !== "admin") {
      window.localStorage.removeItem(ownerScopeStorageKey);
    }
  }, [ready, user?.role]);

  const handleLogout = async () => {
    try {
      await fetch(`${getApiBase()}/logout`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      });
    } finally {
      logout();
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen text-slate-900">
      <div className="flex min-h-screen w-full">
        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white backdrop-blur-xl transition-all duration-300 lg:flex",
            collapsed ? "w-[92px]" : "w-[288px]",
          ].join(" ")}
        >
          <div className="flex h-full w-full flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-5">
                <div className="flex items-center gap-3 overflow-hidden">
                  <MawiFarmLogo className="h-11 w-11" />
                </div>
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-[#0f7963] transition hover:bg-emerald-100"
              >
                {collapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                        active
                          ? "!bg-[#0f7963] !text-[#f8fffd] shadow-md shadow-emerald-950/10 ring-1 ring-white/10"
                          : "text-slate-600 hover:bg-emerald-50 hover:text-[#0f7963]",
                        collapsed ? "justify-center" : "",
                      ].join(" ")}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${active ? "!text-[#f8fffd]" : ""}`} />
                      {!collapsed && <span className={active ? "!text-[#f8fffd]" : ""}>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={handleLogout}
                className={[
                  "flex w-full items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-[#0f7963] transition hover:bg-emerald-100",
                  collapsed ? "justify-center px-0" : "",
                ].join(" ")}
              >
                <LogOut className="h-5 w-5" />
                {!collapsed && <span>Logout</span>}
              </button>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 w-[84vw] max-w-[320px] transform border-r border-slate-200 bg-white backdrop-blur-xl transition-transform duration-300 lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
              <MawiFarmLogo className="h-11 w-11" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-[#0f7963]"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                        active
                          ? "!bg-[#0f7963] !text-[#f8fffd] shadow-md shadow-emerald-950/10 ring-1 ring-white/10"
                          : "text-slate-600 hover:bg-emerald-50 hover:text-[#0f7963]",
                      ].join(" ")}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${active ? "!text-[#f8fffd]" : ""}`} />
                      <span className={active ? "!text-[#f8fffd]" : ""}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <div
          className={[
            "flex min-h-screen flex-1 flex-col transition-all duration-300",
            collapsed ? "lg:pl-[92px]" : "lg:pl-[288px]",
          ].join(" ")}
        >
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#0f7963] shadow-sm soft-border lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.name ?? "Mawi User"}</p>
                <p className="truncate text-xs text-slate-500">{user?.role ?? "admin"}</p>
              </div>

              {ownerOptions.length > 0 ? (
                <select
                  value={displayedOwnerScope}
                  onChange={(event) => {
                    window.localStorage.setItem(ownerScopeStorageKey, event.target.value);
                    setOwnerScope(event.target.value);
                    window.location.reload();
                  }}
                  className="hidden min-w-[180px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-[#0f7963] sm:block"
                  title="Input untuk owner"
                >
                  {ownerOptions.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              ) : null}

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:px-4"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function MawiFarmLogo({ className }: { className: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full bg-white shadow-lg shadow-emerald-900/15 ring-2 ring-emerald-50 ${className}`}>
      <Image
        src="/mawi-farm-logo.png"
        alt="Mawi Farm"
        fill
        sizes="44px"
        className="object-cover"
        priority
      />
    </div>
  );
}
