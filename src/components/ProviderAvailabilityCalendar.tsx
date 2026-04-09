import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameMonth } from "date-fns";
import { it } from "date-fns/locale";

interface Props {
  providerId: string;
}

export function ProviderAvailabilityCalendar({ providerId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editForm, setEditForm] = useState({ start_time: "09:00", end_time: "18:00", max_capacity: "1", notes: "" });

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);

  const { data: availability } = useQuery({
    queryKey: ["provider-availability", providerId, format(start, "yyyy-MM")],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_availability")
        .select("*")
        .eq("provider_id", providerId)
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"));
      return data ?? [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ date, ...rest }: { date: string; start_time: string; end_time: string; max_capacity: number; notes: string }) => {
      const existing = availability?.find((a) => a.date === date);
      if (existing) {
        const { error } = await supabase.from("provider_availability").update(rest).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("provider_availability").insert({ provider_id: providerId, date, ...rest });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-availability", providerId] });
      toast({ title: "Disponibilità aggiornata" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provider_availability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["provider-availability", providerId] }),
  });

  const days = eachDayOfInterval({ start, end });
  const startDow = (getDay(start) + 6) % 7; // Monday = 0

  const getAvail = (date: Date) => availability?.find((a) => a.date === format(date, "yyyy-MM-dd"));

  const getDayColor = (date: Date) => {
    const a = getAvail(date);
    if (!a) return "bg-muted/50";
    if (a.current_bookings >= a.max_capacity) return "bg-red-100 border-red-300";
    if (a.current_bookings > 0) return "bg-amber-100 border-amber-300";
    return "bg-green-100 border-green-300";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium capitalize">{format(currentMonth, "MMMM yyyy", { locale: it })}</span>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div key={d} className="py-1 font-medium">{d}</div>
        ))}
        {Array.from({ length: startDow }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map((day) => {
          const avail = getAvail(day);
          const dateStr = format(day, "yyyy-MM-dd");
          return (
            <Popover key={dateStr}>
              <PopoverTrigger asChild>
                <button className={`p-1 rounded text-xs border ${getDayColor(day)} hover:opacity-80 transition-opacity`}>
                  {format(day, "d")}
                  {avail && <div className="text-[10px]">{avail.current_bookings}/{avail.max_capacity}</div>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-3">
                <p className="font-medium text-sm">{format(day, "d MMMM yyyy", { locale: it })}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Inizio</Label>
                    <Input type="time" value={avail?.start_time?.slice(0, 5) ?? editForm.start_time}
                      onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fine</Label>
                    <Input type="time" value={avail?.end_time?.slice(0, 5) ?? editForm.end_time}
                      onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Capacità max</Label>
                  <Input type="number" min="1" value={avail?.max_capacity ?? editForm.max_capacity}
                    onChange={(e) => setEditForm({ ...editForm, max_capacity: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() =>
                    upsertMutation.mutate({
                      date: dateStr,
                      start_time: editForm.start_time,
                      end_time: editForm.end_time,
                      max_capacity: parseInt(editForm.max_capacity) || 1,
                      notes: editForm.notes,
                    })
                  }>Salva</Button>
                  {avail && (
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(avail.id)}>
                      Rimuovi
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
