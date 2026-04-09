import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { format } from "date-fns";

const DIET_OPTIONS = ["Nessuna", "Vegetariana", "Vegana", "Senza glutine", "Kosher", "Halal", "Altro"];
const BUDGET_OPTIONS = ["Budget", "Medio", "Premium", "Luxury"];
const LANGUAGE_OPTIONS = ["Italiano", "Inglese", "Francese", "Tedesco", "Spagnolo", "Russo", "Arabo", "Cinese", "Altro"];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Bozza", color: "bg-muted text-muted-foreground" },
  sent: { label: "Inviata", color: "bg-blue-100 text-blue-800" },
  waiting: { label: "In Attesa", color: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confermata", color: "bg-green-100 text-green-800" },
  completed: { label: "Completata", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Annullata", color: "bg-red-100 text-red-800" },
};

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: clientRequests } = useQuery({
    queryKey: ["client-requests", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("requests")
        .select("id, description, service_type, status, service_date, final_price")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const prefs = (client?.preferences as Record<string, any>) ?? {};
  const [preferences, setPreferences] = useState<Record<string, any>>({});

  // Sync on load
  const currentPrefs = Object.keys(preferences).length > 0 ? preferences : prefs;

  const updatePref = (key: string, value: any) => {
    setPreferences({ ...currentPrefs, [key]: value });
  };

  const savePrefsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").update({ preferences: currentPrefs }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      toast({ title: "Preferenze salvate" });
    },
    onError: (err: any) => toast({ title: "Errore", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Caricamento...</div>;
  if (!client) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cliente non trovato</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold">{client.first_name} {client.last_name}</h1>
          <p className="text-muted-foreground">{client.email ?? ""} {client.phone ? `• ${client.phone}` : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Soggiorno</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hotel</span>
              <span className="font-medium">{client.hotel ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Arrivo</span>
              <span>{client.arrival_date ? format(new Date(client.arrival_date), "dd/MM/yyyy") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Partenza</span>
              <span>{client.departure_date ? format(new Date(client.departure_date), "dd/MM/yyyy") : "—"}</span>
            </div>
            {client.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Note</p>
                <p className="mt-1">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Preferenze</CardTitle>
            <Button size="sm" onClick={() => savePrefsMutation.mutate()} disabled={savePrefsMutation.isPending}>
              <Save className="mr-2 h-3 w-3" />Salva
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Dieta</Label>
                <Select value={currentPrefs.diet ?? ""} onValueChange={(v) => updatePref("diet", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>
                    {DIET_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fascia Budget</Label>
                <Select value={currentPrefs.budget_tier ?? ""} onValueChange={(v) => updatePref("budget_tier", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>
                    {BUDGET_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Lingua</Label>
                <Select value={currentPrefs.language ?? ""} onValueChange={(v) => updatePref("language", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Allergie</Label>
                <Input
                  value={currentPrefs.allergies ?? ""}
                  onChange={(e) => updatePref("allergies", e.target.value)}
                  placeholder="Es. arachidi, lattosio..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Servizi Preferiti</Label>
              <Input
                value={currentPrefs.preferred_services ?? ""}
                onChange={(e) => updatePref("preferred_services", e.target.value)}
                placeholder="Es. yacht, tour enogastronomici..."
              />
            </div>
            <div className="space-y-1">
              <Label>Note Aggiuntive</Label>
              <Textarea
                value={currentPrefs.notes ?? ""}
                onChange={(e) => updatePref("notes", e.target.value)}
                rows={2}
                placeholder="Altre preferenze..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Storico Richieste</CardTitle>
        </CardHeader>
        <CardContent>
          {!clientRequests?.length ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nessuna richiesta per questo cliente</p>
          ) : (
            <div className="space-y-2">
              {clientRequests.map((r) => {
                const si = STATUS_LABELS[r.status];
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/requests/${r.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{r.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.service_date ? format(new Date(r.service_date), "dd/MM/yyyy") : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.final_price && <span className="text-sm font-medium">€{Number(r.final_price).toFixed(0)}</span>}
                      <Badge className={si?.color ?? ""}>{si?.label ?? r.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDetail;
