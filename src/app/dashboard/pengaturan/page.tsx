import { DataTablePage } from "@/components/page-shell";

export default function PengaturanPage() {
  return (
    <DataTablePage
      title="Pengaturan"
      description="Konfigurasi aplikasi dan preferensi sistem."
      columns={["Item", "Nilai", "Status", "Aksi"]}
      rows={[]}
    />
  );
}
