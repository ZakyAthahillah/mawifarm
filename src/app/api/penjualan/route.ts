import { NextResponse } from "next/server";
import { resolveSaleTarget } from "@/lib/sale-targets";

type PenjualanPayload = {
  kandang?: string;
  nota?: string;
  tanggal?: string;
  weights?: Array<string | number | null | undefined>;
  totalWeight?: number;
  price?: number;
  totalPrice?: number;
};

function toNumber(value: unknown) {
  const normalized = String(value ?? "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PenjualanPayload;
    const target = body.kandang ? resolveSaleTarget(body.kandang) : null;

    if (!target) {
      return NextResponse.json({ ok: false, message: "Kandang tidak valid." }, { status: 400 });
    }

    const payload = new URLSearchParams();
    payload.set("Nama_Kandang", body.kandang ?? "");
    payload.set("Nomor_Nota", body.nota ?? "");
    payload.set("Tanggal", body.tanggal ?? "");

    (body.weights ?? []).forEach((value, index) => {
      payload.set(`Berat${index + 1}`, String(toNumber(value)));
    });

    payload.set("Total", String(body.totalWeight ?? 0));
    payload.set("Harga_Per_Kilo", String(body.price ?? 0));
    payload.set("Total_Harga", String(body.totalPrice ?? 0));

    const upstream = await fetch(target.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: payload.toString(),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Target Google Script menolak request.",
          detail: text.slice(0, 200),
        },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ ok: true, message: "Data penjualan berhasil dikirim." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, message: "Gagal mengirim data penjualan.", detail: message },
      { status: 500 }
    );
  }
}
