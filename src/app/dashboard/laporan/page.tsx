import { DataTablePage } from "@/components/page-shell";

export default function LaporanPage() {
  return (
    <DataTablePage
      title="Laporan"
      description="Daftar laporan yang siap dibuka atau diunduh."
      columns={["Nama Laporan", "Periode", "Status", "Aksi"]}
      rows={[]}
    />
  );
}
