import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  onSelect: (body: string) => void;
}

export function MessageTemplateSelector({ onSelect }: Props) {
  const { t } = useTranslation();

  const { data: templates } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("message_templates").select("*").order("category");
      return data ?? [];
    },
  });

  const grouped = templates?.reduce<Record<string, typeof templates>>((acc, tmpl) => {
    const cat = tmpl.category as string;
    (acc[cat] ??= []).push(tmpl);
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
            <DropdownMenuLabel>{t(`template_categories.${cat}`, cat)}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {items.map((tmpl) => (
                <DropdownMenuItem key={tmpl.id} onClick={() => onSelect(tmpl.body)}>
                  {tmpl.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
