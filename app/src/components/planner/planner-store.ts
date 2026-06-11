"use client";

import { create } from "zustand";

import {
  buildSegmentsForDraft,
  getSegmentResultsForDraft,
  initialDraft,
  updatedDraft,
} from "./mock-data";
import type { DraftData, EndpointPoint, MapLongPressState, RouteSegment, ScheduleItem } from "@/lib/types";

interface PlannerState {
  composerText: string;
  lastMessage: string | null;
  cardExpanded: boolean;
  cardLoading: boolean;
  planningStarted: boolean;
  draftVersion: number;
  selectedScheduleId: string | null;
  draft: DraftData;
  segments: RouteSegment[];
  highlightIds: string[];
  origin: EndpointPoint;
  destination: EndpointPoint | null;
  longPressState: MapLongPressState;
  setComposerText: (value: string) => void;
  toggleCardExpanded: () => void;
  selectSchedule: (id: string | null) => void;
  submitMessage: () => Promise<void>;
  startPlanning: () => Promise<void>;
  updateSchedule: (id: string, updates: Partial<ScheduleItem>) => void;
  openLongPressMenu: (lat: number, lng: number, x: number, y: number) => void;
  closeLongPressMenu: () => void;
  setEndpoint: (type: "origin" | "destination") => void;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const usePlannerStore = create<PlannerState>((set, get) => ({
  composerText: "周三上海开会，周四上午杭州见客户，尽量不要太赶",
  lastMessage: null,
  cardExpanded: false,
  cardLoading: false,
  planningStarted: false,
  draftVersion: 0,
  selectedScheduleId: null,
  draft: { schedules: [], preferences: [], pendingIssues: [] },
  segments: [],
  highlightIds: [],
  origin: {
    id: "origin",
    label: "当前定位 · 上海静安",
    lat: 31.2304,
    lng: 121.4737,
  },
  destination: null,
  longPressState: {
    visible: false,
    lat: 0,
    lng: 0,
    x: 0,
    y: 0,
  },
  setComposerText: (value) => set({ composerText: value }),
  toggleCardExpanded: () => set((state) => ({ cardExpanded: !state.cardExpanded })),
  selectSchedule: (id) => set({ selectedScheduleId: id }),
  submitMessage: async () => {
    const { composerText, draftVersion } = get();
    const nextVersion = draftVersion + 1;
    const isFirstPass = nextVersion === 1;
    const nextDraft = isFirstPass ? initialDraft : updatedDraft;
    const nextSegments = buildSegmentsForDraft(nextDraft.schedules);
    const changedScheduleIds = nextDraft.schedules
      .filter((item) => item.sourceMessageId === (isFirstPass ? "msg-1" : "msg-2"))
      .map((item) => item.id);

    set({
      lastMessage: composerText,
      cardLoading: true,
    });

    await wait(1100);

    set({
      cardLoading: false,
      draft: nextDraft,
      segments: nextSegments,
      draftVersion: nextVersion,
      highlightIds: changedScheduleIds,
      selectedScheduleId: changedScheduleIds[0] ?? null,
      planningStarted: false,
    });

    setTimeout(() => {
      set({ highlightIds: [], lastMessage: null });
    }, 1400);
  },
  startPlanning: async () => {
    const { draft } = get();
    const nextSegments = buildSegmentsForDraft(draft.schedules);
    const segmentResults = getSegmentResultsForDraft(draft.schedules);

    set({
      planningStarted: true,
      segments: nextSegments.map((segment) => ({
        ...segment,
        status: "idle",
        mode: null,
        durationMinutes: null,
        cost: null,
        explanation: null,
        degradedReason: null,
      })),
    });

    for (const segment of nextSegments) {
      set((state) => ({
        segments: state.segments.map((item) =>
          item.id === segment.id ? { ...item, status: "loading" } : item,
        ),
      }));

      await wait(900);

      set((state) => ({
        segments: state.segments.map((item) =>
          item.id === segment.id
            ? {
                ...item,
                ...segmentResults[segment.id],
              }
            : item,
        ),
      }));
    }
  },
  updateSchedule: (id, updates) => {
    set((state) => ({
      draft: {
        ...state.draft,
        schedules: state.draft.schedules.map((item) =>
          item.id === id ? { ...item, ...updates, status: "changed" } : item,
        ),
      },
      highlightIds: [id],
    }));

    setTimeout(() => {
      set({ highlightIds: [] });
    }, 1400);
  },
  openLongPressMenu: (lat, lng, x, y) =>
    set({
      longPressState: {
        visible: true,
        lat,
        lng,
        x,
        y,
      },
    }),
  closeLongPressMenu: () =>
    set((state) => ({
      longPressState: {
        ...state.longPressState,
        visible: false,
      },
    })),
  setEndpoint: (type) => {
    const { longPressState } = get();

    if (!longPressState.visible) {
      return;
    }

    if (type === "origin") {
      set((state) => ({
        origin: {
          id: "origin",
          label: `起点 · ${longPressState.lat.toFixed(4)}, ${longPressState.lng.toFixed(4)}`,
          lat: longPressState.lat,
          lng: longPressState.lng,
        },
        segments: buildSegmentsForDraft(state.draft.schedules),
        planningStarted: false,
        longPressState: { ...longPressState, visible: false },
      }));
      return;
    }

    set((state) => ({
      destination: {
        id: "destination",
        label: `终点 · ${longPressState.lat.toFixed(4)}, ${longPressState.lng.toFixed(4)}`,
        lat: longPressState.lat,
        lng: longPressState.lng,
      },
      segments: buildSegmentsForDraft(state.draft.schedules),
      planningStarted: false,
      longPressState: { ...longPressState, visible: false },
    }));
  },
}));
