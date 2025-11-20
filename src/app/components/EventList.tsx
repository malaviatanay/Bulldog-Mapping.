import EventCardMin from "./EventCardMin";
import { Tables } from "@/types/supabase";
import { useMapContext } from "@/context/MapContext";
import { useSidebar } from "@/context/SidebarContext";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { approveEventAction, deleteEventAction } from "@/app/actions/eventActions";
import { useRouter } from "next/navigation";

type Event = Tables<"event">;

type EventListProps = {
  className?: string;
  user: User | null;
  isAdmin: boolean;
};

export default function EventList({
  className = "",
  user,
  isAdmin,
}: EventListProps) {
  const { events, setSelectedEvent, flyTo } = useMapContext();
  const { setView, setIsOpen } = useSidebar();
  const indexRef = useRef(0);
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setView("event");
    setIsOpen(true);
    flyTo(event.longitude, event.latitude, 17);
  };

  const handleApprove = async (eventId: string) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      await approveEventAction(eventId);
      router.refresh();
    } catch (error) {
      console.error("Failed to approve event:", error);
      alert("Failed to approve event. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (isProcessing) return;

    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      setIsProcessing(true);
      await deleteEventAction(eventId);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Failed to delete event. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter events by time and approval status
  const now = new Date();

  const unapprovedEvents = isAdmin
    ? events.filter((event: Event) => !event.isApproved)
    : [];

  const approvedEvents = events.filter((event: Event) => event.isApproved);

  const liveEvents = approvedEvents.filter((event: Event) => {
    const startDate = new Date(event.dateStart);
    const endDate = event.dateEnd ? new Date(event.dateEnd) : null;
    // Live: current time is after start and before end (or no end date)
    return now >= startDate && (!endDate || now <= endDate);
  });

  const upcomingEvents = approvedEvents.filter((event: Event) => {
    const startDate = new Date(event.dateStart);
    // Upcoming: hasn't started yet
    return now < startDate;
  });

  const pastEvents = approvedEvents.filter((event: Event) => {
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
        {user ? (
          <button
            onClick={() => setView("eventCreator")}
            className="button-depth group p-2 rounded-lg border border-transparent hover:border-highlight-hover hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Create new event"
          >
            <Plus className="w-5 h-5 group-hover:text-white transition-colors duration-150 ease-out-2" />
          </button>
        ) : (
          <Link
            href="/login"
            className="button-depth group p-2 rounded-lg border border-transparent hover:border-highlight-hover hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Login to create event"
          >
            <Plus className="w-5 h-5 group-hover:text-white transition-colors duration-150 ease-out-2" />
          </Link>
        )}
      </div>

      {/* Awaiting Approval Section - Admin Only */}
      {isAdmin && unapprovedEvents.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2 fade-in-heading">
            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            <span className="font-semibold text-sm text-yellow-600">
              Awaiting Approval
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {unapprovedEvents.map((event: Event) => {
              const currentIndex = indexRef.current++;
              const now = new Date();
              const startDate = new Date(event.dateStart);
              const endDate = event.dateEnd ? new Date(event.dateEnd) : null;

              // Determine variant for unapproved events
              let variant: "live" | "upcoming" | "past" = "upcoming";
              if (now >= startDate && (!endDate || now <= endDate)) {
                variant = "live";
              } else if (endDate && now > endDate) {
                variant = "past";
              }

              return (
                <li
                  key={event.id}
                  className="stagger-item"
                  style={{ "--index": currentIndex } as React.CSSProperties}
                >
                  <EventCardMin
                    dateEnd={event.dateEnd}
                    isApproved={event.isApproved}
                    name={event.name}
                    buildingIDs={event.buildingIDs}
                    dateStart={event.dateStart}
                    description={event.description}
                    variant={variant}
                    onClick={() => handleEventClick(event)}
                    isAdmin={isAdmin}
                    eventId={event.id}
                    onApprove={handleApprove}
                    onDelete={handleDelete}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Live Events Section */}
      {liveEvents.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2 fade-in-heading">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="font-semibold text-sm text-red-600">
              Live Events
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {liveEvents.map((event: Event) => {
              const currentIndex = indexRef.current++;
              return (
                <li
                  key={event.id}
                  className="stagger-item"
                  style={{ "--index": currentIndex } as React.CSSProperties}
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
            <span className="font-semibold text-sm text-blue-600">
              Upcoming Events
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {upcomingEvents.map((event: Event) => {
              const currentIndex = indexRef.current++;
              return (
                <li
                  key={event.id}
                  className="stagger-item"
                  style={{ "--index": currentIndex } as React.CSSProperties}
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
            <span className="font-semibold text-sm text-gray-600">
              Past Events
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {pastEvents.map((event: Event) => {
              const currentIndex = indexRef.current++;
              return (
                <li
                  key={event.id}
                  className="stagger-item"
                  style={{ "--index": currentIndex } as React.CSSProperties}
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
