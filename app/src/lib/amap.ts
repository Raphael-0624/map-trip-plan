"use client";

import AMapLoader from "@amap/amap-jsapi-loader";

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

type AMapLoaderResult = Awaited<ReturnType<typeof AMapLoader.load>>;

let amapPromise: Promise<AMapLoaderResult> | null = null;

export function loadAmap() {
  if (typeof window === "undefined") {
    throw new Error("AMap can only load in the browser.");
  }

  if (!process.env.NEXT_PUBLIC_AMAP_KEY) {
    throw new Error("Missing NEXT_PUBLIC_AMAP_KEY.");
  }

  if (!amapPromise) {
    window._AMapSecurityConfig = {
      securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE,
    };

    amapPromise = AMapLoader.load({
      key: process.env.NEXT_PUBLIC_AMAP_KEY,
      version: "2.0",
      plugins: ["AMap.Scale", "AMap.ToolBar"],
    });
  }

  return amapPromise;
}
