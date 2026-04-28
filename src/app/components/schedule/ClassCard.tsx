"use client";

import { MapPin, Clock, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import { useMapContext } from "@/context/MapContext";
import { MatchResult } from "@/types/schedule";
import { Tables } from "@/types/supabase";
import { getCenterFromPolygon } from "@/utils/pathfinding/geoUtils";

type BuildingPolygon = Tables<"building_polygons">;

interface ClassCardProps {
  result: MatchResult;
  index: number;
  buildingPolygons: BuildingPolygon[];
}

export default function ClassCard({ result, index, buildingPolygons }: ClassCardProps) {
  const { flyTo, highlightRouteStop } = useMapContext();
  const { parsedClass, match } = result;

  const getConfidenceColor = () => {
    if (!match) return "bg-red-500";
    if (match.confidence >= 90) return "bg-green-500";
    if (match.confidence >= 70) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const getConfidenceIcon = () => {
    if (!match) return <AlertCircle className="w-3.5 h-3.5" />;
    if (match.confidence >= 90) return <CheckCircle className="w-3.5 h-3.5" />;
    return <HelpCircle className="w-3.5 h-3.5" />;
  };

  const handleClick = () => {
    if (match) {
      // Find building polygon to get coordinates
      const polygon = buildingPolygons.find(
        (bp) => bp.building_id === match.building.id
      );
      if (polygon?.geojson) {
        try {
          const [lng, lat] = getCenterFromPolygon(polygon.geojson);
          flyTo(lng, lat, 17);
          highlightRouteStop(index - 1);
        } catch {
          console.warn("Could not get building coordinates");
        }
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`rounded-xl border transition-all duration-150 ease-out-2 overflow-hidden
        ${match
          ? "cursor-pointer bg-white dark:bg-[#2d2f2f] border-neutral-200 dark:border-white/10 hover:border-highlight dark:hover:border-highlight/50 hover:shadow-md dark:hover:shadow-black/20"
          : "opacity-60 bg-neutral-50 dark:bg-white/5 border-neutral-200 dark:border-white/10"
        }`}
    >
      <div className="flex items-stretch">
        {/* Left accent strip with number */}
        <div className={`w-10 flex-shrink-0 flex items-center justify-center ${match ? "bg-highlight/10 dark:bg-highlight/15" : "bg-neutral-100 dark:bg-white/5"}`}>
          <span className={`text-sm font-bold ${match ? "text-highlight" : "text-neutral-400"}`}>{index}</span>
        </div>

        {/* Class Info */}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">
              {parsedClass.courseCode || parsedClass.courseName || `Class ${index}`}
            </div>
            {/* Confidence badge */}
            <div
              className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-white ${getConfidenceColor()}`}
              title={match ? `${match.confidence}% confidence` : "No match found"}
            >
              {getConfidenceIcon()}
            </div>
          </div>

          {(parsedClass.startTime || parsedClass.endTime) && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>{parsedClass.startTime}{parsedClass.endTime && ` – ${parsedClass.endTime}`}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs mt-1">
            <MapPin className="w-3 h-3 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
            {match ? (
              <span className="text-neutral-600 dark:text-neutral-300 truncate">
                {match.building.name}
                {parsedClass.roomRaw && <span className="text-neutral-400 dark:text-neutral-500"> · {parsedClass.roomRaw}</span>}
              </span>
            ) : (
              <span className="text-neutral-400 italic truncate">{parsedClass.buildingRaw || "Unknown location"}</span>
            )}
          </div>
        </div>
      </div>

      {match && match.confidence < 70 && result.suggestions.length > 0 && (
        <div className="px-3 py-2 border-t border-neutral-100 dark:border-white/5 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-white/5">
          Did you mean:{" "}
          {result.suggestions.slice(0, 2).map((s, i) => (
            <span key={s.building.id}>
              {i > 0 && ", "}
              <span className="text-highlight font-medium">{s.building.name}</span>
            </span>
          ))}?
        </div>
      )}
    </div>
  );
}
