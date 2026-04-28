"use client";

import { Navigation } from "lucide-react";
import { RouteStop } from "@/types/schedule";

interface RouteMarkerProps {
  stop: RouteStop;
  isStart: boolean;
  isEnd: boolean;
  isHighlighted: boolean;
  onClick: () => void;
}

// Resolve the marker palette once so detailed + simple views stay consistent.
type Palette = {
  gradient: string;
  ring: string;
  glow: string;
  halo: string;
};

function getPalette(isStart: boolean, isEnd: boolean): Palette {
  if (isStart) {
    return {
      gradient: "linear-gradient(135deg,#22c55e 0%,#15803d 100%)",
      ring: "rgba(34,197,94,0.35)",
      glow: "0 4px 14px rgba(22,163,74,0.45)",
      halo: "rgba(34,197,94,0.25)",
    };
  }
  if (isEnd) {
    return {
      gradient: "linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)",
      ring: "rgba(239,68,68,0.35)",
      glow: "0 4px 14px rgba(220,38,38,0.45)",
      halo: "rgba(239,68,68,0.25)",
    };
  }
  return {
    gradient: "linear-gradient(135deg,#f87171 0%,#dc2626 100%)",
    ring: "rgba(220,38,38,0.35)",
    glow: "0 4px 14px rgba(220,38,38,0.4)",
    halo: "rgba(220,38,38,0.22)",
  };
}

const USER_PALETTE: Palette = {
  gradient: "linear-gradient(135deg,#60a5fa 0%,#2563eb 100%)",
  ring: "rgba(59,130,246,0.35)",
  glow: "0 4px 14px rgba(37,99,235,0.5)",
  halo: "rgba(96,165,250,0.3)",
};

export default function RouteMarker({
  stop,
  isStart,
  isEnd,
  isHighlighted,
  onClick,
}: RouteMarkerProps) {
  const palette = stop.isUserLocation ? USER_PALETTE : getPalette(isStart, isEnd);

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer transition-transform duration-200 ease-out-3 hover:scale-110 active:scale-95 ${isHighlighted ? "scale-125" : ""}`}
    >
      {/* Soft outer halo — always faintly visible, stronger on highlight */}
      <div
        className={`absolute inset-[-6px] rounded-full transition-opacity duration-200 ${isHighlighted ? "opacity-100" : "opacity-60"}`}
        style={{ background: `radial-gradient(circle, ${palette.halo} 0%, transparent 70%)` }}
      />

      {/* Pulsing ring for user location only */}
      {stop.isUserLocation && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: palette.halo }}
        />
      )}

      {/* Main marker body */}
      <div
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
        style={{
          background: palette.gradient,
          boxShadow: `${palette.glow}, inset 0 1px 2px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.15)`,
          border: "2px solid rgba(255,255,255,0.95)",
        }}
      >
        {/* Glossy top highlight */}
        <div
          className="absolute top-0.5 left-1/2 -translate-x-1/2 w-5 h-2 rounded-full pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.55), transparent)" }}
        />
        {stop.isUserLocation ? (
          <Navigation className="w-4 h-4 relative z-10" />
        ) : (
          <span className="relative z-10 drop-shadow-sm">{stop.order}</span>
        )}
      </div>

      {/* Highlight ring overlay */}
      {isHighlighted && (
        <div
          className="absolute inset-[-4px] rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 0 3px ${palette.ring}` }}
        />
      )}

      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-9 whitespace-nowrap bg-white dark:bg-[#2d2f2f] px-2.5 py-1 rounded-md text-xs shadow-lg border border-neutral-200 dark:border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
        <div className="font-medium text-neutral-800 dark:text-white">{stop.building.name}</div>
        {stop.className && (
          <div className="text-neutral-500 dark:text-neutral-300">{stop.className}</div>
        )}
      </div>
    </div>
  );
}

// Simple marker for zoomed out view
interface SimpleRouteMarkerProps {
  stop: RouteStop;
  isStart: boolean;
  isEnd: boolean;
}

export function SimpleRouteMarker({ stop, isStart, isEnd }: SimpleRouteMarkerProps) {
  const palette = stop.isUserLocation ? USER_PALETTE : getPalette(isStart, isEnd);

  return (
    <div className="relative w-6 h-6 flex items-center justify-center">
      {/* Outer halo */}
      <div
        className="absolute inset-[-4px] rounded-full"
        style={{ background: `radial-gradient(circle, ${palette.halo} 0%, transparent 70%)` }}
      />

      {/* Pulsing ring for user location */}
      {stop.isUserLocation && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: palette.halo }}
        />
      )}

      {/* Core dot */}
      <div
        className="relative w-[18px] h-[18px] rounded-full flex items-center justify-center"
        style={{
          background: palette.gradient,
          boxShadow: `${palette.glow}, inset 0 1px 1.5px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.15)`,
          border: "1.5px solid rgba(255,255,255,0.95)",
        }}
      >
        {stop.isUserLocation ? (
          <Navigation className="w-2.5 h-2.5 text-white" />
        ) : null}
      </div>
    </div>
  );
}
