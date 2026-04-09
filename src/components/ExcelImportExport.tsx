import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

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
  onImport: (rows: Record<string, string>[]) => void;
  columns: { key: string; label: string }[];
}

export function ImportCSVButton({ onImport, columns }: ImportCSVButtonProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          toast({ title: t("common.error"), variant: "destructive" });
          return;
        }
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        const rows = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const row: Record<string, string> = {};
          headers.forEach((h, i) => {
            const col = columns.find((c) => c.label === h || c.key === h);
            if (col) row[col.key] = values[i] ?? "";
          });
          return row;
        });
        onImport(rows);
        toast({ title: t("import.rows_imported", { count: rows.length }) });
      } catch {
        toast({ title: t("common.error"), variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Button variant="outline" size="sm" asChild>
      <label className="cursor-pointer">
        <Upload className="mr-2 h-3 w-3" />{t("common.import_csv")}
        <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </label>
    </Button>
  );
}
