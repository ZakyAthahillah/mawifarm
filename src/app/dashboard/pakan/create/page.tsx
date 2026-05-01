import { SectionCreateView } from "@/components/section-workbench";

export default async function PakanCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; id?: string }>;
}) {
  const params = await searchParams;

  return (
    <SectionCreateView
      section="pakan"
      mode={params.mode === "edit" ? "edit" : "create"}
      id={params.id}
    />
  );
}
