import { SectionShowView } from "@/components/section-workbench";

export default async function PakanShowPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;

  return <SectionShowView section="pakan" id={params.id} />;
}
