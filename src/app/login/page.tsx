import { LoginForm } from "@/components/auth-forms";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(105,216,95,0.26),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(17,122,99,0.16),_transparent_30%),linear-gradient(180deg,_#1a8b71_0%,_#11836c_48%,_#0f7963_100%)]" />

      <section className="glass-panel w-full max-w-[440px] rounded-[32px] p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-center">
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-white shadow-lg shadow-emerald-950/10 ring-2 ring-white">
            <Image
              src="/mawi-farm-logo.png"
              alt="Mawi Farm"
              fill
              sizes="64px"
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">MawiFarm</h1>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
