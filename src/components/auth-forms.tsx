"use client";

import { ArrowRight, Eye, EyeOff, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiBase, getJsonHeaders, readJsonResponse } from "@/components/api";
import { useAuth } from "@/components/providers";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch(`${getApiBase()}/login`, {
        method: "POST",
        credentials: "include",
        headers: getJsonHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ username, password }),
      });

      const data = (await readJsonResponse(response)) as {
        status: boolean;
        message: string;
        data?: { name: string; username: string; role: string };
        token?: { access_token: string };
      };

      if (!response.ok || !data.status || !data.token || !data.data) {
        throw new Error(data.message || "Login gagal");
      }

      login({ token: data.token.access_token, user: data.data });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-600">Username</label>
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 shadow-sm">
          <UserRound className="h-5 w-5 text-[#0f7963]" />
          <input
            name="username"
            required
            placeholder="Masukkan username"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-600">Password</label>
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-[#0f7963]" />
          <input
            name="password"
            type={show ? "text" : "password"}
            required
            placeholder="Masukkan password"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={() => setShow((value) => !value)} className="text-slate-400">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f7963] px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#0d6f5d] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Memproses..." : "Login"}
        <ArrowRight className="h-4 w-4" />
      </button>

      <div aria-hidden="true" className="h-1" />
    </form>
  );
}
