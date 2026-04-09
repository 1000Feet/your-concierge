import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { parseCSV } from "@/lib/csv-parser";
import { autoMapColumns, type ColumnDef } from "@/lib/column-mapper";
import { useToast } from "@/hooks/use-toast";

type Step = "upload" | "mapping" | "preview" | "importing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDef[];
  requiredKeys?: string[];
  onImport: (rows: Record<string, string>[]) => Promise<void>;
  title?: string;
}

export function ImportDialog({ open, onOpenChange, columns, requiredKeys = [], onImport, title = "Importa CSV" }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<number[]>([]);

  const reset = () => { setStep("upload"); setFileHeaders([]); setFileRows([]); setMapping({}); setErrors([]); };

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) { toast({ title: "File vuoto", variant: "destructive" }); return; }
      setFileHeaders(headers);
      setFileRows(rows);
      setMapping(autoMapColumns(headers, columns));
      setStep("mapping");
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [columns, toast]);

  const mappedRows = (): Record<string, string>[] => {
    return fileRows.map((row) => {
      const obj: Record<string, string> = {};
      fileHeaders.forEach((h, i) => {
        const key = mapping[h];
        if (key) obj[key] = row[i] ?? "";
      });
      return obj;
    });
  };

  const validateAndPreview = () => {
    const rows = mappedRows();
    const errs: number[] = [];
    rows.forEach((r, i) => {
      if (requiredKeys.some((k) => !r[k]?.trim())) errs.push(i);
    });
    setErrors(errs);
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    try {
      const rows = mappedRows().filter((_, i) => !errors.includes(i));
      await onImport(rows);
      toast({ title: `${rows.length} righe importate` });
      onOpenChange(false);
      reset();
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
      setStep("preview");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Seleziona un file CSV</p>
            <Button asChild variant="outline">
              <label className="cursor-pointer">
                Scegli File
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              </label>
            </Button>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Mappa le colonne del file ai campi del sistema</p>
            <div className="space-y-2">
              {fileHeaders.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <span className="w-40 text-sm font-medium truncate">{h}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Select value={mapping[h] ?? ""} onValueChange={(v) => setMapping({ ...mapping, [h]: v })}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Ignora" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Ignora</SelectItem>
                      {columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>Indietro</Button>
              <Button onClick={validateAndPreview}>Anteprima</Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{fileRows.length - errors.length} valide</Badge>
              {errors.length > 0 && <Badge variant="destructive">{errors.length} con errori</Badge>}
            </div>
            <div className="max-h-60 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {columns.filter((c) => Object.values(mapping).includes(c.key)).map((c) => (
                      <TableHead key={c.key}>{c.label}</TableHead>
                    ))}
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows().slice(0, 50).map((row, i) => (
                    <TableRow key={i} className={errors.includes(i) ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      {columns.filter((c) => Object.values(mapping).includes(c.key)).map((c) => (
                        <TableCell key={c.key} className="text-xs">{row[c.key] ?? ""}</TableCell>
                      ))}
                      <TableCell>
                        {errors.includes(i) ? <AlertTriangle className="h-3 w-3 text-destructive" /> : <Check className="h-3 w-3 text-green-600" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("mapping")}>Indietro</Button>
              <Button onClick={handleImport} disabled={fileRows.length - errors.length === 0}>
                Importa {fileRows.length - errors.length} righe
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Importazione in corso...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
