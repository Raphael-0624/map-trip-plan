"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { loadAmap } from "@/lib/amap";
import type { EndpointPoint, MapLongPressState, RouteSegment, ScheduleItem } from "@/lib/types";

type AMapApi = Awaited<ReturnType<typeof loadAmap>>;

type AMapMouseEvent = {
  lnglat?: { getLat: () => number; getLng: () => number };
  pixel?: { getX: () => number; getY: () => number };
};

type AMapInstance = {
  addControl: (...args: unknown[]) => void;
  setFitView: (...args: unknown[]) => void;
  destroy: () => void;
  resize: () => void;
  on: (eventName: string, handler: (event: AMapMouseEvent) => void) => void;
};

type MarkerWithId = {
  __scheduleId?: string;
  on: (eventName: string, handler: () => void) => void;
  setMap: (map: AMapInstance | null) => void;
};

type PolylineWithId = {
  __segmentId?: string;
  setMap: (map: AMapInstance | null) => void;
};

interface AMapConstructors {
  Map: new (container: HTMLDivElement, options: Record<string, unknown>) => AMapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerWithId;
  Polyline: new (options: Record<string, unknown>) => PolylineWithId;
  Pixel: new (x: number, y: number) => unknown;
  Scale: new () => unknown;
  ToolBar: new (options: Record<string, unknown>) => unknown;
}

interface WindowWithAMap extends Window {
  AMap: AMapApi & AMapConstructors;
}

const SHANGHAI_CENTER: [number, number] = [121.4737, 31.2304];

type MapCanvasProps = {
  schedules: ScheduleItem[];
  segments: RouteSegment[];
  origin: EndpointPoint;
  destination: EndpointPoint | null;
  longPressState: MapLongPressState;
  selectedScheduleId: string | null;
  highlightIds: string[];
  onSelectSchedule: (id: string) => void;
  onLongPress: (lat: number, lng: number, x: number, y: number) => void;
  onSetEndpoint: (type: "origin" | "destination") => void;
  onCloseLongPressMenu: () => void;
};

type AnimatedLineState = {
  segmentId: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
};

function getAmapWindow() {
  return window as unknown as WindowWithAMap;
}

function getAmap() {
  return getAmapWindow().AMap;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBubblePosition(x: number, y: number) {
  return {
    x: clamp(x, 104, window.innerWidth - 104),
    y: clamp(y, 96, window.innerHeight - 172),
  };
}

function createScheduleMarkerContent(schedule: ScheduleItem, isActive: boolean, isHighlighted: boolean) {
  const ring = isHighlighted ? "0 12px 28px rgba(15,23,42,0.3), 0 0 0 2px rgba(59,130,246,0.35)" : "0 12px 28px rgba(15,23,42,0.28)";
  const bg = isActive ? "linear-gradient(180deg,#3b82f6 0%,#1d4ed8 100%)" : "linear-gradient(180deg,#60a5fa 0%,#2563eb 100%)";

  return `
    <div style="display:flex;align-items:flex-start;gap:8px;transform:translateY(-12px);">
      <div style="position:relative;width:28px;height:36px;filter:drop-shadow(0 8px 14px rgba(15,23,42,0.32));flex-shrink:0;">
        <div style="position:absolute;left:0;top:0;width:28px;height:28px;border-radius:9999px 9999px 9999px 0;background:${bg};transform:rotate(-45deg);"></div>
        <div style="position:absolute;left:7px;top:7px;display:flex;height:14px;width:14px;align-items:center;justify-content:center;border-radius:9999px;background:rgba(255,255,255,0.95);color:#1e3a8a;font-size:10px;font-weight:800;">${schedule.order}</div>
      </div>
      <div style="margin-top:4px;max-width:124px;padding:6px 8px;border-radius:12px;background:rgba(255,255,255,0.96);box-shadow:${ring};font-size:11px;line-height:1.25;color:#0f172a;backdrop-filter:blur(10px);">
        <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${schedule.title}</div>
      </div>
    </div>
  `;
}

function createEndpointMarkerContent(label: string, tone: "origin" | "destination") {
  const bg = tone === "origin" ? "linear-gradient(180deg,#34d399 0%,#059669 100%)" : "linear-gradient(180deg,#fb923c 0%,#ea580c 100%)";
  const text = tone === "origin" ? "起" : "终";

  return `
    <div style="display:flex;align-items:center;gap:8px;transform:translateY(-12px);">
      <div style="position:relative;width:28px;height:36px;filter:drop-shadow(0 10px 16px rgba(15,23,42,0.28));flex-shrink:0;">
        <div style="position:absolute;left:0;top:0;width:28px;height:28px;border-radius:9999px 9999px 9999px 0;background:${bg};transform:rotate(-45deg);"></div>
        <div style="position:absolute;left:7px;top:7px;display:flex;height:14px;width:14px;align-items:center;justify-content:center;border-radius:9999px;background:rgba(255,255,255,0.95);color:#0f172a;font-size:10px;font-weight:800;">${text}</div>
      </div>
      <div style="max-width:150px;padding:7px 10px;border-radius:14px;background:rgba(255,255,255,0.96);box-shadow:0 12px 28px rgba(15,23,42,0.25);font-size:11px;line-height:1.25;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label}</div>
    </div>
  `;
}

function buildSegmentPolyline(from: { lat: number; lng: number } | null, to: { lat: number; lng: number } | null) {
  if (!from || !to) {
    return [];
  }

  return [
    [from.lng, from.lat],
    [to.lng, to.lat],
  ];
}

function buildAnimatedLines(schedules: ScheduleItem[], segments: RouteSegment[], origin: EndpointPoint, destination: EndpointPoint | null) {
  const planned = segments
    .filter((segment) => segment.status !== "idle")
    .map((segment) => {
      const from = segment.fromId === "origin" ? origin : schedules.find((item) => item.id === segment.fromId) ?? null;
      const to =
        segment.toId === "destination"
          ? destination ?? schedules[schedules.length - 1] ?? null
          : schedules.find((item) => item.id === segment.toId) ?? null;

      if (!from || !to) {
        return null;
      }

      return {
        segmentId: segment.id,
        from: { lat: from.lat, lng: from.lng },
        to: { lat: to.lat, lng: to.lng },
      } satisfies AnimatedLineState;
    })
    .filter(Boolean) as AnimatedLineState[];

  if (planned.length > 0) {
    return planned;
  }

  if (schedules.length < 2) {
    return [];
  }

  return schedules.slice(0, -1).map((schedule, index) => ({
    segmentId: `identified-${index + 1}`,
    from: { lat: schedule.lat, lng: schedule.lng },
    to: { lat: schedules[index + 1].lat, lng: schedules[index + 1].lng },
  }));
}

function FlyLines({ lines }: { lines: AnimatedLineState[] }) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
      <defs>
        <linearGradient id="fly-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.12" />
          <stop offset="50%" stopColor="#475569" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {lines.map((line) => (
        <line
          key={line.segmentId}
          x1={`${((line.from.lng - 119) / 4) * 100}%`}
          y1={`${((32 - line.from.lat) / 3) * 100}%`}
          x2={`${((line.to.lng - 119) / 4) * 100}%`}
          y2={`${((32 - line.to.lat) / 3) * 100}%`}
          stroke="url(#fly-line-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="10 8"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="1.25s" repeatCount="indefinite" />
        </line>
      ))}
    </svg>
  );
}

export function MapCanvas({
  schedules,
  segments,
  origin,
  destination,
  longPressState,
  selectedScheduleId,
  highlightIds,
  onSelectSchedule,
  onLongPress,
  onSetEndpoint,
  onCloseLongPressMenu,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapInstance | null>(null);
  const markersRef = useRef<MarkerWithId[]>([]);
  const polylinesRef = useRef<PolylineWithId[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const animatedLines = useMemo(
    () => buildAnimatedLines(schedules, segments, origin, destination),
    [destination, origin, schedules, segments],
  );

  const scheduleMap = useMemo(() => new Map(schedules.map((schedule) => [schedule.id, schedule])), [schedules]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let disposed = false;

    void loadAmap()
      .then((AMap) => {
        if (!containerRef.current || disposed) {
          return;
        }

        const map = new AMap.Map(containerRef.current, {
          viewMode: "2D",
          zoom: 10.5,
          center: SHANGHAI_CENTER,
          mapStyle: "amap://styles/whitesmoke",
          features: ["bg", "road"],
          pitchEnable: false,
          resizeEnable: true,
          labelzIndex: 1,
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: { top: "110px", right: "16px" } }));

        map.on("rightclick", (event: AMapMouseEvent) => {
          if (!event.lnglat) {
            return;
          }

          const lat = event.lnglat.getLat();
          const lng = event.lnglat.getLng();
          const x = event.pixel?.getX() ?? window.innerWidth * 0.5;
          const y = event.pixel?.getY() ?? window.innerHeight * 0.5;
          const bubble = getBubblePosition(x, y);
          onLongPress(lat, lng, bubble.x, bubble.y);
        });

        mapRef.current = map;

        requestAnimationFrame(() => {
          map.resize();
          requestAnimationFrame(() => {
            map.resize();
            setMapReady(true);
          });
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "高德地图加载失败";
        setMapError(message);
      });

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      polylinesRef.current.forEach((line) => line.setMap(null));
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [onLongPress]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const AMap = getAmap();
    const endpointMarkers: MarkerWithId[] = [
      new AMap.Marker({
        position: [origin.lng, origin.lat],
        offset: new AMap.Pixel(-14, -32),
        content: createEndpointMarkerContent(origin.label, "origin"),
      }),
    ];

    if (destination) {
      endpointMarkers.push(
        new AMap.Marker({
          position: [destination.lng, destination.lat],
          offset: new AMap.Pixel(-14, -32),
          content: createEndpointMarkerContent(destination.label, "destination"),
        }),
      );
    }

    const scheduleMarkers = schedules.map((schedule) => {
      const isActive = schedule.id === selectedScheduleId;
      const isHighlighted = highlightIds.includes(schedule.id);
      const marker = new AMap.Marker({
        position: [schedule.lng, schedule.lat],
        offset: new AMap.Pixel(-14, -44),
        content: createScheduleMarkerContent(schedule, isActive, isHighlighted),
      });
      marker.__scheduleId = schedule.id;
      marker.on("click", () => onSelectSchedule(schedule.id));
      return marker;
    });

    const nextMarkers = [...endpointMarkers, ...scheduleMarkers];
    nextMarkers.forEach((marker) => marker.setMap(map));
    markersRef.current = nextMarkers;

    if (nextMarkers.length > 0) {
      map.setFitView(nextMarkers, false, [80, 180, 80, 180], 14);
    }
  }, [destination, highlightIds, mapReady, onSelectSchedule, origin, schedules, selectedScheduleId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    polylinesRef.current.forEach((line) => line.setMap(null));
    polylinesRef.current = [];

    const AMap = getAmap();
    const nextLines = segments
      .filter((segment) => segment.status !== "idle")
      .map((segment) => {
        const from = segment.fromId === "origin" ? origin : scheduleMap.get(segment.fromId) ?? null;
        const to =
          segment.toId === "destination"
            ? destination ?? schedules[schedules.length - 1] ?? null
            : scheduleMap.get(segment.toId) ?? null;
        const path = buildSegmentPolyline(from, to);

        if (path.length === 0) {
          return null;
        }

        const line = new AMap.Polyline({
          path,
          borderWeight: 0,
          strokeWeight: 6,
          strokeOpacity: 0.95,
          strokeStyle: segment.status === "loading" ? "dashed" : "solid",
          strokeColor:
            segment.status === "degraded"
              ? "#f59e0b"
              : segment.status === "loading"
                ? "#7dd3fc"
                : "#2563eb",
          lineJoin: "round",
          lineCap: "round",
          showDir: true,
        });

        line.__segmentId = segment.id;
        line.setMap(map);
        return line;
      })
      .filter((line): line is PolylineWithId => Boolean(line));

    polylinesRef.current = nextLines;
  }, [destination, mapReady, origin, scheduleMap, schedules, segments]);

  return (
    <>
      <div ref={containerRef} data-map-container="true" className="fixed inset-0 h-dvh w-screen" />
      <FlyLines lines={animatedLines} />

      {!mapReady && !mapError ? (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/15 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm text-slate-800 shadow-lg">
            <LoaderCircle className="h-4 w-4 animate-spin text-sky-500" />
            正在加载高德地图
          </div>
        </div>
      ) : null}

      {mapError ? (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/40 px-6 text-center">
          <div className="max-w-xs rounded-3xl border border-rose-200 bg-white/92 px-5 py-4 text-sm text-rose-700 shadow-2xl">
            <p className="font-semibold">地图加载失败</p>
            <p className="mt-2 text-xs leading-5 text-rose-600">{mapError}</p>
          </div>
        </div>
      ) : null}

      {longPressState.visible ? (
        <div
          className="fixed z-50 w-[168px] -translate-x-1/2 rounded-3xl border border-white/60 bg-white/96 p-3 shadow-2xl backdrop-blur-xl"
          style={{ left: longPressState.x, top: longPressState.y }}
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onSetEndpoint("origin")}
              className="rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-sm"
            >
              设为起点
            </button>
            <button
              type="button"
              onClick={() => onSetEndpoint("destination")}
              className="rounded-2xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm"
            >
              设为终点
            </button>
            <button
              type="button"
              onClick={onCloseLongPressMenu}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-500"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
