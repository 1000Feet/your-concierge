import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Props {
  onCreated?: (id: string) => void;
}

export function NewConversationDialog({ onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [contactType, setContactType] = useState<"client" | "provider">("client");
  const [contactId, setContactId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [channel, setChannel] = useState<"in_app" | "whatsapp" | "email">("in_app");
  const [subject, setSubject] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("id, first_name, last_name"); return data ?? []; },
  });

  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => { const { data } = await supabase.from("providers").select("id, name"); return data ?? []; },
  });

  const { data: requests } = useQuery({
    queryKey: ["requests-list"],
    queryFn: async () => { const { data } = await supabase.from("requests").select("id, description").order("created_at", { ascending: false }).limit(20); return data ?? []; },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("conversations").insert({
        user_id: user!.id,
        client_id: contactType === "client" ? contactId : null,
        provider_id: contactType === "provider" ? contactId : null,
        request_id: requestId || null,
        channel,
        subject: subject || null,
      } as any).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setOpen(false);
      toast({ title: "Conversazione creata" });
      onCreated?.(data.id);
    },
    onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
  });

  const contacts = contactType === "client"
    ? clients?.map((c) => ({ id: c.id, label: `${c.first_name} ${c.last_name}` })) ?? []
    : providers?.map((p) => ({ id: p.id, label: p.name })) ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-3 w-3" />Nuova</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuova Conversazione</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo Contatto</Label>
            <Select value={contactType} onValueChange={(v) => { setContactType(v as any); setContactId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="provider">Fornitore</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{contactType === "client" ? "Cliente" : "Fornitore"}</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Richiesta (opzionale)</Label>
            <Select value={requestId} onValueChange={setRequestId}>
              <SelectTrigger><SelectValue placeholder="Nessuna" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nessuna</SelectItem>
                {requests?.map((r) => <SelectItem key={r.id} value={r.id}>{r.description?.slice(0, 40)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Canale</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_app">In-App</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Oggetto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Oggetto conversazione" />
          </div>
          <Button className="w-full" disabled={!contactId || mutation.isPending} onClick={() => mutation.mutate()}>
            Crea Conversazione
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
