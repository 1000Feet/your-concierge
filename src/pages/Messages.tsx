import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Send, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { NewConversationDialog } from "@/components/NewConversationDialog";
import { MessageTemplateSelector } from "@/components/MessageTemplateSelector";
import { useTranslation } from "react-i18next";

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "client" | "provider">("all");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*, clients(first_name, last_name), providers(name)")
        .order("last_message_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return [];
      const { data } = await supabase
        .from("messages").select("*").eq("conversation_id", selectedConvId).order("created_at");
      return data ?? [];
    },
    enabled: !!selectedConvId,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConvId!, sender_type: "concierge", content,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const handleAiGenerate = async () => {
    if (!selectedConvId) return;
    setAiLoading(true);
    try {
      const conv = conversations?.find((c) => c.id === selectedConvId);
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: conv?.providers ? "provider" : "client",
          request_description: conv?.subject ?? "conversazione",
          target_name: conv?.providers?.name ?? (conv?.clients ? `${conv.clients.first_name} ${conv.clients.last_name}` : ""),
        },
      });
      if (error) throw error;
      setNewMessage(data.message ?? "");
    } catch {
      toast({ title: t("messages.ai_error"), variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const filteredConvs = conversations?.filter((c) => {
    if (filter === "client" && !c.client_id) return false;
    if (filter === "provider" && !c.provider_id) return false;
    const name = c.providers?.name ?? (c.clients ? `${c.clients.first_name} ${c.clients.last_name}` : c.subject ?? "");
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConv = conversations?.find((c) => c.id === selectedConvId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t("messages.title")}</h1>
          <p className="text-muted-foreground">{t("messages.subtitle")}</p>
        </div>
        <NewConversationDialog onCreated={(id) => setSelectedConvId(id)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <div className="p-3 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input placeholder={t("messages.search_placeholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <div className="flex gap-1">
              {(["all", "client", "provider"] as const).map((f) => (
                <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm" className="h-7 text-xs"
                  onClick={() => setFilter(f)}>
                  {f === "all" ? t("messages.all") : f === "client" ? t("messages.clients") : t("messages.provider")}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredConvs?.map((conv) => {
              const name = conv.providers?.name ?? (conv.clients ? `${conv.clients.first_name} ${conv.clients.last_name}` : t("messages.no_name"));
              const isActive = conv.id === selectedConvId;
              return (
                <button key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full text-left p-3 border-b hover:bg-accent/5 transition-colors ${isActive ? "bg-accent/10" : ""}`}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{conv.subject ?? "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {conv.last_message_at ? format(new Date(conv.last_message_at), "d MMM HH:mm", { locale: itLocale }) : ""}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4">{conv.channel}</Badge>
                    </div>
                  </div>
                </button>
              );
            })}
            {!filteredConvs?.length && (
              <p className="text-sm text-muted-foreground text-center py-8">{t("messages.no_conversations")}</p>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {!selectedConvId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {t("messages.select_conversation")}
            </div>
          ) : (
            <>
              <div className="p-3 border-b">
                <p className="font-medium text-sm">
                  {selectedConv?.providers?.name ??
                    (selectedConv?.clients ? `${selectedConv.clients.first_name} ${selectedConv.clients.last_name}` : t("messages.conversation"))}
                </p>
                <p className="text-xs text-muted-foreground">{selectedConv?.subject ?? ""}</p>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {messages?.map((msg) => {
                  const isMe = msg.sender_type === "concierge";
                  const isSystem = msg.sender_type === "system";
                  return (
                    <div key={msg.id} className={`flex ${isSystem ? "justify-center" : isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                        isSystem ? "bg-muted text-muted-foreground text-xs italic" :
                        isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] opacity-70">{format(new Date(msg.created_at), "HH:mm")}</span>
                          {msg.is_ai_generated && <Sparkles className="h-2.5 w-2.5 opacity-70" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t flex gap-2">
                <MessageTemplateSelector onSelect={(body) => setNewMessage(body)} />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleAiGenerate} disabled={aiLoading}>
                  <Sparkles className={`h-4 w-4 ${aiLoading ? "animate-pulse" : ""}`} />
                </Button>
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={t("messages.write_message")}
                  className="h-8 text-sm" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) { e.preventDefault(); sendMutation.mutate(newMessage.trim()); } }} />
                <Button size="icon" className="h-8 w-8 shrink-0" disabled={!newMessage.trim() || sendMutation.isPending}
                  onClick={() => sendMutation.mutate(newMessage.trim())}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages;
