"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { getApiBase, readJsonResponse } from "@/components/api";
import { PageHeader, StatCard } from "@/components/page-shell";
import { useAuth } from "@/components/providers";
import { BadgeCheck, PencilLine, Plus, ShieldUser, Trash2, UserRound, X } from "lucide-react";

type UserRecord = {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  owner_id?: number | null;
  owner_name?: string | null;
  owner_ids?: number[];
  owner_names?: string[];
  created_at?: string;
};

type UserForm = {
  name: string;
  email: string;
  username: string;
  password: string;
  role: string;
  owner_ids: string[];
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  username: "",
  password: "",
  role: "user",
  owner_ids: [],
};

const roleOptions = [
  { label: "Developer", value: "developer" },
  { label: "Admin", value: "admin" },
  { label: "Owner", value: "owner" },
  { label: "User", value: "user" },
];

function usersApi(path = "", options: RequestInit = {}) {
  return fetch(`${getApiBase()}/users${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

export function UsersAdminPage() {
  const { user, ready } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isDeveloper = user?.role === "developer";

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await usersApi();
      const data = (await readJsonResponse<{ status?: boolean; data?: UserRecord[] }>(response)) ?? {};

      if (!response.ok || !data.status) {
        throw new Error("Gagal memuat user");
      }

      setUsers(data.data ?? []);
    } catch {
      setUsers([]);
      setError("Tidak bisa memuat data user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !isDeveloper) return;
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, isDeveloper]);

  const stats = useMemo(() => {
    const total = users.length;
    const developer = users.filter((item) => item.role === "developer").length;
    const admin = users.filter((item) => item.role === "admin").length;
    return { total, developer, admin };
  }, [users]);

  const ownerUsers = useMemo(() => users.filter((item) => item.role === "owner"), [users]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  };

  const startEdit = (record: UserRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name ?? "",
      email: record.email ?? "",
      username: record.username ?? "",
      password: "",
      role: record.role ?? "user",
      owner_ids: (record.owner_ids ?? (record.owner_id ? [record.owner_id] : [])).map((id) => String(id)),
    });
    setMessage("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDeveloper) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const payload: Record<string, string | string[] | null> = {
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        role: form.role,
      };

      payload.owner_ids = form.role === "admin" ? form.owner_ids : [];
      payload.owner_id = form.role === "admin" ? form.owner_ids[0] ?? null : null;

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const response = await usersApi(editingId ? `/${editingId}` : "", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      const data = (await readJsonResponse<{ status?: boolean; message?: string }>(response).catch(() => null)) ?? null;

      if (!response.ok || !data?.status) {
        throw new Error(data?.message || "Gagal menyimpan user");
      }

      setMessage(data.message || "User berhasil disimpan");
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan user");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (record: UserRecord) => {
    if (!isDeveloper) return;
    if (!window.confirm(`Hapus user ${record.name}?`)) return;

    setLoading(true);
    setError("");

    try {
      const response = await usersApi(`/${record.id}`, { method: "DELETE" });
      const data = (await readJsonResponse<{ status?: boolean; message?: string }>(response).catch(() => null)) ?? null;

      if (!response.ok || !data?.status) {
        throw new Error(data?.message || "Gagal menghapus user");
      }

      setMessage(data.message || "User berhasil dihapus");
      await loadUsers();
      if (editingId === record.id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus user");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="rounded-[26px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        Memuat sesi...
      </div>
    );
  }

  if (!isDeveloper) {
    return (
      <div className="rounded-[26px] border border-white/70 bg-white/85 p-6 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
        <p className="text-sm font-semibold text-slate-900">Akses khusus developer.</p>
        <p className="mt-1 text-sm text-slate-500">Menu ini digunakan untuk mengelola akun dan role pengguna.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Kelola akun, role akses, dan data login pengguna."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShieldUser} label="Total user" value={String(stats.total)} delta="Semua akun" tone="green" />
        <StatCard icon={BadgeCheck} label="Developer" value={String(stats.developer)} delta="Akses penuh" tone="mint" />
        <StatCard icon={UserRound} label="Admin" value={String(stats.admin)} delta="Role admin" tone="teal" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={(event) => void submit(event)} className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit User" : "Tambah User"}</h2>
              <p className="text-sm text-slate-500">Semua akun dan role dikelola dari sini.</p>
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Batal
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Nama">
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="field-input" placeholder="Nama user" required />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="field-input" placeholder="email@contoh.com" required />
            </Field>
            <Field label="Username">
              <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} className="field-input" placeholder="username" required />
            </Field>
            <Field label="Password">
              <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="field-input" placeholder={editingId ? "Kosongkan jika tidak diubah" : "Password baru"} required={!editingId} />
            </Field>
            <Field label="Role">
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value, owner_ids: event.target.value === "admin" ? current.owner_ids : [] }))} className="field-input">
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            {form.role === "admin" ? (
              <Field label="Owner Data">
                <div className="grid gap-2 rounded-2xl border border-emerald-950/10 bg-white p-3">
                  {ownerUsers.length ? ownerUsers.map((owner) => {
                    const value = String(owner.id);
                    const checked = form.owner_ids.includes(value);

                    return (
                      <label key={owner.id} className="flex items-center gap-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            owner_ids: event.target.checked
                              ? [...current.owner_ids, value]
                              : current.owner_ids.filter((id) => id !== value),
                          }))}
                          className="h-4 w-4 rounded border-slate-300 text-[#0f7963]"
                        />
                        <span>{owner.name}</span>
                      </label>
                    );
                  }) : (
                    <p className="text-sm text-slate-500">Belum ada akun owner.</p>
                  )}
                </div>
              </Field>
            ) : null}
          </div>

          {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-[#0f7963]">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

          <button
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d] disabled:opacity-70"
          >
            <Plus className="h-4 w-4" />
            {loading ? "Menyimpan..." : editingId ? "Update User" : "Tambah User"}
          </button>
        </form>

        <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Daftar User</h2>
              <p className="text-sm text-slate-500">Klik edit untuk ubah akun yang sudah ada.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-5 space-y-3 md:hidden">
            {users.map((record) => (
              <div key={record.id} className="rounded-2xl border border-emerald-950/5 bg-[#fbfdfb] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{record.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">{record.role}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0f7963]">{record.username}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <Row label="Email" value={record.email} />
                  <Row label="Owner Data" value={record.role === "admin" ? ownerNames(record) : "-"} />
                  <Row label="Dibuat" value={record.created_at ?? "-"} />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => startEdit(record)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f7963] text-white hover:bg-[#0d6f5d]">
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => void remove(record)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {!users.length ? <div className="rounded-2xl border border-dashed border-emerald-950/10 bg-white px-4 py-8 text-sm text-slate-500">Belum ada user.</div> : null}
          </div>

          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-emerald-950/5 md:block">
            <div className="grid grid-cols-[1.1fr_1fr_0.75fr_0.75fr_0.85fr_0.8fr_0.75fr] bg-[#f3fbf5] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {["Nama", "Email", "Username", "Role", "Owner", "Dibuat", "Aksi"].map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>
            {users.map((record) => (
              <div key={record.id} className="grid grid-cols-[1.1fr_1fr_0.75fr_0.75fr_0.85fr_0.8fr_0.75fr] border-t border-emerald-950/5 px-4 py-4 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{record.name}</span>
                <span>{record.email}</span>
                <span>{record.username}</span>
                <span className="capitalize">{record.role}</span>
                <span>{record.role === "admin" ? ownerNames(record) : "-"}</span>
                <span>{record.created_at ?? "-"}</span>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => startEdit(record)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f7963] text-white hover:bg-[#0d6f5d]">
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => void remove(record)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {!users.length ? <div className="px-4 py-8 text-sm text-slate-500">Belum ada user.</div> : null}
          </div>
        </div>
      </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-700">{value}</span>
    </div>
  );
}

function ownerNames(record: UserRecord) {
  if (record.owner_names?.length) {
    return record.owner_names.join(", ");
  }

  return record.owner_name ?? "Data sendiri";
}
