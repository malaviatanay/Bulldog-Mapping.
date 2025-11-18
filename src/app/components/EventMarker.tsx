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
    return { text: 'Started', color: 'text-gray-500', urgent: false };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Less than 1 hour - show minutes (URGENT)
  if (diffHours < 1) {
    return {
      text: `${diffMinutes} min`,
      color: 'text-red-600',
      urgent: true
    };
  }

  // Less than 24 hours - show hours (SOON)
  if (diffDays < 1) {
    return {
      text: `${diffHours} hours`,
      color: 'text-orange-600',
      urgent: true
    };
  }

  // Less than 7 days - show days
  if (diffDays < 7) {
    return {
      text: `${diffDays} days`,
      color: 'text-blue-600',
      urgent: false
    };
  }

  // More than 7 days - show weeks
  const diffWeeks = Math.floor(diffDays / 7);
  return {
    text: `${diffWeeks} week${diffWeeks > 1 ? 's' : ''}`,
    color: 'text-gray-600',
    urgent: false
  };
}

interface EventMarkerProps {
  event: Event;
  onClick: () => void;
  isSimple: boolean;
}

export default function EventMarker({ event, onClick, isSimple }: EventMarkerProps) {
  const [timeUntil, setTimeUntil] = useState(() =>
    event.dateStart ? getTimeUntilStart(event.dateStart) : null
  );

  useEffect(() => {
    if (!event.dateStart) return;

    // Update every minute
    const interval = setInterval(() => {
      setTimeUntil(getTimeUntilStart(event.dateStart));
    }, 60000); // 60000ms = 1 minute

    return () => clearInterval(interval);
  }, [event.dateStart]);

  // Simple dot marker for zoomed out view
  if (isSimple) {
    return (
      <div
        onClick={onClick}
        className={`w-4 h-4 rounded-full cursor-pointer shadow-md transition-transform hover:scale-125 ${
          timeUntil?.urgent ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
        }`}
        style={{
          border: '2px solid white',
        }}
      />
    );
  }

  // Detailed marker for zoomed in view
  return (
    <div
      onClick={onClick}
      className={`bg-white border-2 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow ${
        timeUntil?.urgent ? 'border-red-500' : 'border-blue-500'
      }`}
      style={{
        width: '200px', // Fixed width
        maxWidth: '200px',
      }}
    >
      {/* Header with event name and countdown */}
      <div className={`px-3 py-2 rounded-t-lg ${
        timeUntil?.urgent ? 'bg-red-500' : 'bg-blue-500'
      } text-white`}>
        <div className="font-semibold text-sm truncate">{event.name || 'Event'}</div>
        {timeUntil && (
          <div className="text-xs opacity-90 mt-0.5">
            {timeUntil.text === 'Started' ? '🔴 Started' : `⏱️ in ${timeUntil.text}`}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="px-3 py-2 space-y-1">
        {/* Date Start with time */}
        {event.dateStart && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Starts:</span>
            <span className={`${timeUntil?.color || 'text-gray-700'} truncate`}>
              {new Date(event.dateStart).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
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
