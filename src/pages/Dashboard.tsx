import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, ClipboardList, TrendingUp, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { DailySummary } from "@/components/DailySummary";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { t } = useTranslation();

  const { data: clients } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: providers } = useQuery({
    queryKey: ["providers-count"],
    queryFn: async () => {
      const { count } = await supabase.from("providers").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["requests-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("requests").select("status, budget, margin");
      return data ?? [];
    },
  });

  const { data: recentRequests } = useQuery({
    queryKey: ["recent-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("requests")
        .select("*, clients(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: upcomingArrivals } = useQuery({
    queryKey: ["upcoming-arrivals"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("clients")
        .select("*")
        .gte("arrival_date", today)
        .order("arrival_date")
        .limit(5);
      return data ?? [];
    },
  });

  const activeRequests = requests?.filter((r) => !["completed", "cancelled"].includes(r.status)).length ?? 0;
  const totalMargin = requests?.reduce((sum, r) => sum + (Number(r.margin) || 0), 0) ?? 0;

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-blue-100 text-blue-800",
    waiting: "bg-amber-100 text-amber-800",
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <DailySummary />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.clients")}</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{clients ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.providers")}</CardTitle>
            <Building2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{providers ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.active_requests")}</CardTitle>
            <ClipboardList className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeRequests}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.total_margin")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">€{totalMargin.toFixed(0)}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-accent" />
              {t("dashboard.recent_requests")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests?.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("dashboard.no_requests_yet")}</p>
            ) : (
              <div className="space-y-3">
                {recentRequests?.map((req) => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{req.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.clients ? `${req.clients.first_name} ${req.clients.last_name}` : "—"}
                      </p>
                    </div>
                    <Badge className={statusColors[req.status] ?? ""}>{t(`status.${req.status}`)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-accent" />
              {t("dashboard.upcoming_arrivals")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingArrivals?.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("dashboard.no_arrivals")}</p>
            ) : (
              <div className="space-y-3">
                {upcomingArrivals?.map((client) => (
                  <div key={client.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{client.first_name} {client.last_name}</p>
                      <p className="text-xs text-muted-foreground">{client.hotel ?? "—"}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {client.arrival_date ? format(new Date(client.arrival_date), "d MMM", { locale: itLocale }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
