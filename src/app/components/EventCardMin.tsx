"use client";

import React, { useState, useEffect } from "react";
import { Check, Clock, Trash } from "lucide-react";

type EventCardMinVariant = "live" | "upcoming" | "past";

type EventCardMinProps = {
  name: string;
  buildingIDs?: string[];
  dateStart: string;
  dateEnd?: string | null;
  isApproved?: boolean;
  description?: string | null;
  onClick?: () => void;
  variant?: EventCardMinVariant;
  isAdmin?: boolean;
  eventId?: string;
  onApprove?: (eventId: string) => void;
  onDelete?: (eventId: string) => void;
};

const EventCardMin: React.FC<EventCardMinProps> = ({
  name,
  buildingIDs,
  dateStart,
  description,
  onClick,
  variant = "upcoming",
  isAdmin = false,
  isApproved = true,
  eventId,
  onApprove,
  onDelete,
}) => {
  const [timeText, setTimeText] = useState("");

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const eventDate = new Date(dateString);
    const diffMs = eventDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Future events (upcoming)
    if (diffMs > 0) {
      if (diffMinutes < 60) {
        return `in ${diffMinutes} ${diffMinutes === 1 ? "min" : "mins"}`;
      } else if (diffHours < 24) {
        return `in ${diffHours} ${diffHours === 1 ? "hr" : "hrs"}`;
      } else if (diffDays < 7) {
        return `in ${diffDays} ${diffDays === 1 ? "day" : "days"}`;
      } else {
        return eventDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    }

    // Past events (negative time)
    const absDiffMinutes = Math.abs(diffMinutes);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);

    if (absDiffMinutes < 60) {
      return `${absDiffMinutes} ${absDiffMinutes === 1 ? "min" : "mins"} ago`;
    } else if (absDiffHours < 24) {
      return `${absDiffHours} ${absDiffHours === 1 ? "hr" : "hrs"} ago`;
    } else if (absDiffDays < 7) {
      return `${absDiffDays} ${absDiffDays === 1 ? "day" : "days"} ago`;
    } else {
      return eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  useEffect(() => {
    // Initial update
    setTimeText(getRelativeTime(dateStart));

    // Update every minute
    const interval = setInterval(() => {
      setTimeText(getRelativeTime(dateStart));
    }, 60000); // 60000ms = 1 minute

    return () => clearInterval(interval);
  }, [dateStart]);

  // Variant styling configurations
  const variantConfig = {
    live: {
      tag: { text: "Live", bgColor: "bg-red-500" },
      hoverBorder: "hover:border-red-400",
      saturation: "saturate-100",
    },
    upcoming: {
      tag: { text: "Upcoming", bgColor: "bg-blue-500" },
      hoverBorder: "hover:border-blue-400",
      saturation: "saturate-100",
    },
    past: {
      tag: { text: "Past", bgColor: "bg-gray-500" },
      hoverBorder: "hover:border-gray-400",
      saturation: "saturate-0",
    },
  };

  const config = variantConfig[variant];

  // Only allow onClick if event is approved OR if not admin
  const handleCardClick = !isApproved && isAdmin ? undefined : onClick;

  return (
    <div
      onClick={handleCardClick}
      className={`flex w-full overflow-clip justify-between p-3 bg-white dark:bg-[#2d2f2f] rounded-lg border border-neutral-200 dark:border-white/10 ${
        config.hoverBorder
      } ${
        handleCardClick ? "hover:scale-[1.02] cursor-pointer" : "cursor-default"
      } transition-[transform_border-color_box-shadow] duration-150 ease-out-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_3px_8px_rgba(0,0,0,0.5)] ${
        config.saturation
      }`}
    >
      <div className="w-full flex-shrink">
        <div className="flex items-center mb-1">
          {variant === "live" && (
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
          )}
          <p className="text-sm font-semibold text-gray-800 dark:text-white">{name}</p>
        </div>
        {description && (
          <p className="text-xs text-gray-600 dark:text-neutral-300 mb-1 line-clamp-1">
            {description}
          </p>
        )}
        {buildingIDs && buildingIDs.length > 0 && (
          <div className="flex items-center text-xs text-gray-500 dark:text-neutral-400 mb-1">
            <span className="mr-1">📍</span>
            <span>Building {buildingIDs[0]}</span>
          </div>
        )}
        <div className="flex items-center text-xs text-gray-500 dark:text-neutral-400">
          <span className="mr-1 inline-grid place-content-center">
            <Clock size={12}></Clock>
          </span>
          <span>{timeText}</span>
        </div>
      </div>
      <div className="w-fit flex flex-col justify-between items-end ml-2">
        <span
          className={`button-depth text-xs font-medium text-white ${config.tag.bgColor} px-2 py-1 rounded whitespace-nowrap`}
        >
          {config.tag.text}
        </span>
        {isAdmin && !isApproved && eventId && (
          <div className="flex gap-1.5 justify-end mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.(eventId);
              }}
              className="button-depth group p-1.5 rounded-lg bg-green-500 border border-green-600 text-white shadow-sm hover:bg-green-600 hover:border-green-700 transition-[transform_background-color_border-color] duration-150 ease-out-2 hover:scale-105 active:scale-95 cursor-pointer"
              title="Approve event"
            >
              <Check className="w-4 h-4" strokeWidth={3.5} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(eventId);
              }}
              className="button-depth group p-1.5 rounded-lg bg-red-500 border border-red-600 text-white shadow-sm hover:bg-red-600 hover:border-red-700 transition-[transform_background-color_border-color] duration-150 ease-out-2 hover:scale-105 active:scale-95 cursor-pointer"
              title="Delete event"
            >
              <Trash className="w-4 h-4" strokeWidth={2.75} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCardMin;
