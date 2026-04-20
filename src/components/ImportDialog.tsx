import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, ArrowRight, Check, AlertTriangle, Sparkles, Wand2, Loader2 } from "lucide-react";
import { parseFile, parseFileFromWorkbook } from "@/lib/csv-parser";
import { autoMapColumns, type ColumnDef } from "@/lib/column-mapper";
import { normalizeRow } from "@/lib/data-normalizer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type Step = "upload" | "sheet" | "mapping" | "preview" | "importing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDef[];
  requiredKeys?: string[];
  onImport: (rows: Record<string, string>[]) => Promise<void>;
  title?: string;
}

export function ImportDialog({ open, onOpenChange, columns, requiredKeys = [], onImport, title }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("upload");
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [aiMapped, setAiMapped] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<number[]>([]);
  const [workbook, setWorkbook] = useState<any>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [autoNormalize, setAutoNormalize] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  const reset = () => {
    setStep("upload");
    setFileHeaders([]);
    setFileRows([]);
    setMapping({});
    setAiMapped(new Set());
    setErrors([]);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
  };

  const loadParsed = useCallback(
    (headers: string[], rows: string[][]) => {
      if (headers.length === 0) {
        toast({ title: t("common.error"), description: t("import.file_loaded"), variant: "destructive" });
        return;
      }
      setFileHeaders(headers);
      setFileRows(rows);
      setMapping(autoMapColumns(headers, columns));
      setAiMapped(new Set());
      setStep("mapping");
    },
    [columns, toast, t]
  );

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const parsed = await parseFile(file);
        if (parsed.workbook && parsed.sheetNames && parsed.sheetNames.length > 1) {
          setWorkbook(parsed.workbook);
          setSheetNames(parsed.sheetNames);
          setSelectedSheet(parsed.sheetNames[0]);
          // Pre-load first sheet
          setFileHeaders(parsed.headers);
          setFileRows(parsed.rows);
          setStep("sheet");
        } else {
          loadParsed(parsed.headers, parsed.rows);
        }
      } catch (err: any) {
        toast({ title: t("common.error"), description: err?.message ?? "", variant: "destructive" });
      }
      e.target.value = "";
    },
    [loadParsed, toast, t]
  );

  const confirmSheet = async () => {
    if (!workbook || !selectedSheet) return;
    const parsed = await parseFileFromWorkbook(workbook, selectedSheet);
    loadParsed(parsed.headers, parsed.rows);
  };

  const unmappedHeaders = useMemo(
    () => fileHeaders.filter((h) => !mapping[h]),
    [fileHeaders, mapping]
  );

  const requestAiSuggestions = async () => {
    if (unmappedHeaders.length === 0) return;
    setAiLoading(true);
    try {
      const sampleRows = fileRows.slice(0, 3).map((row) => {
        const obj: Record<string, string> = {};
        fileHeaders.forEach((h, i) => (obj[h] = row[i] ?? ""));
        return obj;
      });
      const { data, error } = await supabase.functions.invoke("ai-column-mapper", {
        body: {
          unmapped_headers: unmappedHeaders,
          sample_rows: sampleRows,
          target_fields: columns.map((c) => ({ key: c.key, label: c.label })),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const suggestions = (data?.suggestions ?? []) as { header: string; suggested_key: string; confidence: number }[];
      const newMapping = { ...mapping };
      const newAi = new Set(aiMapped);
      let applied = 0;
      for (const s of suggestions) {
        if (s.suggested_key && s.confidence >= 0.5 && !newMapping[s.header]) {
          newMapping[s.header] = s.suggested_key;
          newAi.add(s.header);
          applied++;
        }
      }
      setMapping(newMapping);
      setAiMapped(newAi);
      toast({ title: `${applied} ${t("import.ai_badge")} → ${t("common.mapped") || "mapped"}` });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err?.message ?? "", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const mappedRowsRaw = (): Record<string, string>[] =>
    fileRows.map((row) => {
      const obj: Record<string, string> = {};
      fileHeaders.forEach((h, i) => {
        const key = mapping[h];
        if (key) obj[key] = row[i] ?? "";
      });
      return obj;
    });

  const processedRows = useMemo(() => {
    const raw = mappedRowsRaw();
    if (!autoNormalize) return raw.map((r) => ({ row: r, changes: {} as Record<string, string> }));
    return raw.map((r) => normalizeRow(r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileRows, fileHeaders, mapping, autoNormalize]);

  const validateAndPreview = () => {
    const errs: number[] = [];
    processedRows.forEach((p, i) => {
      if (requiredKeys.some((k) => !p.row[k]?.trim())) errs.push(i);
    });
    setErrors(errs);
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    try {
      const rows = processedRows.filter((_, i) => !errors.includes(i)).map((p) => p.row);
      await onImport(rows);
      toast({ title: t("import.rows_imported", { count: rows.length }) });
      onOpenChange(false);
      reset();
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
      setStep("preview");
    }
  };

  const visibleColumns = columns.filter((c) => Object.values(mapping).includes(c.key));

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title ?? t("import.title")}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-1">{t("import.drag_drop")}</p>
            <p className="text-xs text-muted-foreground mb-4">{t("import.xlsx_supported")}</p>
            <Button asChild variant="outline">
              <label className="cursor-pointer">
                {t("import.upload")}
                <input
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls,.xlsm"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            </Button>
          </div>
        )}

        {step === "sheet" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("import.select_sheet")}</p>
            <Select value={selectedSheet} onValueChange={setSelectedSheet}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sheetNames.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>{t("common.back") || "Back"}</Button>
              <Button onClick={confirmSheet}>{t("common.continue") || t("import.preview")}</Button>
            </DialogFooter>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{t("import.mapping")}</p>
              {unmappedHeaders.length > 0 ? (
                <Button size="sm" variant="outline" onClick={requestAiSuggestions} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
                  {aiLoading ? t("import.ai_suggesting") : t("import.ai_suggest")}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">{t("import.all_mapped")}</span>
              )}
            </div>
            <div className="space-y-2">
              {fileHeaders.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <span className="w-40 text-sm font-medium truncate">{h}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Select
                    value={mapping[h] ?? "__ignore__"}
                    onValueChange={(v) => {
                      const next = { ...mapping };
                      if (v === "__ignore__") delete next[h];
                      else next[h] = v;
                      setMapping(next);
                      // Manual change clears AI badge
                      if (aiMapped.has(h)) {
                        const set = new Set(aiMapped);
                        set.delete(h);
                        setAiMapped(set);
                      }
                    }}
                  >
                    <SelectTrigger className="w-48"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ignore__">—</SelectItem>
                      {columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {aiMapped.has(h) && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />{t("import.ai_badge")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch id="auto-normalize" checked={autoNormalize} onCheckedChange={setAutoNormalize} />
                <Label htmlFor="auto-normalize" className="text-sm cursor-pointer">{t("import.auto_normalize")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(sheetNames.length > 1 ? "sheet" : "upload")}>
                {t("common.back") || "Back"}
              </Button>
              <Button onClick={validateAndPreview}>{t("import.preview")}</Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <TooltipProvider>
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{fileRows.length - errors.length}</Badge>
                {errors.length > 0 && <Badge variant="destructive">{errors.length}</Badge>}
                {autoNormalize && (
                  <Badge variant="outline" className="gap-1">
                    <Wand2 className="h-3 w-3" />{t("import.auto_normalize")}
                  </Badge>
                )}
              </div>
              <div className="max-h-72 overflow-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      {visibleColumns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedRows.slice(0, 50).map((p, i) => (
                      <TableRow key={i} className={errors.includes(i) ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        {visibleColumns.map((c) => {
                          const changed = p.changes[c.key] !== undefined;
                          return (
                            <TableCell key={c.key} className="text-xs">
                              <span className="inline-flex items-center gap-1">
                                {p.row[c.key] ?? ""}
                                {changed && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Wand2 className="h-3 w-3 text-primary" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{t("import.normalized")}</p>
                                      <p className="text-xs text-muted-foreground">{t("import.original_value")}: {p.changes[c.key]}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </span>
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          {errors.includes(i)
                            ? <AlertTriangle className="h-3 w-3 text-destructive" />
                            : <Check className="h-3 w-3 text-green-600" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("mapping")}>{t("common.back") || "Back"}</Button>
                <Button onClick={handleImport} disabled={fileRows.length - errors.length === 0}>
                  {t("import.title")} ({fileRows.length - errors.length})
                </Button>
              </DialogFooter>
            </div>
          </TooltipProvider>
        )}

        {step === "importing" && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <p className="text-muted-foreground">{t("import.importing")}...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}