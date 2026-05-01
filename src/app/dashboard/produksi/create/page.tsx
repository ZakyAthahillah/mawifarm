import { SectionCreateView } from "@/components/section-workbench";

export default async function ProduksiCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; id?: string }>;
}) {
  const params = await searchParams;

  return (
    <SectionCreateView
      section="produksi"
      mode={params.mode === "edit" ? "edit" : "create"}
      id={params.id}
    />
  );
}
