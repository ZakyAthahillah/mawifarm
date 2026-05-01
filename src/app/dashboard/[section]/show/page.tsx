import { SectionShowView } from "@/components/section-workbench";
import { notFound } from "next/navigation";

const sections = new Set(["kandang", "produksi", "pakan", "operasional"]);

export default async function ShowPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const routeParams = await params;
  const query = await searchParams;

  if (!sections.has(routeParams.section)) {
    notFound();
  }

  return (
    <SectionShowView
      section={routeParams.section as "kandang" | "produksi" | "pakan" | "operasional"}
      id={query.id}
    />
  );
}
