import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications?.filter((n) => !n.read).map((n) => n.id) ?? [];
      if (unread.length === 0) return;
      await supabase.from("notifications").update({ read: true }).in("id", unread);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <Popover onOpenChange={(open) => { if (open && unreadCount > 0) markReadMutation.mutate(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">{t("notifications.title")}</h4>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications?.length ? (
            <p className="text-muted-foreground text-sm text-center py-6">{t("notifications.none")}</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`p-3 border-b last:border-0 ${!n.read ? "bg-accent/5" : ""}`}>
                <p className="text-sm font-medium">{n.title}</p>
                {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), "dd/MM HH:mm")}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
