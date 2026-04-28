"use client";

import { useEffect } from "react";
import { useNavigation } from "@/context/NavigationContext";
import { useSidebar } from "@/context/SidebarContext";
import {
  formatDistance,
  formatWalkTime,
} from "@/utils/pathfinding/geoUtils";
import {
  Navigation,
  Play,
  Pencil,
  X,
  Footprints,
  AlertCircle,
} from "lucide-react";

export default function NavigationBottomCard() {
  const {
    origin,
    destination,
    route,
    isPreviewing,
    clearDirections,
    startNavigation,
    error,
    loading,
  } = useNavigation();
  const { setView, setIsOpen } = useSidebar();

  // Auto-dismiss transient errors so the UI doesn't wedge on a stale message
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => clearDirections(), 4500);
    return () => clearTimeout(t);
  }, [error, clearDirections]);

  // Loading placeholder while the route is being fetched
  if (loading && !route) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,420px)]">
        <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-[#1f2122]/95 backdrop-blur-md shadow-2xl px-4 py-3 flex items-center gap-3">
          <Navigation className="w-4 h-4 text-highlight animate-pulse" />
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            Finding walking route…
          </span>
        </div>
      </div>
    );
  }

  if (error && !route) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,420px)]">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 flex items-start gap-2 text-sm text-red-700 dark:text-red-300 shadow-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={clearDirections}
            className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (!isPreviewing || !destination || !route) return null;

  const openDirectionsEditor = () => {
    setView("schedule");
    setIsOpen(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,420px)] pointer-events-auto">
      <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-[#1f2122]/95 backdrop-blur-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-start gap-3">
          <div className="mt-0.5 w-8 h-8 rounded-full bg-highlight/15 dark:bg-highlight/25 flex items-center justify-center flex-shrink-0">
            <Navigation className="w-4 h-4 text-highlight" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {origin ? "Walking" : "Walking directions to"}
            </p>
            {origin ? (
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">{origin.name}</span>
                <span className="text-neutral-400 dark:text-neutral-500 mx-1">→</span>
                {destination.name}
              </p>
            ) : (
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {destination.name}
              </p>
            )}
          </div>
          <button
            onClick={clearDirections}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-500 dark:text-neutral-400 cursor-pointer"
            aria-label="Clear directions"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-2 flex items-center gap-4 text-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-highlight tabular-nums">
              {formatWalkTime(route.duration / 60)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
            <Footprints className="w-3.5 h-3.5" />
            <span>{formatDistance(route.distance)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-3 pb-3 pt-1 flex gap-2">
          <button
            onClick={openDirectionsEditor}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={startNavigation}
            className="button-depth flex-[2] py-2.5 rounded-xl bg-highlight text-white border border-highlight-hover hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 text-sm font-semibold cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
