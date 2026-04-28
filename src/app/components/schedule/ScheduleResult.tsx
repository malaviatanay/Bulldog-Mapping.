"use client";

import { useState } from "react";
import { ArrowLeft, MapPin, Clock, Route, Eye, EyeOff, AlertTriangle, X, Save, Check, Play } from "lucide-react";
import { useMapContext } from "@/context/MapContext";
import { useNavigation } from "@/context/NavigationContext";
import { useSidebar } from "@/context/SidebarContext";
import { MatchResult } from "@/types/schedule";
import { formatDistance, formatWalkTime } from "@/utils/pathfinding/geoUtils";
import { saveRoute } from "@/app/actions/savedRouteActions";
import { DayOfWeek, DAYS_OF_WEEK, DAY_LABELS } from "@/types/savedRoute";
import { User } from "@supabase/supabase-js";
import ClassCard from "./ClassCard";

interface ScheduleResultProps {
  results: MatchResult[];
  onBack: () => void;
  onNewSchedule: () => void;
  user: User | null;
  buildingNames: string[];
  parkingLotName: string | null;
  classStartTimes?: string[];
  classEndTimes?: string[];
}

export default function ScheduleResult({ results, onBack, onNewSchedule, user, buildingNames, parkingLotName, classStartTimes, classEndTimes }: ScheduleResultProps) {
  const { scheduleRoute, toggleRouteVisibility, clearScheduleRoute, flyTo, buildingPolygons } = useMapContext();
  const { startMultiStopNavigation, startNavigation, loading: navLoading } = useNavigation();
  const { setIsOpen } = useSidebar();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const { route, isVisible } = scheduleRoute;

  // Sort results by class time
  const sortedResults = [...results].sort((a, b) => {
    const timeA = a.parsedClass.startTime || "";
    const timeB = b.parsedClass.startTime || "";
    return timeA.localeCompare(timeB);
  });

  const matchedCount = results.filter((r) => r.match !== null).length;
  const unmatchedCount = results.length - matchedCount;

  const remainingStops = route ? route.stops.filter((s) => !s.isUserLocation) : [];
  const allClassesDone = route !== null && remainingStops.length === 0 &&
    results.some((r) => r.parsedClass.startTime || r.parsedClass.endTime);

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    // Reset save status when changing selection
    if (saveStatus === "saved") setSaveStatus("idle");
  };

  const handleSaveRoute = async () => {
    if (!user || buildingNames.length === 0 || selectedDays.length === 0) return;
    setIsSaving(true);
    try {
      await Promise.all(
        selectedDays.map((day) => saveRoute(buildingNames, parkingLotName, day, classStartTimes, classEndTimes))
      );
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to save route:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowOnMap = () => {
    if (route && route.stops.length > 0) {
      const firstStop = route.stops[0];
      flyTo(firstStop.coordinates[0], firstStop.coordinates[1], 16);
    }
  };

  const handleStartNavigation = async () => {
    if (!route) return;
    const classStops = route.stops
      .filter((s) => !s.isUserLocation)
      .map((s) => ({
        id: s.building.id,
        name: s.building.name,
        coordinates: s.coordinates,
      }));
    if (classStops.length === 0) return;
    // Use the first stop in the route as origin if there's no user-location stop;
    // otherwise route from current location through all class stops in order.
    const fromUser = route.stops.some((s) => s.isUserLocation);
    setIsOpen(false);
    await startMultiStopNavigation(classStops, fromUser);
    startNavigation();
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="button-depth group p-2 rounded-lg border border-transparent hover:border-highlight-hover hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 group-hover:text-white transition-colors duration-150 ease-out-2" />
        </button>
        <h2 className="text-xl font-semibold">Your Schedule</h2>
      </div>

      {/* Summary Stats */}
      <div className="mb-4 flex gap-2">
        <div className="flex-1 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800/40 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
            {matchedCount} class{matchedCount !== 1 ? "es" : ""} found
          </span>
        </div>
        {unmatchedCount > 0 && (
          <div className="flex-1 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl border border-yellow-200 dark:border-yellow-800/40 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
              {unmatchedCount} unmatched
            </span>
          </div>
        )}
      </div>

      {/* All classes done banner */}
      {allClassesDone && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 rounded-xl text-center">
          <p className="text-green-700 dark:text-green-300 font-semibold text-sm">All classes done for today!</p>
          <p className="text-green-600 dark:text-green-500 text-xs mt-0.5">You're all caught up.</p>
        </div>
      )}

      {/* Route Summary */}
      {route && route.stops.length > 1 && (
        <div className="mb-4 rounded-xl border border-highlight/30 dark:border-highlight/20 overflow-hidden">
          <div className="px-3 py-2.5 bg-highlight/10 dark:bg-highlight/15 flex items-center justify-between">
            <div className="flex items-center gap-2 text-highlight font-semibold text-sm">
              <Route className="w-4 h-4" />
              <span>Walking Route</span>
            </div>
            <button
              onClick={toggleRouteVisibility}
              className="p-1.5 rounded-lg hover:bg-highlight/20 transition-colors"
              title={isVisible ? "Hide route" : "Show route"}
            >
              {isVisible ? (
                <Eye className="w-4 h-4 text-highlight" />
              ) : (
                <EyeOff className="w-4 h-4 text-neutral-400" />
              )}
            </button>
          </div>
          <div className="px-3 py-2.5 bg-white dark:bg-[#2d2f2f] grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{formatDistance(route.totalDistance)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-neutral-700 dark:text-neutral-200">~{formatWalkTime(route.totalWalkTime)}</span>
            </div>
          </div>
          <div className="px-3 pb-3 bg-white dark:bg-[#2d2f2f] flex gap-2">
            <button
              onClick={handleShowOnMap}
              className="flex-1 py-2.5 border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 text-sm font-medium rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
            >
              Show on Map
            </button>
            <button
              onClick={handleStartNavigation}
              disabled={navLoading}
              className="button-depth flex-[1.4] py-2.5 bg-highlight text-white text-sm font-semibold rounded-xl border border-highlight-hover hover:bg-highlight-hover transition-[transform_background-color] duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-white" />
              {navLoading ? "Starting…" : "Start"}
            </button>
          </div>
        </div>
      )}

      {/* Class List */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="space-y-2">
          {sortedResults.map((result, index) => (
            <ClassCard
              key={result.parsedClass.id}
              result={result}
              index={index + 1}
              buildingPolygons={buildingPolygons}
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col gap-2">
        {/* Save Route with Day Picker */}
        {user && (
          <div className="p-3 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2.5">Save for which days?</p>
            <div className="flex gap-1.5 mb-3">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedDays.includes(day)
                      ? "bg-highlight text-white shadow-sm"
                      : "bg-white dark:bg-[#2d2f2f] border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:border-highlight hover:text-highlight"
                  }`}
                >
                  {DAY_LABELS[day].short}
                </button>
              ))}
            </div>
            <button
              onClick={handleSaveRoute}
              disabled={isSaving || buildingNames.length === 0 || selectedDays.length === 0}
              className={`button-depth w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                saveStatus === "saved"
                  ? "bg-green-600 text-white"
                  : "bg-highlight text-white hover:bg-highlight-hover"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {saveStatus === "saved" ? (
                <><Check className="w-4 h-4" /> Route Saved!</>
              ) : isSaving ? (
                <><Save className="w-4 h-4 animate-pulse" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" />
                  {selectedDays.length === 0 ? "Select days to save" : `Save for ${selectedDays.map((d) => DAY_LABELS[d].short).join(", ")}`}
                </>
              )}
            </button>
          </div>
        )}
        <button
          onClick={() => { clearScheduleRoute(); onBack(); }}
          className="w-full py-2.5 border border-red-200 dark:border-red-800/50 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Clear Route
        </button>
        <button
          onClick={onNewSchedule}
          className="w-full py-2.5 border border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-400 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-sm font-medium"
        >
          New Schedule
        </button>
      </div>
    </div>
  );
}
