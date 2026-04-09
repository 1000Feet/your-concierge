import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Edit, Eye } from "lucide-react";
import { ExportCSVButton } from "@/components/ExcelImportExport";
import { format } from "date-fns";

const Clients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    arrival_date: "", departure_date: "", hotel: "", notes: "",
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        ...values,
        user_id: user!.id,
        arrival_date: values.arrival_date || null,
        departure_date: values.departure_date || null,
      };
      if (editingClient) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editingClient ? "Cliente aggiornato" : "Cliente aggiunto" });
    },
    onError: (err: any) => toast({ title: "Errore", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente eliminato" });
    },
  });

  const resetForm = () => {
    setForm({ first_name: "", last_name: "", email: "", phone: "", arrival_date: "", departure_date: "", hotel: "", notes: "" });
    setEditingClient(null);
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setForm({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      arrival_date: client.arrival_date ?? "",
      departure_date: client.departure_date ?? "",
      hotel: client.hotel ?? "",
      notes: client.notes ?? "",
    });
    setDialogOpen(true);
  };

  const filtered = clients?.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Clienti</h1>
          <p className="text-muted-foreground">Gestisci i tuoi clienti</p>
        </div>
        <div className="flex gap-2">
          <ExportCSVButton
            data={filtered ?? []}
            filename="clienti"
            columns={[
              { key: "first_name", label: "Nome" },
              { key: "last_name", label: "Cognome" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Telefono" },
              { key: "hotel", label: "Hotel" },
              { key: "arrival_date", label: "Arrivo" },
              { key: "departure_date", label: "Partenza" },
            ]}
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nuovo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Modifica Cliente" : "Nuovo Cliente"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>Cognome *</Label>
                  <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                </div>
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
                  <Label>Arrivo</Label>
                  <Input type="date" value={form.arrival_date} onChange={(e) => setForm({ ...form, arrival_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Partenza</Label>
                  <Input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Hotel</Label>
                <Input value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {editingClient ? "Aggiorna" : "Aggiungi"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca clienti..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Arrivo</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessun cliente trovato</TableCell></TableRow>
              ) : (
                filtered?.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.first_name} {client.last_name}</TableCell>
                    <TableCell>{client.email ?? "—"}</TableCell>
                    <TableCell>{client.phone ?? "—"}</TableCell>
                    <TableCell>{client.hotel ?? "—"}</TableCell>
                    <TableCell>{client.arrival_date ? format(new Date(client.arrival_date), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/clients/${client.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(client)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(client.id)}>
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

export default Clients;
