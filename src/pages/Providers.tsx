import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Edit, Star, Upload } from "lucide-react";
import { ExportCSVButton } from "@/components/ExcelImportExport";
import { ImportDialog } from "@/components/ImportDialog";
import type { Database } from "@/integrations/supabase/types";

type ProviderCategory = Database["public"]["Enums"]["provider_category"];

const CATEGORIES: { value: ProviderCategory; label: string }[] = [
  { value: "tour", label: "Tour" },
  { value: "chef", label: "Chef" },
  { value: "transfer", label: "Transfer" },
  { value: "yacht", label: "Yacht" },
  { value: "surf", label: "Surf" },
  { value: "babysitter", label: "Babysitter" },
  { value: "restaurant", label: "Ristorante" },
  { value: "wellness", label: "Wellness" },
  { value: "other", label: "Altro" },
];

const Providers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", category: "other" as ProviderCategory, email: "", phone: "",
    reliability: "5", commission_pct: "0", notes: "",
  });

  const { data: providers, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        name: values.name,
        category: values.category,
        email: values.email || null,
        phone: values.phone || null,
        reliability: parseInt(values.reliability),
        commission_pct: parseFloat(values.commission_pct),
        notes: values.notes || null,
        user_id: user!.id,
      };
      if (editingProvider) {
        const { error } = await supabase.from("providers").update(payload).eq("id", editingProvider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("providers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editingProvider ? "Fornitore aggiornato" : "Fornitore aggiunto" });
    },
    onError: (err: any) => toast({ title: "Errore", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast({ title: "Fornitore eliminato" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", category: "other", email: "", phone: "", reliability: "5", commission_pct: "0", notes: "" });
    setEditingProvider(null);
  };

  const openEdit = (p: any) => {
    setEditingProvider(p);
    setForm({
      name: p.name, category: p.category, email: p.email ?? "", phone: p.phone ?? "",
      reliability: String(p.reliability ?? 5), commission_pct: String(p.commission_pct ?? 0), notes: p.notes ?? "",
    });
    setDialogOpen(true);
  };

  const filtered = providers?.filter((p) =>
    `${p.name} ${p.category} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Fornitori</h1>
          <p className="text-muted-foreground">Gestisci i tuoi fornitori di servizi</p>
        </div>
        <div className="flex gap-2">
          <ExportCSVButton
            data={filtered ?? []}
            filename="fornitori"
            columns={[
              { key: "name", label: "Nome" },
              { key: "category", label: "Categoria" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Telefono" },
              { key: "reliability", label: "Affidabilità" },
              { key: "commission_pct", label: "Commissione %" },
            ]}
          />
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-3 w-3" />Importa
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nuovo Fornitore</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProvider ? "Modifica Fornitore" : "Nuovo Fornitore"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ProviderCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Telefono</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Affidabilità (1-10)</Label>
                  <Input type="number" min="1" max="10" value={form.reliability} onChange={(e) => setForm({ ...form, reliability: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Commissione %</Label>
                  <Input type="number" step="0.01" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {editingProvider ? "Aggiorna" : "Aggiungi"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca fornitori..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Affidabilità</TableHead>
                <TableHead>Commissione</TableHead>
                <TableHead>Contatto</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessun fornitore trovato</TableCell></TableRow>
              ) : (
                filtered?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-accent fill-accent" />
                        <span>{p.reliability}/10</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.commission_pct}%</TableCell>
                    <TableCell className="text-sm">{p.email ?? p.phone ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Providers;
