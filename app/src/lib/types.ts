export type ScheduleStatus = "draft" | "pending" | "confirmed" | "changed";

export type SegmentStatus =
  | "idle"
  | "loading"
  | "done"
  | "degraded"
  | "blocked"
  | "failed";

export type TravelMode = "walk" | "taxi" | "rail" | "flight";

export interface ScheduleItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  title: string;
  addressText: string;
  city: string;
  lat: number;
  lng: number;
  order: number;
  status: ScheduleStatus;
  sourceMessageId: string;
}

export interface PreferenceItem {
  id: string;
  type: string;
  label: string;
  value: string;
  required: boolean;
  sourceMessageId: string;
}

export interface PendingIssue {
  id: string;
  scheduleId?: string;
  label: string;
  severity: "info" | "warning" | "critical";
}

export interface RouteSegment {
  id: string;
  fromId: string;
  toId: string;
  order: number;
  mode: TravelMode | null;
  status: SegmentStatus;
  durationMinutes: number | null;
  cost: number | null;
  explanation: string | null;
  degradedReason: string | null;
}

export interface DraftData {
  schedules: ScheduleItem[];
  preferences: PreferenceItem[];
  pendingIssues: PendingIssue[];
}

export interface EndpointPoint {
  id: "origin" | "destination";
  label: string;
  lat: number;
  lng: number;
}

export interface MapLongPressState {
  visible: boolean;
  lat: number;
  lng: number;
  x: number;
  y: number;
}
