import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ImportDialog } from "@/components/ImportDialog";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns: { key: string; label: string }[];
}

export function ExportCSVButton({ data, filename, columns }: ExportButtonProps) {
  const { t } = useTranslation();

  const handleExport = () => {
    if (!data.length) return;
    const header = columns.map((c) => c.label).join(",");
    const rows = data.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        if (val == null) return "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={!data.length}>
      <Download className="mr-2 h-3 w-3" />{t("common.export_csv")}
    </Button>
  );
}

interface ImportCSVButtonProps {
  onImport: (rows: Record<string, string>[]) => Promise<void> | void;
  columns: { key: string; label: string }[];
  requiredKeys?: string[];
}

export function ImportCSVButton({ onImport, columns, requiredKeys }: ImportCSVButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-3 w-3" />{t("common.import_csv")}
      </Button>
      <ImportDialog
        open={open}
        onOpenChange={setOpen}
        columns={columns}
        requiredKeys={requiredKeys}
        onImport={async (rows) => { await onImport(rows); }}
      />
    </>
  );
}
