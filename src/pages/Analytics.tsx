import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const COLORS = [
  "hsl(38 50% 60%)", "hsl(215 35% 17%)", "hsl(200 60% 50%)", "hsl(160 50% 45%)",
  "hsl(340 60% 50%)", "hsl(280 50% 50%)", "hsl(30 70% 50%)", "hsl(100 40% 45%)", "hsl(0 50% 50%)",
];

const Analytics = () => {
  const { t } = useTranslation();

  const { data: requests } = useQuery({
    queryKey: ["analytics-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("requests").select("created_at, status, service_type, budget, final_price, margin");
      return data ?? [];
    },
  });

  const { data: providers } = useQuery({
    queryKey: ["analytics-providers"],
    queryFn: async () => {
      const { data } = await supabase.from("providers").select("id, name, reliability, commission_pct, category");
      return data ?? [];
    },
  });

  const { data: requestProviders } = useQuery({
    queryKey: ["analytics-rp"],
    queryFn: async () => {
      const { data } = await supabase.from("request_providers").select("provider_id, status");
      return data ?? [];
    },
  });

  const monthlyData = (() => {
    if (!requests) return [];
    const map = new Map<string, { month: string; count: number; margin: number }>();
    requests.forEach((r) => {
      const key = format(startOfMonth(parseISO(r.created_at)), "yyyy-MM");
      const label = format(startOfMonth(parseISO(r.created_at)), "MMM yy", { locale: itLocale });
      const existing = map.get(key) ?? { month: label, count: 0, margin: 0 };
      existing.count++;
      existing.margin += Number(r.margin) || 0;
      map.set(key, existing);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  })();

  const serviceData = (() => {
    if (!requests) return [];
    const map = new Map<string, number>();
    requests.forEach((r) => { map.set(r.service_type, (map.get(r.service_type) ?? 0) + 1); });
    return Array.from(map.entries()).map(([name, value]) => ({
      name: t(`service_types.${name}`, name),
      value,
    }));
  })();

  const providerPerf = (() => {
    if (!providers || !requestProviders) return [];
    return providers.slice(0, 10).map((p) => {
      const rps = requestProviders.filter((rp) => rp.provider_id === p.id);
      const accepted = rps.filter((rp) => rp.status === "accepted").length;
      const total = rps.length;
      return {
        name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
        reliability: p.reliability ?? 0,
        acceptance: total > 0 ? Math.round((accepted / total) * 100) : 0,
      };
    }).sort((a, b) => b.reliability - a.reliability);
  })();

  const totalRevenue = requests?.reduce((s, r) => s + (Number(r.final_price) || 0), 0) ?? 0;
  const totalMargin = requests?.reduce((s, r) => s + (Number(r.margin) || 0), 0) ?? 0;
  const avgMarginPct = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : "0";

  const chartConfig = {
    count: { label: t("requests.title"), color: "hsl(38 50% 60%)" },
    margin: { label: t("requests.margin"), color: "hsl(215 35% 17%)" },
    reliability: { label: t("providers.reliability"), color: "hsl(38 50% 60%)" },
    acceptance: { label: t("providers.acceptance_rate"), color: "hsl(215 35% 17%)" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">{t("analytics.title")}</h1>
        <p className="text-muted-foreground">{t("analytics.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("analytics.total_revenue")}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">€{totalRevenue.toFixed(0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("analytics.total_margin")}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">€{totalMargin.toFixed(0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("analytics.avg_margin")}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgMarginPct}%</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("analytics.requests_per_month")}</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t("common.no_data")}</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" /><YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(38 50% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("analytics.margin_per_month")}</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t("common.no_data")}</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" /><YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="margin" stroke="hsl(215 35% 17%)" strokeWidth={2} dot={{ fill: "hsl(38 50% 60%)" }} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("analytics.service_distribution")}</CardTitle></CardHeader>
          <CardContent>
            {serviceData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t("common.no_data")}</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {serviceData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("analytics.provider_performance")}</CardTitle></CardHeader>
          <CardContent>
            {providerPerf.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">{t("common.no_data")}</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={providerPerf} layout="vertical">
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="reliability" fill="hsl(38 50% 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
