"use client";

import { Tables } from "@/types/supabase";
import { useState, useEffect } from "react";

type Event = Tables<"event">;

// Helper function to calculate time until start
export function getTimeUntilStart(dateStart: string | Date) {
  const now = new Date();
  const start = new Date(dateStart);
  const diffMs = start.getTime() - now.getTime();

  // Event has already started or passed
  if (diffMs < 0) {
    return { text: "Started", color: "text-gray-500", urgent: false };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Less than 1 hour - show minutes (URGENT)
  if (diffHours < 1) {
    return {
      text: `${diffMinutes} min`,
      color: "text-red-600",
      urgent: true,
    };
  }

  // Less than 24 hours - show hours (SOON)
  if (diffDays < 1) {
    return {
      text: `${diffHours} hours`,
      color: "text-orange-600",
      urgent: true,
    };
  }

  // Less than 7 days - show days
  if (diffDays < 7) {
    return {
      text: `${diffDays} days`,
      color: "text-blue-600",
      urgent: false,
    };
  }

  // More than 7 days - show weeks
  const diffWeeks = Math.floor(diffDays / 7);
  return {
    text: `${diffWeeks} week${diffWeeks > 1 ? "s" : ""}`,
    color: "text-gray-600",
    urgent: false,
  };
}

interface EventMarkerProps {
  event: Event;
  onClick: () => void;
  isSimple: boolean;
}

export default function EventMarker({
  event,
  onClick,
  isSimple,
}: EventMarkerProps) {
  const [timeUntil, setTimeUntil] = useState(() =>
    event.dateStart ? getTimeUntilStart(event.dateStart) : null
  );
  const [variant, setVariant] = useState<"live" | "upcoming" | "past">(
    "upcoming"
  );

  useEffect(() => {
    if (!event.dateStart) return;

    // Determine variant based on event timing
    const updateVariant = () => {
      const now = new Date();
      const startDate = new Date(event.dateStart);
      const endDate = event.dateEnd ? new Date(event.dateEnd) : null;

      if (now >= startDate && (!endDate || now <= endDate)) {
        setVariant("live");
      } else if (now < startDate) {
        setVariant("upcoming");
      } else {
        setVariant("past");
      }
    };

    updateVariant();

    // Update every minute
    const interval = setInterval(() => {
      setTimeUntil(getTimeUntilStart(event.dateStart));
      updateVariant();
    }, 60000); // 60000ms = 1 minute

    return () => clearInterval(interval);
  }, [event.dateStart, event.dateEnd]);

  // Variant styling configurations
  const variantConfig = {
    live: {
      bgColor: "bg-red-500",
      saturation: "saturate-100",
      ping: true,
    },
    upcoming: {
      bgColor: "bg-blue-500",
      saturation: "saturate-100",
      ping: false,
    },
    past: {
      bgColor: "bg-gray-500",
      saturation: "saturate-0",
      ping: false,
    },
  };

  const config = variantConfig[variant];

  // Simple dot marker for zoomed out view
  if (isSimple) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`group relative w-fit min-w-4 min-h-4 active:scale-97 border-1 border-neutral-100 rounded-md cursor-pointer flex justify-center items-center shadow-md h-fit transition-[transform] ease-out-3 duration-300 button-depth ${config.bgColor} ${config.saturation}`}
      >
        {config.ping && (
          <span className="absolute inline-flex h-full w-full rounded-md bg-red-400 opacity-75 animate-ping"></span>
        )}
        <div className="absolute top-0 left-0 w-4/3 h-3/2 -translate-1/7 z-0"></div>
        <span className="flex text-base font-medium opacity-0 group-hover:opacity-100 pointer-events-none group-hover:w-fit transition-[height_width_opacity_blur] blur-xs group-hover:blur-none ease-out-3 duration-300 text-nowrap p-1 group-hover:h-auto w-0 h-0 text-white overflow-hidden">
          <span>{event.name}</span>
        </span>
      </div>
    );
  }

  // Detailed marker for zoomed in view
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`bg-white w-[200px] border-1 overflow-clip border-neutral-100 hover:scale-105 active:scale-97 transition-transform ease-out-2 duration-150 rounded-xl shadow-md pointer-events-auto select-all relative z-40 cursor-pointer hover:shadow-xl ${config.saturation}`}
    >
      {/* Header with event name and countdown */}
      <div
        className={`px-3 py-2 rounded-t-lg ${config.bgColor} text-white relative`}
      >
        {config.ping && (
          <span className="!absolute button-depth inset-0 rounded-t-lg bg-red-500  opacity-75"></span>
        )}
        <div className="font-semibold text-sm truncate relative z-10">
          {event.name || "Event"}
        </div>
        {timeUntil && (
          <div className="text-xs opacity-90 mt-0.5 relative z-10">
            {timeUntil.text === "Started" ? "Ongoing" : `in ${timeUntil.text}`}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="px-3 py-2 space-y-1">
        {/* Date Start with time */}
        {event.dateStart && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Starts:</span>
            <span className={`${timeUntil?.color || "text-gray-700"} truncate`}>
              {new Date(event.dateStart).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Date Posted */}
        {event.datePosted && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Posted:</span>
            <span className="text-gray-400 truncate">
              {new Date(event.datePosted).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
            <p className="line-clamp-2">{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
