import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Users, ClipboardList, TrendingUp } from "lucide-react";

export function DailySummary() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase.functions.invoke("ai-summary");
      if (err) throw err;
      setSummary(data);
    } catch (e: any) {
      setError(e.message || "Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-accent/20 bg-accent/5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-accent" />
              Briefing Giornaliero AI
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={fetchSummary} disabled={loading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                {summary ? "Aggiorna" : "Genera"}
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!summary && !error && !loading && (
              <p className="text-sm text-muted-foreground">Clicca "Genera" per il briefing di oggi</p>
            )}
            {loading && <p className="text-sm text-muted-foreground animate-pulse">Generazione in corso...</p>}
            {summary && (
              <div className="space-y-3">
                {summary.summary && <p className="text-sm whitespace-pre-wrap">{summary.summary}</p>}
                {summary.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {summary.metrics.arrivals != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-accent" />
                        <span>{summary.metrics.arrivals} arrivi oggi</span>
                      </div>
                    )}
                    {summary.metrics.active_requests != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 text-accent" />
                        <span>{summary.metrics.active_requests} richieste attive</span>
                      </div>
                    )}
                    {summary.metrics.weekly_revenue != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-accent" />
                        <span>€{summary.metrics.weekly_revenue} revenue</span>
                      </div>
                    )}
                  </div>
                )}
                {summary.alerts?.length > 0 && (
                  <div className="space-y-1">
                    {summary.alerts.map((alert: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
