"use client";

import { useEffect, useMemo } from "react";
import { useNavigation } from "@/context/NavigationContext";
import { useMapContext } from "@/context/MapContext";
import {
  formatDistance,
  formatWalkTime,
  haversineDistance,
} from "@/utils/pathfinding/geoUtils";
import {
  X,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Gauge,
  Zap,
} from "lucide-react";

function maneuverIcon(modifier?: string, type?: string) {
  if (type === "arrive") return <Flag className="w-7 h-7" strokeWidth={2.5} />;
  switch (modifier) {
    case "left":
    case "slight left":
    case "sharp left":
      return <CornerUpLeft className="w-7 h-7" strokeWidth={2.5} />;
    case "right":
    case "slight right":
    case "sharp right":
      return <CornerUpRight className="w-7 h-7" strokeWidth={2.5} />;
    default:
      return <ArrowUp className="w-7 h-7" strokeWidth={2.5} />;
  }
}

export default function NavigationMode() {
  const {
    isNavigating,
    route,
    currentStepIndex,
    destination,
    endNavigation,
    simulated,
    toggleSimulation,
    recenter,
  } = useNavigation();
  const { userLocation } = useMapContext();

  // Lock body scroll + hide chrome while navigating
  useEffect(() => {
    if (!isNavigating) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("navigating");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("navigating");
    };
  }, [isNavigating]);

  const currentStep = route?.steps[currentStepIndex];
  const distanceToStep = useMemo(() => {
    if (!currentStep || !userLocation) return null;
    return haversineDistance(userLocation, currentStep.maneuverLocation);
  }, [currentStep, userLocation]);

  const totalRemaining = useMemo(() => {
    if (!route) return { distance: 0, duration: 0 };
    const remainingSteps = route.steps.slice(currentStepIndex);
    return {
      distance: remainingSteps.reduce((s, x) => s + x.distance, 0),
      duration: remainingSteps.reduce((s, x) => s + x.duration, 0),
    };
  }, [route, currentStepIndex]);

  const arrived = useMemo(() => {
    if (!route || !userLocation || !destination) return false;
    const isLastStep = currentStepIndex >= route.steps.length - 1;
    const distToDest = haversineDistance(userLocation, destination.coordinates);
    return isLastStep && distToDest < 10;
  }, [route, userLocation, destination, currentStepIndex]);

  if (!isNavigating || !route) return null;

  return (
    <>
      {/* Top instruction card */}
      <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none p-2 sm:p-3">
        <div
          className="mx-auto max-w-xl rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-[#1f2122]/95 backdrop-blur-md shadow-2xl overflow-hidden pointer-events-auto"
          style={{ marginTop: "env(safe-area-inset-top)" }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-highlight text-white flex items-center justify-center flex-shrink-0 shadow-md">
              {arrived ? (
                <Flag className="w-7 h-7" strokeWidth={2.5} />
              ) : (
                maneuverIcon(currentStep?.modifier, currentStep?.maneuverType)
              )}
            </div>
            <div className="flex-1 min-w-0">
              {arrived ? (
                <p className="text-base font-semibold text-green-600 dark:text-green-400">
                  You have arrived
                </p>
              ) : (
                <>
                  {distanceToStep !== null && (
                    <p className="text-xs font-medium text-highlight uppercase tracking-wide">
                      In {formatDistance(distanceToStep)}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2">
                    {currentStep?.instruction ?? "Continue"}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:p-3 pointer-events-none">
        <div
          className="mx-auto max-w-xl rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-[#1f2122]/95 backdrop-blur-md shadow-2xl overflow-hidden pointer-events-auto"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="px-4 py-2.5 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                To {destination?.name ?? "destination"}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-highlight tabular-nums">
                  {formatWalkTime(totalRemaining.duration / 60)}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  · {formatDistance(totalRemaining.distance)}
                </span>
              </div>
            </div>

            <button
              onClick={recenter}
              className="p-2 rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 cursor-pointer"
              aria-label="Recenter"
              title="Recenter"
            >
              <Gauge className="w-4 h-4" />
            </button>

            <button
              onClick={toggleSimulation}
              className={`p-2 rounded-lg border cursor-pointer ${
                simulated
                  ? "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-400"
                  : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5"
              }`}
              aria-label={simulated ? "Stop simulation" : "Simulate walking"}
              title={simulated ? "Stop simulation" : "Simulate walking"}
            >
              <Zap className="w-4 h-4" />
            </button>

            <button
              onClick={endNavigation}
              className="py-2 px-3.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              End
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
