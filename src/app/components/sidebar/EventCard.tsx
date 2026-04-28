'use client'
import { Calendar, ArrowLeft, Navigation } from "lucide-react";
import { useMapContext } from "@/context/MapContext";
import { useNavigation } from "@/context/NavigationContext";
import { useSidebar } from "@/context/SidebarContext";
import { useState, useEffect } from "react";

type EventCardProps = {
  className?: string;
};

export default function EventCard({ className = "" }: EventCardProps) {
  const { selectedEvent } = useMapContext();
  const { startDirectionsTo, loading } = useNavigation();
  const { setView, setIsOpen } = useSidebar();
  const [startTimeText, setStartTimeText] = useState('');
  const [endTimeText, setEndTimeText] = useState('');
  const [variant, setVariant] = useState<'live' | 'upcoming' | 'past'>('upcoming');

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
        return `in ${diffMinutes} ${diffMinutes === 1 ? 'min' : 'mins'}`;
      } else if (diffHours < 24) {
        return `in ${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'}`;
      } else if (diffDays < 7) {
        return `in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      } else {
        return eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }

    // Past events (negative time)
    const absDiffMinutes = Math.abs(diffMinutes);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);

    if (absDiffMinutes < 60) {
      return `${absDiffMinutes} ${absDiffMinutes === 1 ? 'min' : 'mins'} ago`;
    } else if (absDiffHours < 24) {
      return `${absDiffHours} ${absDiffHours === 1 ? 'hr' : 'hrs'} ago`;
    } else if (absDiffDays < 7) {
      return `${absDiffDays} ${absDiffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  useEffect(() => {
    if (!selectedEvent) return;

    // Determine variant based on event timing
    const now = new Date();
    const startDate = new Date(selectedEvent.dateStart);
    const endDate = selectedEvent.dateEnd ? new Date(selectedEvent.dateEnd) : null;

    if (now >= startDate && (!endDate || now <= endDate)) {
      setVariant('live');
    } else if (now < startDate) {
      setVariant('upcoming');
    } else {
      setVariant('past');
    }

    // Initial update
    if (selectedEvent.dateStart) {
      setStartTimeText(getRelativeTime(selectedEvent.dateStart));
    }
    if (selectedEvent.dateEnd) {
      setEndTimeText(getRelativeTime(selectedEvent.dateEnd));
    }

    // Update every minute
    const interval = setInterval(() => {
      const now = new Date();
      const startDate = new Date(selectedEvent.dateStart);
      const endDate = selectedEvent.dateEnd ? new Date(selectedEvent.dateEnd) : null;

      if (now >= startDate && (!endDate || now <= endDate)) {
        setVariant('live');
      } else if (now < startDate) {
        setVariant('upcoming');
      } else {
        setVariant('past');
      }

      if (selectedEvent.dateStart) {
        setStartTimeText(getRelativeTime(selectedEvent.dateStart));
      }
      if (selectedEvent.dateEnd) {
        setEndTimeText(getRelativeTime(selectedEvent.dateEnd));
      }
    }, 60000); // 60000ms = 1 minute

    return () => clearInterval(interval);
  }, [selectedEvent]);

  if (!selectedEvent) {
    return null;
  }

  // Variant styling configurations
  const variantConfig = {
    live: {
      tag: { text: 'Live', bgColor: 'bg-red-500' },
      gradient: 'from-red-400 to-red-600',
      saturation: 'saturate-100',
      showDot: true
    },
    upcoming: {
      tag: { text: 'Upcoming', bgColor: 'bg-blue-500' },
      gradient: 'from-blue-400 to-blue-600',
      saturation: 'saturate-100',
      showDot: false
    },
    past: {
      tag: { text: 'Past', bgColor: 'bg-gray-500' },
      gradient: 'from-gray-400 to-gray-600',
      saturation: 'saturate-0',
      showDot: false
    }
  };

  const config = variantConfig[variant];

  return (
    <div className={`event-card ${className} ${config.saturation}`}>
      {/* Back Button */}
      <button
        onClick={() => setView("eventList")}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-100 transition-colors duration-150 cursor-pointer mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </button>

      {/* Heading */}
      <div className="mb-3">
        <div className="flex items-center justify-start gap-2 mb-2">
          {config.showDot && (
            <span className="inline-block aspect-square w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          )}
          <h2 className="text-xl font-semibold">{selectedEvent.name}</h2>
          <span className={`button-depth ml-auto text-xs font-medium text-white ${config.tag.bgColor} px-2 py-1 rounded whitespace-nowrap`}>
            {config.tag.text}
          </span>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            startDirectionsTo({
              id: selectedEvent.id,
              kind: "event",
              name: selectedEvent.name,
              coordinates: [selectedEvent.longitude, selectedEvent.latitude],
            });
          }}
          disabled={loading}
          className="button-depth mt-2 w-full bg-highlight text-white py-2.5 rounded-xl border border-highlight-hover hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Navigation className="w-4 h-4" />
          {loading ? "Finding route..." : "Directions"}
        </button>
      </div>

      {/* Icon placeholder (similar to building fallback) */}
      <div
        key={selectedEvent.id}
        className={`relative w-full h-48 bg-gradient-to-br ${config.gradient} flex items-center justify-center rounded-lg mb-3 animate-image-intro`}
      >
        <Calendar className="w-16 h-16 text-white" />
      </div>

      {/* Conditional Info */}
      <div>
        {selectedEvent.description && (
          <p className="text-gray-600 dark:text-neutral-300 text-sm mb-3">{selectedEvent.description}</p>
        )}

        <div className="flex gap-4 mb-3">
          {selectedEvent.dateStart && (
            <div className="flex-1">
              <div className="font-semibold text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Start Date</div>
              <div className="text-gray-800 dark:text-neutral-100 text-base font-medium">{startTimeText}</div>
            </div>
          )}

          {selectedEvent.dateEnd && (
            <div className="flex-1">
              <div className="font-semibold text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-1">End Date</div>
              <div className="text-gray-800 dark:text-neutral-100 text-base font-medium">{endTimeText}</div>
            </div>
          )}
        </div>

        {selectedEvent.metaTags && selectedEvent.metaTags.length > 0 && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Tags</div>
            <div className="flex flex-wrap gap-1">
              {selectedEvent.metaTags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-neutral-300 text-xs px-2 py-1 rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
