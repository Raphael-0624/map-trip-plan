"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, LoaderCircle, MapPinned, Navigation, Route } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePlannerStore } from "./planner-store";
import type { RouteSegment } from "@/lib/types";

const MapCanvas = dynamic(
  () => import("./map-canvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-lg">
          <LoaderCircle className="h-4 w-4 animate-spin text-sky-500" />
          正在初始化地图画布
        </div>
      </div>
    ),
  },
);

const severityStyles = {
  info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  critical: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100",
};

const statusStyles = {
  draft: "bg-slate-100 text-slate-500",
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  changed: "bg-sky-100 text-sky-700",
};

const segmentStatusText: Record<RouteSegment["status"], string> = {
  idle: "等待规划",
  loading: "规划中",
  done: "已完成",
  degraded: "已降级",
  blocked: "待确认",
  failed: "失败",
};

const modeText: Record<NonNullable<RouteSegment["mode"]>, string> = {
  walk: "步行",
  taxi: "打车",
  rail: "高铁/城铁",
  flight: "飞机",
};

function SegmentRow({ segment }: { segment: RouteSegment }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/82 p-3 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Route className="h-4 w-4 text-sky-500" />
          <span>第 {segment.order} 段</span>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-xs",
            segment.status === "loading" && "bg-slate-100 text-slate-600",
            segment.status === "done" && "bg-emerald-100 text-emerald-700",
            segment.status === "degraded" && "bg-amber-100 text-amber-700",
            segment.status === "idle" && "bg-slate-100 text-slate-500",
            segment.status === "blocked" && "bg-rose-100 text-rose-700",
            segment.status === "failed" && "bg-rose-100 text-rose-700",
          )}
        >
          {segmentStatusText[segment.status]}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        {segment.status === "loading" ? (
          <LoaderCircle className="h-4 w-4 animate-spin text-sky-500" />
        ) : (
          <Navigation className="h-4 w-4 text-sky-500" />
        )}
        <span>
          {segment.mode ? modeText[segment.mode] : "等待路线生成"}
          {segment.durationMinutes ? ` · ${segment.durationMinutes} 分钟` : ""}
          {typeof segment.cost === "number" ? ` · ¥${segment.cost}` : ""}
        </span>
      </div>
      {segment.explanation ? <p className="mt-2 text-xs leading-5 text-slate-500">{segment.explanation}</p> : null}
      {segment.degradedReason ? <p className="mt-1 text-xs leading-5 text-amber-700">{segment.degradedReason}</p> : null}
    </div>
  );
}

export function PlannerPage() {
  const {
    composerText,
    lastMessage,
    cardExpanded,
    cardLoading,
    planningStarted,
    draft,
    segments,
    origin,
    destination,
    longPressState,
    selectedScheduleId,
    highlightIds,
    setComposerText,
    toggleCardExpanded,
    submitMessage,
    startPlanning,
    selectSchedule,
    openLongPressMenu,
    closeLongPressMenu,
    setEndpoint,
  } = usePlannerStore();

  const hasPreferences = draft.preferences.length > 0;
  const hasPendingIssues = draft.pendingIssues.length > 0;
  const hasRecognizedContent = draft.schedules.length > 0 || hasPreferences || hasPendingIssues;

  return (
    <main className="relative h-dvh overflow-hidden bg-slate-100 text-slate-900">
      <MapCanvas
        schedules={draft.schedules}
        segments={segments}
        origin={origin}
        destination={destination}
        longPressState={longPressState}
        selectedScheduleId={selectedScheduleId}
        highlightIds={highlightIds}
        onSelectSchedule={selectSchedule}
        onLongPress={openLongPressMenu}
        onSetEndpoint={setEndpoint}
        onCloseLongPressMenu={closeLongPressMenu}
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_45%,rgba(255,255,255,0.16)_100%)]" />

      <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-white/70 bg-white/84 px-3 py-2 text-xs text-slate-600 shadow-lg backdrop-blur-xl">
        <MapPinned className="h-4 w-4 text-sky-500" />
        {origin.label}
      </div>

      {hasRecognizedContent ? (
        <div className="absolute inset-x-4 top-18 bottom-36 z-30">
          <motion.section
            initial={false}
            animate={{ height: cardExpanded ? "100%" : 56 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-[28px] border border-white/70 bg-white/84 shadow-2xl backdrop-blur-xl"
          >
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">已识别行程</p>
            <button
              type="button"
              onClick={toggleCardExpanded}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <ChevronUp className={cn("h-4 w-4 transition", cardExpanded && "rotate-180")} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {cardExpanded ? (
              <motion.div
                key="expanded-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="border-t border-slate-200/80 px-4 py-4"
              >
              {cardLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "calc(100dvh - 14rem)" }}>
                  <div className="space-y-3">
                    {draft.schedules.map((item) => {
                      const active = item.id === selectedScheduleId;
                      const highlighted = highlightIds.includes(item.id);

                      return (
                        <motion.button
                          layout
                          key={item.id}
                          type="button"
                          onClick={() => selectSchedule(item.id)}
                          className={cn(
                            "w-full rounded-2xl border px-4 py-3 text-left transition",
                            active
                              ? "border-sky-200 bg-sky-50/90"
                              : "border-slate-200 bg-white/80 hover:bg-slate-50/90",
                            highlighted && "bg-sky-100/90",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                                  {item.order}
                                </div>
                                <span className="text-sm font-semibold text-slate-800">{item.title}</span>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">
                                {item.date} · {item.startTime}
                                {item.endTime ? ` - ${item.endTime}` : ""}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">{item.addressText}</p>
                            </div>
                            <span className={cn("rounded-full px-2 py-1 text-xs", statusStyles[item.status])}>{item.status}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {hasPreferences ? (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {draft.preferences.map((item) => (
                          <span key={item.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">{origin.label}</div>
                      {destination ? (
                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
                          {destination.label}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {hasPendingIssues ? (
                    <div className="space-y-2">
                      {draft.pendingIssues.map((item) => (
                        <div key={item.id} className={cn("rounded-2xl px-3 py-2 text-xs", severityStyles[item.severity])}>
                          {item.label}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm text-slate-700">逐段规划</p>
                      <button
                        type="button"
                        onClick={() => void startPlanning()}
                        disabled={!draft.schedules.length || cardLoading}
                        className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white/70"
                      >
                        {planningStarted ? "重新规划" : "开始规划"}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {segments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">
                          暂无规划结果
                        </div>
                      ) : (
                        segments.map((segment) => <SegmentRow key={segment.id} segment={segment} />)
                      )}
                    </div>
                  </div>
                </div>
              )}
              </motion.div>
            ) : null}
          </AnimatePresence>
          </motion.section>
        </div>
      ) : null}

      <AnimatePresence>
        {lastMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute bottom-28 right-4 z-40 max-w-[75%] rounded-3xl rounded-br-lg bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-xl"
          >
            {lastMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-white/70 bg-white/78 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <label className="sr-only" htmlFor="planner-input">
            输入行程需求
          </label>
          <textarea
            id="planner-input"
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
            rows={2}
            placeholder="输入日程、地点、偏好，例如：周三上海开会，周四上午杭州见客户，尽量不要太赶"
            className="w-full resize-none bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
          />
          <div className="mt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void submitMessage()}
              disabled={!composerText.trim() || cardLoading}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
