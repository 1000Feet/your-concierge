import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Edit, Eye, Sparkles } from "lucide-react";
import { ExportCSVButton } from "@/components/ExcelImportExport";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type RequestStatus = Database["public"]["Enums"]["request_status"];
type ServiceType = Database["public"]["Enums"]["service_type"];

const STATUS_OPTIONS: { value: RequestStatus; label: string; color: string }[] = [
  { value: "draft", label: "Bozza", color: "bg-muted text-muted-foreground" },
  { value: "sent", label: "Inviata", color: "bg-blue-100 text-blue-800" },
  { value: "waiting", label: "In Attesa", color: "bg-amber-100 text-amber-800" },
  { value: "confirmed", label: "Confermata", color: "bg-green-100 text-green-800" },
  { value: "completed", label: "Completata", color: "bg-emerald-100 text-emerald-800" },
  { value: "cancelled", label: "Annullata", color: "bg-red-100 text-red-800" },
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "tour", label: "Tour" },
  { value: "chef", label: "Chef Privato" },
  { value: "transfer", label: "Transfer" },
  { value: "yacht", label: "Yacht" },
  { value: "surf", label: "Surf" },
  { value: "babysitter", label: "Babysitter" },
  { value: "restaurant", label: "Ristorante" },
  { value: "wellness", label: "Wellness" },
  { value: "other", label: "Altro" },
];

const Requests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [form, setForm] = useState({
    description: "", service_type: "other" as ServiceType, status: "draft" as RequestStatus,
    client_id: "", budget: "", final_price: "", margin: "", service_date: "",
    group_size: "1", notes: "",
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, first_name, last_name").order("first_name");
      return data ?? [];
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*, clients(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        description: values.description,
        service_type: values.service_type,
        status: values.status,
        client_id: values.client_id || null,
        budget: values.budget ? parseFloat(values.budget) : null,
        final_price: values.final_price ? parseFloat(values.final_price) : null,
        margin: values.margin ? parseFloat(values.margin) : null,
        service_date: values.service_date || null,
        group_size: parseInt(values.group_size) || 1,
        notes: values.notes || null,
        user_id: user!.id,
      };
      if (editingRequest) {
        const { error } = await supabase.from("requests").update(payload).eq("id", editingRequest.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("requests").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editingRequest ? "Richiesta aggiornata" : "Richiesta creata" });
    },
    onError: (err: any) => toast({ title: "Errore", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast({ title: "Richiesta eliminata" });
    },
  });

  const resetForm = () => {
    setForm({ description: "", service_type: "other", status: "draft", client_id: "", budget: "", final_price: "", margin: "", service_date: "", group_size: "1", notes: "" });
    setEditingRequest(null);
  };

  const openEdit = (r: any) => {
    setEditingRequest(r);
    setForm({
      description: r.description, service_type: r.service_type, status: r.status,
      client_id: r.client_id ?? "", budget: r.budget?.toString() ?? "", final_price: r.final_price?.toString() ?? "",
      margin: r.margin?.toString() ?? "", service_date: r.service_date ?? "", group_size: r.group_size?.toString() ?? "1",
      notes: r.notes ?? "",
    });
    setDialogOpen(true);
  };

  const filtered = requests?.filter((r) => {
    const matchSearch = `${r.description} ${r.clients?.first_name ?? ""} ${r.clients?.last_name ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Richieste</h1>
          <p className="text-muted-foreground">Gestisci le richieste dei clienti</p>
        </div>
        <div className="flex gap-2">
          <ExportCSVButton
            data={(filtered ?? []).map((r: any) => ({
              ...r,
              client_name: r.clients ? `${r.clients.first_name} ${r.clients.last_name}` : "",
            }))}
            filename="richieste"
            columns={[
              { key: "description", label: "Descrizione" },
              { key: "client_name", label: "Cliente" },
              { key: "service_type", label: "Servizio" },
              { key: "status", label: "Stato" },
              { key: "service_date", label: "Data" },
              { key: "budget", label: "Budget" },
              { key: "final_price", label: "Prezzo Finale" },
              { key: "margin", label: "Margine" },
            ]}
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nuova Richiesta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRequest ? "Modifica Richiesta" : "Nuova Richiesta"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Descrizione *</Label>
                  {!editingRequest && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={async () => {
                        if (!form.description) return;
                        try {
                          const { data, error } = await supabase.functions.invoke("ai-extract", {
                            body: { text: form.description },
                          });
                          if (error) throw error;
                          const ex = data.extracted ?? {};
                          setForm((f: typeof form) => ({
                            ...f,
                            service_type: ex.service_type ?? f.service_type,
                            description: ex.description ?? f.description,
                            group_size: ex.group_size?.toString() ?? f.group_size,
                            budget: ex.budget?.toString() ?? f.budget,
                            service_date: ex.service_date ?? f.service_date,
                          }));
                          toast({ title: "Dati estratti con AI" });
                        } catch {
                          toast({ title: "Errore estrazione AI", variant: "destructive" });
                        }
                      }}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />AI Extract
                    </Button>
                  )}
                </div>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo Servizio</Label>
                  <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v as ServiceType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Stato</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RequestStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Cliente</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Budget €</Label>
                  <Input type="number" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Prezzo Finale €</Label>
                  <Input type="number" step="0.01" value={form.final_price} onChange={(e) => setForm({ ...form, final_price: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Margine €</Label>
                  <Input type="number" step="0.01" value={form.margin} onChange={(e) => setForm({ ...form, margin: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Data Servizio</Label>
                  <Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Gruppo</Label>
                  <Input type="number" min="1" value={form.group_size} onChange={(e) => setForm({ ...form, group_size: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {editingRequest ? "Aggiorna" : "Crea"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca richieste..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrizione</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Servizio</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nessuna richiesta trovata</TableCell></TableRow>
              ) : (
                filtered?.map((r) => {
                  const statusInfo = STATUS_OPTIONS.find((s) => s.value === r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{r.description}</TableCell>
                      <TableCell>{r.clients ? `${r.clients.first_name} ${r.clients.last_name}` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{SERVICE_TYPES.find((s) => s.value === r.service_type)?.label ?? r.service_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo?.color ?? ""}>{statusInfo?.label ?? r.status}</Badge>
                      </TableCell>
                      <TableCell>{r.service_date ? format(new Date(r.service_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>{r.budget ? `€${Number(r.budget).toFixed(0)}` : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/requests/${r.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Requests;
