import { SectionShowView } from "@/components/section-workbench";

export default async function KandangShowPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;

  return <SectionShowView section="kandang" id={params.id} />;
}
