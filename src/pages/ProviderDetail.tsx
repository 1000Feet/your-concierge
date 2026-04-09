import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Star, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { ProviderAvailabilityCalendar } from "@/components/ProviderAvailabilityCalendar";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const ProviderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: provider, isLoading } = useQuery({
    queryKey: ["provider", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: assignments } = useQuery({
    queryKey: ["provider-assignments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("request_providers")
        .select("*, requests(description, service_type, service_date, status, clients(first_name, last_name))")
        .eq("provider_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">{t("common.loading")}</div>;
  if (!provider) return <div className="flex items-center justify-center h-64 text-muted-foreground">{t("providers.not_found")}</div>;

  const totalAssignments = assignments?.length ?? 0;
  const accepted = assignments?.filter((a) => a.status === "accepted").length ?? 0;
  const declined = assignments?.filter((a) => a.status === "declined").length ?? 0;
  const acceptRate = totalAssignments > 0 ? Math.round((accepted / totalAssignments) * 100) : 0;
  const totalRevenue = assignments?.reduce((sum, a) => sum + (Number(a.quoted_price) || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/providers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold">{provider.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{t(`service_types.${provider.category}`, provider.category)}</Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3 w-3 fill-accent text-accent" />{provider.reliability}/10
            </span>
            {provider.is_active ? (
              <Badge className="bg-green-100 text-green-800">{t("providers.active")}</Badge>
            ) : (
              <Badge variant="destructive">{t("providers.inactive")}</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="availability">
        <TabsList>
          <TabsTrigger value="availability">{t("providers.availability")}</TabsTrigger>
          <TabsTrigger value="history">{t("providers.request_history")}</TabsTrigger>
          <TabsTrigger value="performance">{t("providers.performance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="availability" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("providers.availability_calendar")}</CardTitle></CardHeader>
            <CardContent>
              <ProviderAvailabilityCalendar providerId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("requests.title")}</TableHead>
                    <TableHead>{t("requests.client")}</TableHead>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("requests.quoted_price")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!assignments?.length ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("providers.no_requests")}</TableCell></TableRow>
                  ) : (
                    assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-sm">{a.requests?.description?.slice(0, 40)}</TableCell>
                        <TableCell className="text-sm">
                          {a.requests?.clients ? `${a.requests.clients.first_name} ${a.requests.clients.last_name}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.requests?.service_date ? format(new Date(a.requests.service_date), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{a.quoted_price ? `€${Number(a.quoted_price).toFixed(0)}` : "—"}</TableCell>
                        <TableCell><Badge className={
                          a.status === "accepted" ? "bg-green-100 text-green-800" :
                          a.status === "declined" ? "bg-red-100 text-red-800" :
                          a.status === "contacted" ? "bg-blue-100 text-blue-800" :
                          "bg-muted text-muted-foreground"
                        }>{t(`provider_status.${a.status}`)}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{totalAssignments}</p>
                <p className="text-sm text-muted-foreground">{t("providers.total_requests")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-2xl font-bold">{acceptRate}%</p>
                </div>
                <p className="text-sm text-muted-foreground">{t("providers.acceptance_rate")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <p className="text-2xl font-bold">{declined}</p>
                </div>
                <p className="text-sm text-muted-foreground">{t("providers.declined")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  <p className="text-2xl font-bold">€{totalRevenue.toFixed(0)}</p>
                </div>
                <p className="text-sm text-muted-foreground">{t("providers.total_revenue")}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProviderDetail;
