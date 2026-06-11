import type { DraftData, RouteSegment, ScheduleItem } from "@/lib/types";

function buildSegments(schedules: ScheduleItem[]): RouteSegment[] {
  const segments: RouteSegment[] = [];

  if (schedules.length === 0) {
    return segments;
  }

  segments.push({
    id: "segment-1",
    fromId: "origin",
    toId: schedules[0].id,
    order: 1,
    mode: null,
    status: "idle",
    durationMinutes: null,
    cost: null,
    explanation: null,
    degradedReason: null,
  });

  for (let index = 0; index < schedules.length - 1; index += 1) {
    segments.push({
      id: `segment-${index + 2}`,
      fromId: schedules[index].id,
      toId: schedules[index + 1].id,
      order: index + 2,
      mode: null,
      status: "idle",
      durationMinutes: null,
      cost: null,
      explanation: null,
      degradedReason: null,
    });
  }

  segments.push({
    id: `segment-${segments.length + 1}`,
    fromId: schedules[schedules.length - 1].id,
    toId: "destination",
    order: segments.length + 1,
    mode: null,
    status: "idle",
    durationMinutes: null,
    cost: null,
    explanation: null,
    degradedReason: null,
  });

  return segments;
}

export function buildSegmentsForDraft(schedules: ScheduleItem[]) {
  return buildSegments(schedules);
}

export function createSegmentResult(segment: RouteSegment, totalSegments: number): Partial<RouteSegment> {
  if (segment.fromId === "origin") {
    return {
      mode: "taxi",
      status: "done",
      durationMinutes: 26,
      cost: 42,
      explanation: "从起点直达首个日程，先按同城打车处理。",
    };
  }

  if (segment.toId === "destination") {
    return {
      mode: totalSegments > 3 ? "rail" : "taxi",
      status: totalSegments > 3 ? "done" : "degraded",
      durationMinutes: totalSegments > 3 ? 58 : 36,
      cost: totalSegments > 3 ? 76 : 60,
      explanation:
        totalSegments > 3 ? "末段按返程处理，优先给出更稳定的城际方案。" : "终点距离较近，先按打车收尾。",
      degradedReason: totalSegments > 3 ? null : "终点已接入，但住宿与返程策略仍是简化版。",
    };
  }

  return {
    mode: "rail",
    status: "done",
    durationMinutes: 102,
    cost: 168,
    explanation: "中间跨城段先按高铁/城铁优先策略处理。",
  };
}

export function getSegmentResultsForDraft(schedules: ScheduleItem[]) {
  const segments = buildSegments(schedules);
  return Object.fromEntries(
    segments.map((segment) => [segment.id, createSegmentResult(segment, segments.length)]),
  ) as Record<string, Partial<RouteSegment>>;
}


export const initialDraft: DraftData = {
  schedules: [
    {
      id: "schedule-1",
      date: "6月18日",
      startTime: "14:00",
      endTime: "15:30",
      title: "客户方案评审",
      addressText: "上海虹桥商务区",
      city: "上海",
      lat: 31.1942,
      lng: 121.3215,
      order: 1,
      status: "pending",
      sourceMessageId: "msg-1",
    },
    {
      id: "schedule-2",
      date: "6月19日",
      startTime: "10:00",
      endTime: "11:30",
      title: "杭州客户会面",
      addressText: "杭州未来科技城",
      city: "杭州",
      lat: 30.2755,
      lng: 120.0336,
      order: 2,
      status: "confirmed",
      sourceMessageId: "msg-1",
    },
  ],
  preferences: [
    {
      id: "pref-1",
      type: "time",
      label: "不要太赶",
      value: "avoid-tight-connection",
      required: false,
      sourceMessageId: "msg-1",
    },
    {
      id: "pref-2",
      type: "transport",
      label: "优先高铁",
      value: "prefer-rail",
      required: false,
      sourceMessageId: "msg-1",
    },
  ],
  pendingIssues: [
    {
      id: "issue-1",
      scheduleId: "schedule-1",
      label: "上海会议地点仍需精确到楼宇或园区",
      severity: "warning",
    },
  ],
};

export const updatedDraft: DraftData = {
  schedules: [
    {
      id: "schedule-1",
      date: "6月18日",
      startTime: "15:00",
      endTime: "16:30",
      title: "客户方案评审",
      addressText: "上海虹桥天地",
      city: "上海",
      lat: 31.1948,
      lng: 121.3174,
      order: 1,
      status: "changed",
      sourceMessageId: "msg-2",
    },
    {
      id: "schedule-2",
      date: "6月19日",
      startTime: "10:00",
      endTime: "11:30",
      title: "杭州客户会面",
      addressText: "杭州未来科技城",
      city: "杭州",
      lat: 30.2755,
      lng: 120.0336,
      order: 2,
      status: "confirmed",
      sourceMessageId: "msg-1",
    },
    {
      id: "schedule-3",
      date: "6月20日",
      startTime: "09:30",
      endTime: "10:30",
      title: "苏州团队复盘",
      addressText: "苏州工业园区",
      city: "苏州",
      lat: 31.324,
      lng: 120.7214,
      order: 3,
      status: "confirmed",
      sourceMessageId: "msg-2",
    },
  ],
  preferences: [
    {
      id: "pref-1",
      type: "time",
      label: "不要太赶",
      value: "avoid-tight-connection",
      required: false,
      sourceMessageId: "msg-1",
    },
    {
      id: "pref-2",
      type: "transport",
      label: "优先高铁",
      value: "prefer-rail",
      required: false,
      sourceMessageId: "msg-1",
    },
    {
      id: "pref-3",
      type: "hotel",
      label: "住在会议附近",
      value: "stay-near-meeting",
      required: false,
      sourceMessageId: "msg-2",
    },
  ],
  pendingIssues: [
    {
      id: "issue-2",
      scheduleId: "schedule-3",
      label: "苏州会后是否当天返程尚未确认",
      severity: "info",
    },
  ],
};

