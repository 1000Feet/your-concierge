import type { Database } from "@/integrations/supabase/types";

type RequestStatus = Database["public"]["Enums"]["request_status"];

const TRANSITIONS: Record<string, RequestStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["waiting", "cancelled"],
  waiting: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to as RequestStatus) ?? false;
}

export function getNextStatuses(current: string): RequestStatus[] {
  return TRANSITIONS[current] ?? [];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: "Bozza", color: "bg-muted text-muted-foreground", icon: "FileEdit" },
  sent: { label: "Inviata", color: "bg-blue-100 text-blue-800", icon: "Send" },
  waiting: { label: "In Attesa", color: "bg-amber-100 text-amber-800", icon: "Clock" },
  confirmed: { label: "Confermata", color: "bg-green-100 text-green-800", icon: "CheckCircle" },
  completed: { label: "Completata", color: "bg-emerald-100 text-emerald-800", icon: "CheckCheck" },
  cancelled: { label: "Annullata", color: "bg-red-100 text-red-800", icon: "XCircle" },
};

export function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label ?? status;
}

export function getStatusColor(status: string): string {
  return STATUS_CONFIG[status]?.color ?? "";
}

export function getStatusIcon(status: string): string {
  return STATUS_CONFIG[status]?.icon ?? "Circle";
}
