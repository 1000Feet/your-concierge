import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Sparkles, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { RequestStatusSelect } from "@/components/RequestStatusSelect";
import type { Database } from "@/integrations/supabase/types";

type RequestProviderStatus = Database["public"]["Enums"]["request_provider_status"];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Bozza", color: "bg-muted text-muted-foreground" },
  sent: { label: "Inviata", color: "bg-blue-100 text-blue-800" },
  waiting: { label: "In Attesa", color: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confermata", color: "bg-green-100 text-green-800" },
  completed: { label: "Completata", color: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Annullata", color: "bg-red-100 text-red-800" },
};

const PROVIDER_STATUS: { value: RequestProviderStatus; label: string; color: string }[] = [
  { value: "pending", label: "In attesa", color: "bg-muted text-muted-foreground" },
  { value: "contacted", label: "Contattato", color: "bg-blue-100 text-blue-800" },
  { value: "accepted", label: "Accettato", color: "bg-green-100 text-green-800" },
  { value: "declined", label: "Rifiutato", color: "bg-red-100 text-red-800" },
];

const SERVICE_LABELS: Record<string, string> = {
  tour: "Tour", chef: "Chef Privato", transfer: "Transfer", yacht: "Yacht",
  surf: "Surf", babysitter: "Babysitter", restaurant: "Ristorante", wellness: "Wellness", other: "Altro",
};

const RequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [providerNotes, setProviderNotes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<{ name: string; type: "provider" | "client" } | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");

  const { data: request, isLoading } = useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*, clients(first_name, last_name, email, phone, hotel)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: assignedProviders } = useQuery({
    queryKey: ["request-providers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_providers")
        .select("*, providers(name, category, email, phone, reliability, commission_pct)")
        .eq("request_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: availableProviders } = useQuery({
    queryKey: ["available-providers", request?.service_type],
    queryFn: async () => {
      const { data } = await supabase
        .from("providers")
        .select("id, name, category, reliability, commission_pct")
        .eq("category", request!.service_type)
        .eq("is_active", true)
        .order("reliability", { ascending: false });
      return data ?? [];
    },
    enabled: !!request?.service_type,
  });

  const addProviderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("request_providers").insert({
        request_id: id!,
        provider_id: selectedProviderId,
        quoted_price: quotedPrice ? parseFloat(quotedPrice) : null,
        notes: providerNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-providers", id] });
      setAddDialogOpen(false);
      setSelectedProviderId("");
      setQuotedPrice("");
      setProviderNotes("");
      toast({ title: "Fornitore assegnato" });
    },
    onError: (err: any) => toast({ title: "Errore", description: err.message, variant: "destructive" }),
  });

  const updateProviderStatusMutation = useMutation({
    mutationFn: async ({ rpId, status }: { rpId: string; status: RequestProviderStatus }) => {
      const { error } = await supabase.from("request_providers").update({ status }).eq("id", rpId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-providers", id] });
      toast({ title: "Stato aggiornato" });
    },
  });

  const updateQuotedPriceMutation = useMutation({
    mutationFn: async ({ rpId, price }: { rpId: string; price: number }) => {
      const { error } = await supabase.from("request_providers").update({ quoted_price: price }).eq("id", rpId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["request-providers", id] }),
  });

  const removeProviderMutation = useMutation({
    mutationFn: async (rpId: string) => {
      const { error } = await supabase.from("request_providers").delete().eq("id", rpId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-providers", id] });
      toast({ title: "Fornitore rimosso" });
    },
  });

  const handleAiSuggest = async () => {
    if (!request) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-suggest", {
        body: {
          service_type: request.service_type,
          description: request.description,
          budget: request.budget,
          group_size: request.group_size,
        },
      });
      if (error) throw error;
      setAiMessage(data.suggestion || "Nessun suggerimento disponibile.");
    } catch (err: any) {
      toast({ title: "Errore AI", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateMessage = async (targetName: string, targetType: "provider" | "client") => {
    if (!request) return;
    setMessageTarget({ name: targetName, type: targetType });
    setMessageDialogOpen(true);
    setGeneratedMessage("Generazione in corso...");
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: targetType,
          request_description: request.description,
          service_type: request.service_type,
          service_date: request.service_date,
          group_size: request.group_size,
          target_name: targetName,
          client_name: request.clients ? `${request.clients.first_name} ${request.clients.last_name}` : undefined,
        },
      });
      if (error) throw error;
      setGeneratedMessage(data.message || "Impossibile generare il messaggio.");
    } catch {
      setGeneratedMessage("Errore nella generazione del messaggio.");
    }
  };

  const assignedIds = assignedProviders?.map((ap) => ap.provider_id) ?? [];
  const filteredAvailable = availableProviders?.filter((p) => !assignedIds.includes(p.id)) ?? [];

  const acceptedProvider = assignedProviders?.find((ap) => ap.status === "accepted");
  const margin = request?.final_price && acceptedProvider?.quoted_price
    ? Number(request.final_price) - Number(acceptedProvider.quoted_price)
    : request?.margin;

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Caricamento...</div>;
  if (!request) return <div className="flex items-center justify-center h-64 text-muted-foreground">Richiesta non trovata</div>;

  const statusInfo = STATUS_LABELS[request.status] ?? { label: request.status, color: "" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/requests")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold">Dettaglio Richiesta</h1>
          <p className="text-muted-foreground">{request.description}</p>
        </div>
        <RequestStatusSelect requestId={request.id} currentStatus={request.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servizio</span>
              <Badge variant="secondary">{SERVICE_LABELS[request.service_type] ?? request.service_type}</Badge>
            </div>
            {request.clients && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{request.clients.first_name} {request.clients.last_name}</span>
              </div>
            )}
            {request.service_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span>{format(new Date(request.service_date), "dd/MM/yyyy")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gruppo</span>
              <span>{request.group_size ?? 1} persone</span>
            </div>
            {request.budget && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget</span>
                <span>€{Number(request.budget).toFixed(0)}</span>
              </div>
            )}
            {request.final_price && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prezzo Finale</span>
                <span className="font-medium">€{Number(request.final_price).toFixed(0)}</span>
              </div>
            )}
            {margin != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margine</span>
                <span className={`font-bold ${Number(margin) >= 0 ? "text-green-600" : "text-destructive"}`}>
                  €{Number(margin).toFixed(0)}
                </span>
              </div>
            )}
            {request.notes && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground text-xs">Note</span>
                <p className="mt-1">{request.notes}</p>
              </div>
            )}
            {request.clients && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleGenerateMessage(
                    `${request.clients!.first_name} ${request.clients!.last_name}`,
                    "client"
                  )}
                >
                  <MessageSquare className="mr-2 h-3 w-3" />
                  Genera Messaggio Cliente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Providers */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Fornitori Assegnati</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAiSuggest} disabled={aiLoading}>
                <Sparkles className="mr-2 h-3 w-3" />
                {aiLoading ? "Analisi..." : "AI Suggerisci"}
              </Button>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-3 w-3" />Aggiungi</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assegna Fornitore</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label>Fornitore ({SERVICE_LABELS[request.service_type]})</Label>
                      <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                        <SelectTrigger><SelectValue placeholder="Seleziona fornitore" /></SelectTrigger>
                        <SelectContent>
                          {filteredAvailable.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (⭐{p.reliability}/10 — {p.commission_pct}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Prezzo Quotato €</Label>
                      <Input type="number" step="0.01" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Note</Label>
                      <Textarea value={providerNotes} onChange={(e) => setProviderNotes(e.target.value)} rows={2} />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => addProviderMutation.mutate()}
                      disabled={!selectedProviderId || addProviderMutation.isPending}
                    >
                      Assegna
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {aiMessage && (
              <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20 text-sm">
                <p className="font-medium text-accent mb-1">💡 Suggerimento AI</p>
                <p className="whitespace-pre-wrap">{aiMessage}</p>
              </div>
            )}
            {!assignedProviders?.length ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Nessun fornitore assegnato</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornitore</TableHead>
                    <TableHead>Affidabilità</TableHead>
                    <TableHead>Prezzo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedProviders.map((ap) => {
                    const ps = PROVIDER_STATUS.find((s) => s.value === ap.status);
                    return (
                      <TableRow key={ap.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ap.providers?.name}</p>
                            <p className="text-xs text-muted-foreground">{ap.providers?.email ?? ap.providers?.phone ?? ""}</p>
                          </div>
                        </TableCell>
                        <TableCell>⭐{ap.providers?.reliability}/10</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24 h-8"
                            defaultValue={ap.quoted_price ?? ""}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val !== ap.quoted_price) {
                                updateQuotedPriceMutation.mutate({ rpId: ap.id, price: val });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ap.status}
                            onValueChange={(v) => updateProviderStatusMutation.mutate({ rpId: ap.id, status: v as RequestProviderStatus })}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <Badge className={ps?.color ?? ""}>{ps?.label ?? ap.status}</Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {PROVIDER_STATUS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleGenerateMessage(ap.providers?.name ?? "", "provider")}
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeProviderMutation.mutate(ap.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message generation dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Messaggio per {messageTarget?.name}</DialogTitle>
          </DialogHeader>
          <Textarea value={generatedMessage} onChange={(e) => setGeneratedMessage(e.target.value)} rows={8} />
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(generatedMessage); toast({ title: "Copiato!" }); }}>
            Copia negli appunti
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestDetail;
