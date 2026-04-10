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
import { Plus, Search, Trash2, Edit, Star, Upload, Globe, Instagram } from "lucide-react";
import { ExportCSVButton } from "@/components/ExcelImportExport";
import { ImportDialog } from "@/components/ImportDialog";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";

type ProviderCategory = Database["public"]["Enums"]["provider_category"];

const Providers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", category: "other" as ProviderCategory, email: "", phone: "",
    reliability: "5", commission_pct: "0", notes: "",
    website: "", instagram: "", facebook: "", tiktok: "",
  });

  const CATEGORIES: { value: ProviderCategory; label: string }[] = [
    { value: "tour", label: t("service_types.tour") },
    { value: "chef", label: t("service_types.chef") },
    { value: "transfer", label: t("service_types.transfer") },
    { value: "yacht", label: t("service_types.yacht") },
    { value: "surf", label: t("service_types.surf") },
    { value: "babysitter", label: t("service_types.babysitter") },
    { value: "restaurant", label: t("service_types.restaurant") },
    { value: "wellness", label: t("service_types.wellness") },
    { value: "other", label: t("service_types.other") },
  ];

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
        name: values.name, category: values.category, email: values.email || null,
        phone: values.phone || null, reliability: parseInt(values.reliability),
        commission_pct: parseFloat(values.commission_pct), notes: values.notes || null,
        website: values.website || null, instagram: values.instagram || null,
        facebook: values.facebook || null, tiktok: values.tiktok || null,
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
      toast({ title: editingProvider ? t("providers.provider_updated") : t("providers.provider_added") });
    },
    onError: (err: any) => toast({ title: t("common.error"), description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast({ title: t("providers.provider_deleted") });
    },
  });

  const resetForm = () => {
    setForm({ name: "", category: "other", email: "", phone: "", reliability: "5", commission_pct: "0", notes: "", website: "", instagram: "", facebook: "", tiktok: "" });
    setEditingProvider(null);
  };

  const openEdit = (p: any) => {
    setEditingProvider(p);
    setForm({
      name: p.name, category: p.category, email: p.email ?? "", phone: p.phone ?? "",
      reliability: String(p.reliability ?? 5), commission_pct: String(p.commission_pct ?? 0), notes: p.notes ?? "",
      website: p.website ?? "", instagram: p.instagram ?? "", facebook: p.facebook ?? "", tiktok: p.tiktok ?? "",
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
          <h1 className="text-2xl font-heading font-bold">{t("providers.title")}</h1>
          <p className="text-muted-foreground">{t("providers.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <ExportCSVButton
            data={filtered ?? []}
            filename={t("providers.title").toLowerCase()}
            columns={[
              { key: "name", label: t("common.name") },
              { key: "category", label: t("common.category") },
              { key: "email", label: t("common.email") },
              { key: "phone", label: t("common.phone") },
              { key: "reliability", label: t("providers.reliability") },
              { key: "commission_pct", label: t("providers.commission_pct") },
            ]}
          />
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-3 w-3" />{t("common.import")}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />{t("providers.new_provider")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProvider ? t("providers.edit_provider") : t("providers.new_provider")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
                <div className="space-y-1">
                  <Label>{t("common.name")} *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>{t("common.category")}</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ProviderCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                    <Label>{t("providers.reliability_range")}</Label>
                    <Input type="number" min="1" max="10" value={form.reliability} onChange={(e) => setForm({ ...form, reliability: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("providers.commission_pct")}</Label>
                    <Input type="number" step="0.01" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("providers.social_links")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder={t("providers.website")} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                    <Input placeholder="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
                    <Input placeholder="Facebook" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
                    <Input placeholder="TikTok" value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("common.notes")}</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {editingProvider ? t("common.update") : t("common.add")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("providers.search_placeholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.category")}</TableHead>
                <TableHead>{t("providers.reliability")}</TableHead>
                <TableHead>{t("providers.commission")}</TableHead>
                <TableHead>{t("providers.contact")}</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("providers.no_providers")}</TableCell></TableRow>
              ) : (
                filtered?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link to={`/providers/${p.id}`} className="hover:text-primary hover:underline">{p.name}</Link>
                    </TableCell>
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
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
        title={t("providers.import_providers")}
        columns={[
          { key: "name", label: t("common.name") },
          { key: "category", label: t("common.category") },
          { key: "email", label: t("common.email") },
          { key: "phone", label: t("common.phone") },
          { key: "reliability", label: t("providers.reliability") },
          { key: "commission_pct", label: t("providers.commission_pct") },
        ]}
        requiredKeys={["name"]}
        onImport={async (rows) => {
          for (const row of rows) {
            await supabase.from("providers").insert({
              name: row.name, category: (row.category as ProviderCategory) || "other",
              email: row.email || null, phone: row.phone || null,
              reliability: parseInt(row.reliability) || 5, commission_pct: parseFloat(row.commission_pct) || 0,
              user_id: user!.id,
            });
          }
          queryClient.invalidateQueries({ queryKey: ["providers"] });
        }}
      />
    </div>
  );
};

export default Providers;
