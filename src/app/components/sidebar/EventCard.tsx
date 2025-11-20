'use client'
import { Calendar } from "lucide-react";
import { useMapContext } from "@/context/MapContext";
import Tag from "../ui/Tag";

type EventCardProps = {
  className?: string;
};

export default function EventCard({ className = "" }: EventCardProps) {
  const { selectedEvent } = useMapContext();

  if (!selectedEvent) {
    return null;
  }

  // Format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`event-card ${className}`}>
      {/* Heading */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold">{selectedEvent.name}</h2>
          <Tag variant="event" />
        </div>
      </div>

      {/* Icon placeholder (similar to building fallback) */}
      <div
        key={selectedEvent.id}
        className="relative w-full h-48 bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center rounded-lg mb-3 "
      >
        <Calendar className="w-16 h-16 text-white" />
      </div>

      {/* Conditional Info */}
      <div>
        {selectedEvent.description && (
          <p className="text-gray-600 text-sm mb-3">{selectedEvent.description}</p>
        )}

        {selectedEvent.dateStart && (
          <div className="mb-3">
            <div className="font-medium text-sm mb-1">Start Date</div>
            <div className="text-gray-700 text-sm">{formatDate(selectedEvent.dateStart)}</div>
          </div>
        )}

        {selectedEvent.dateEnd && (
          <div className="mb-3">
            <div className="font-medium text-sm mb-1">End Date</div>
            <div className="text-gray-700 text-sm">{formatDate(selectedEvent.dateEnd)}</div>
          </div>
        )}

        {selectedEvent.datePosted && (
          <div className="mb-2">
            <span className="font-medium text-sm">Posted: </span>
            <span className="text-gray-700 text-sm">{formatDate(selectedEvent.datePosted)}</span>
          </div>
        )}

        {selectedEvent.metaTags && selectedEvent.metaTags.length > 0 && (
          <div className="mb-2">
            <div className="font-medium text-sm mb-1">Tags</div>
            <div className="flex flex-wrap gap-1">
              {selectedEvent.metaTags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
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
