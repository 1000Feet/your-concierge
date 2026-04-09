import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  client_proposal: "Proposta Cliente",
  provider_inquiry: "Richiesta Fornitore",
  follow_up: "Follow-up",
  confirmation: "Conferma",
  cancellation: "Cancellazione",
  welcome: "Benvenuto",
  other: "Altro",
};

interface Props {
  onSelect: (body: string) => void;
}

export function MessageTemplateSelector({ onSelect }: Props) {
  const { data: templates } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("message_templates").select("*").order("category");
      return data ?? [];
    },
  });

  const grouped = templates?.reduce<Record<string, typeof templates>>((acc, t) => {
    const cat = t.category as string;
    (acc[cat] ??= []).push(t);
    return acc;
  }, {}) ?? {};

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <FileText className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        {Object.entries(grouped).map(([cat, items], idx) => (
          <div key={cat}>
            {idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{CATEGORY_LABELS[cat] ?? cat}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {items.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => onSelect(t.body)}>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
