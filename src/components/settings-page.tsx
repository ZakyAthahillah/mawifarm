"use client";

import { useState, type FormEvent } from "react";
import { getApiBase, getJsonHeaders, readApiError, readJsonResponse } from "@/components/api";
import { PageHeader } from "@/components/page-shell";
import { useAuth } from "@/components/providers";
import { KeyRound } from "lucide-react";

export function SettingsPage() {
  const { token, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${getApiBase()}/change-password`, {
        method: "POST",
        credentials: "include",
        headers: getJsonHeaders({
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }),
        body: JSON.stringify({
          current_password: currentPassword,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await readJsonResponse<{ status?: boolean; message?: string }>(response).catch(() => null);

      if (!response.ok || !data?.status) {
        throw new Error(data?.message || await readApiError(response));
      }

      setMessage(data.message || "Password berhasil diganti");
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Gagal mengganti password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Akun" description="Kelola keamanan akun dan password login." />

      <form onSubmit={(event) => void submit(event)} className="w-full rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_12px_32px_rgba(7,46,40,0.08)] backdrop-blur-xl sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="rounded-2xl bg-emerald-50/70 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#0f7963] shadow-sm">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Ganti Password</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Akun: <span className="font-semibold text-slate-900">{user?.username ?? "-"}</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Gunakan password minimal 8 karakter. Setelah disimpan, gunakan password baru untuk login berikutnya.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Password Lama</span>
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="field-input" required />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">Password Baru</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field-input" minLength={8} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">Ulangi Password Baru</span>
                <input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="field-input" minLength={8} required />
              </label>
            </div>

            {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-[#0f7963]">{message}</p> : null}
            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

            <div>
              <button disabled={loading} className="rounded-2xl bg-[#0f7963] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d] disabled:opacity-70">
                {loading ? "Menyimpan..." : "Simpan Password"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
