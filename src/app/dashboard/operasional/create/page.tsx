import { SectionCreateView } from "@/components/section-workbench";

export default async function OperasionalCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; id?: string }>;
}) {
  const params = await searchParams;

  return (
    <SectionCreateView
      section="operasional"
      mode={params.mode === "edit" ? "edit" : "create"}
      id={params.id}
    />
  );
}
