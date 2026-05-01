import { SectionShowView } from "@/components/section-workbench";

export default async function ProduksiShowPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;

  return <SectionShowView section="produksi" id={params.id} />;
}
