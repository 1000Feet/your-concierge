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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Edit, Eye, Upload } from "lucide-react";
import { ExportCSVButton } from "@/components/ExcelImportExport";
import { ImportDialog } from "@/components/ImportDialog";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const Clients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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
      const payload = { ...values, user_id: user!.id, arrival_date: values.arrival_date || null, departure_date: values.departure_date || null };
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
      toast({ title: editingClient ? t("clients.client_updated") : t("clients.client_added") });
    },
    onError: (err: any) => toast({ title: t("common.error"), description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: t("clients.client_deleted") });
    },
  });

  const resetForm = () => {
    setForm({ first_name: "", last_name: "", email: "", phone: "", arrival_date: "", departure_date: "", hotel: "", notes: "" });
    setEditingClient(null);
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setForm({
      first_name: client.first_name, last_name: client.last_name,
      email: client.email ?? "", phone: client.phone ?? "",
      arrival_date: client.arrival_date ?? "", departure_date: client.departure_date ?? "",
      hotel: client.hotel ?? "", notes: client.notes ?? "",
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
          <h1 className="text-2xl font-heading font-bold">{t("clients.title")}</h1>
          <p className="text-muted-foreground">{t("clients.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <ExportCSVButton
            data={filtered ?? []}
            filename={t("clients.title").toLowerCase()}
            columns={[
              { key: "first_name", label: t("clients.first_name") },
              { key: "last_name", label: t("clients.last_name") },
              { key: "email", label: t("common.email") },
              { key: "phone", label: t("common.phone") },
              { key: "hotel", label: t("clients.hotel") },
              { key: "arrival_date", label: t("clients.arrival") },
              { key: "departure_date", label: t("clients.departure") },
            ]}
          />
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-3 w-3" />{t("common.import")}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />{t("clients.new_client")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingClient ? t("clients.edit_client") : t("clients.new_client")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("clients.first_name")} *</Label>
                    <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("clients.last_name")} *</Label>
                    <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("common.email")}</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("common.phone")}</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{t("clients.arrival")}</Label>
                    <Input type="date" value={form.arrival_date} onChange={(e) => setForm({ ...form, arrival_date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("clients.departure")}</Label>
                    <Input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("clients.hotel")}</Label>
                  <Input value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{t("common.notes")}</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {editingClient ? t("common.update") : t("common.add")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("clients.search_placeholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.email")}</TableHead>
                <TableHead>{t("common.phone")}</TableHead>
                <TableHead>{t("clients.hotel")}</TableHead>
                <TableHead>{t("clients.arrival")}</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("clients.no_clients")}</TableCell></TableRow>
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
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/clients/${client.id}`)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(client)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(client.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title={t("clients.import_clients")}
        columns={[
          { key: "first_name", label: t("clients.first_name") },
          { key: "last_name", label: t("clients.last_name") },
          { key: "email", label: t("common.email") },
          { key: "phone", label: t("common.phone") },
          { key: "hotel", label: t("clients.hotel") },
          { key: "arrival_date", label: t("clients.arrival") },
          { key: "departure_date", label: t("clients.departure") },
        ]}
        requiredKeys={["first_name", "last_name"]}
        onImport={async (rows) => {
          for (const row of rows) {
            await supabase.from("clients").insert({
              first_name: row.first_name, last_name: row.last_name,
              email: row.email || null, phone: row.phone || null,
              hotel: row.hotel || null, arrival_date: row.arrival_date || null,
              departure_date: row.departure_date || null, user_id: user!.id,
            });
          }
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }}
      />
    </div>
  );
};

export default Clients;
