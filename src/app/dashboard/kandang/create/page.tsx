import { SectionCreateView } from "@/components/section-workbench";

export default async function KandangCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; id?: string }>;
}) {
  const params = await searchParams;

  return (
    <SectionCreateView
      section="kandang"
      mode={params.mode === "edit" ? "edit" : "create"}
      id={params.id}
    />
  );
}
