import { SectionCreateView } from "@/components/section-workbench";
import { notFound } from "next/navigation";

const sections = new Set(["kandang", "produksi", "pakan", "operasional"]);

export default async function CreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ mode?: string; id?: string }>;
}) {
  const routeParams = await params;
  const query = await searchParams;

  if (!sections.has(routeParams.section)) {
    notFound();
  }

  return (
    <SectionCreateView
      section={routeParams.section as "kandang" | "produksi" | "pakan" | "operasional"}
      mode={query.mode === "edit" ? "edit" : "create"}
      id={query.id}
    />
  );
}
