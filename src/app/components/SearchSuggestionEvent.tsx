'use client';

import { Calendar } from "lucide-react";
import Image from "next/image";
import { Tables } from "@/types/supabase";
import Tag from "./ui/Tag";

type EventType = Tables<"event">;

type SearchSuggestionEventProps = {
  event: EventType;
  onClick: () => void;
};

export default function SearchSuggestionEvent({
  event,
  onClick,
}: SearchSuggestionEventProps) {
  const firstImage = event.image_URLs?.[0];

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ease-out-2"
    >
      {/* Image/Icon on left */}
      <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        {firstImage ? (
          <Image
            src={firstImage}
            alt={event.name}
            width={100}
            height={100}
            className="w-full h-full object-cover blur-[0.5px]"
          />
        ) : (
          <Calendar className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate mb-1">
          {event.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="button-depth inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-highlight border-highlight-hover text-white">
            Event
          </span>
          {event.description && (
            <p className="text-xs text-gray-500 line-clamp-1 flex-1">
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* Arrow */}
      <span className="text-gray-400 text-sm flex-shrink-0">→</span>
    </div>
  );
}
