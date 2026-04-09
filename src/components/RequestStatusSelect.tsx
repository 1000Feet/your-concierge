import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getNextStatuses, getStatusLabel, getStatusColor } from "@/lib/request-state-machine";

interface Props {
  requestId: string;
  currentStatus: string;
}

export function RequestStatusSelect({ requestId, currentStatus }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const mutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("requests")
        .update({ status: newStatus as any })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast({ title: "Stato aggiornato" });
    },
    onError: (err: any) => toast({ title: "Errore", description: err.message, variant: "destructive" }),
  });

  const nextStatuses = getNextStatuses(currentStatus);
  if (nextStatuses.length === 0) {
    return <Badge className={getStatusColor(currentStatus)}>{getStatusLabel(currentStatus)}</Badge>;
  }

  const handleChange = (value: string) => {
    if (value === "cancelled") {
      setConfirmCancel(true);
    } else {
      mutation.mutate(value);
    }
  };

  return (
    <>
      <Select value={currentStatus} onValueChange={handleChange}>
        <SelectTrigger className="w-40 h-8">
          <Badge className={getStatusColor(currentStatus)}>{getStatusLabel(currentStatus)}</Badge>
        </SelectTrigger>
        <SelectContent>
          {nextStatuses.map((s) => (
            <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma cancellazione</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Sei sicuro di voler annullare questa richiesta? L'azione non è reversibile.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>Annulla</Button>
            <Button variant="destructive" onClick={() => { mutation.mutate("cancelled"); setConfirmCancel(false); }}>
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
