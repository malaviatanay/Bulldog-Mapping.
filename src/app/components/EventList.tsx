import EventCardMin from "./EventCardMin";
import { Tables } from "@/types/supabase";
import { useMapContext } from "@/context/MapContext";
import { useSidebar } from "@/context/SidebarContext";
import { Plus } from "lucide-react";
import { useRef } from "react";

type Event = Tables<"event">;

export default function EventList({ className = "" }) {
  const { events, setSelectedEvent, flyTo } = useMapContext();
  const { setView, setIsOpen } = useSidebar();
  const indexRef = useRef(0);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setView("event");
    setIsOpen(true);
    flyTo(event.longitude, event.latitude, 17);
  };

  // Filter events by time
  const now = new Date();

  const liveEvents = events.filter((event: Event) => {
    const startDate = new Date(event.dateStart);
    const endDate = event.dateEnd ? new Date(event.dateEnd) : null;
    // Live: current time is after start and before end (or no end date)
    return now >= startDate && (!endDate || now <= endDate);
  });

  const upcomingEvents = events.filter((event: Event) => {
    const startDate = new Date(event.dateStart);
    // Upcoming: hasn't started yet
    return now < startDate;
  });

  const pastEvents = events.filter((event: Event) => {
    const endDate = event.dateEnd ? new Date(event.dateEnd) : null;
    // Past: has end date and current time is past the end date
    if (endDate) {
      return now > endDate;
    }
    // If no end date, it's either live or upcoming, not past
    return false;
  });

  // Reset index ref before rendering
  indexRef.current = 0;

  return (
    <div className={`event-list ${className}`}>
      {/* Main Heading */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Events</h2>
        <button
          onClick={() => setView("eventCreator")}
          className="button-depth group p-2 rounded-lg border border-transparent hover:border-highlight-hover hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Create new event"
        >
          <Plus className="w-5 h-5 group-hover:text-white transition-colors duration-150 ease-out-2" />
        </button>
      </div>

      {/* Live Events Section */}
      {liveEvents.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2 fade-in-heading">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="font-semibold text-sm text-red-600">Live Events</span>
          </div>
          <ul className="flex flex-col gap-2">
            {liveEvents.map((event: Event) => {
              const currentIndex = indexRef.current++;
              return (
                <li
                  key={event.id}
                  className="stagger-item"
                  style={{ '--index': currentIndex } as React.CSSProperties}
                >
                  <EventCardMin
                    dateEnd={event.dateEnd}
                    isApproved={event.isApproved}
                    name={event.name}
                    buildingIDs={event.buildingIDs}
                    dateStart={event.dateStart}
                    description={event.description}
                    variant="live"
                    onClick={() => handleEventClick(event)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Upcoming Section */}
      {upcomingEvents.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2 fade-in-heading">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="font-semibold text-sm text-blue-600">Upcoming Events</span>
          </div>
          <ul className="flex flex-col gap-2">
            {upcomingEvents.map((event: Event) => {
              const currentIndex = indexRef.current++;
              return (
                <li
                  key={event.id}
                  className="stagger-item"
                  style={{ '--index': currentIndex } as React.CSSProperties}
                >
                  <EventCardMin
                    dateEnd={event.dateEnd}
                    isApproved={event.isApproved}
                    name={event.name}
                    buildingIDs={event.buildingIDs}
                    dateStart={event.dateStart}
                    description={event.description}
                    variant="upcoming"
                    onClick={() => handleEventClick(event)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2 fade-in-heading">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
            <span className="font-semibold text-sm text-gray-600">Past Events</span>
          </div>
          <ul className="flex flex-col gap-2">
            {pastEvents.map((event: Event) => {
              const currentIndex = indexRef.current++;
              return (
                <li
                  key={event.id}
                  className="stagger-item"
                  style={{ '--index': currentIndex } as React.CSSProperties}
                >
                  <EventCardMin
                    dateEnd={event.dateEnd}
                    isApproved={event.isApproved}
                    name={event.name}
                    buildingIDs={event.buildingIDs}
                    dateStart={event.dateStart}
                    description={event.description}
                    variant="past"
                    onClick={() => handleEventClick(event)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
