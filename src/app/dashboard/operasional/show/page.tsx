import { SectionShowView } from "@/components/section-workbench";

export default async function OperasionalShowPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;

  return <SectionShowView section="operasional" id={params.id} />;
}
