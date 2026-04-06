import EventCardMin from "./EventCardMin";
import { Tables } from "@/types/supabase";
import { useMapContext } from "@/context/MapContext";
import { useSidebar } from "@/context/SidebarContext";
import { Plus, List, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import {
  approveEventAction,
  deleteEventAction,
} from "@/app/actions/eventActions";
import { useRouter } from "next/navigation";

type Event = Tables<"event">;

type ViewMode = "list" | "calendar";

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
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [calendarDate, setCalendarDate] = useState(new Date());

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

  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pastEvents = approvedEvents.filter((event: Event) => {
    const endDate = event.dateEnd ? new Date(event.dateEnd) : null;
    // Past: has end date, current time is past the end date, and within the last 7 days
    if (endDate) {
      return now > endDate && endDate >= oneWeekAgo;
    }
    // If no end date, it's either live or upcoming, not past
    return false;
  });

  // Reset index ref before rendering
  indexRef.current = 0;

  // Calendar helper functions
  const eventColors = [
    "bg-blue-500/80",
    "bg-violet-500/80",
    "bg-teal-600/80",
    "bg-sky-500/80",
    "bg-indigo-500/80",
    "bg-cyan-600/80",
    "bg-slate-500/80",
  ];

  const getEventColor = (eventId: string) => {
    let hash = 0;
    for (let i = 0; i < eventId.length; i++) {
      hash = eventId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return eventColors[Math.abs(hash) % eventColors.length];
  };

  const getCalendarWeeks = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    // Pad to complete last week
    while (days.length % 7 !== 0) days.push(null);

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  };

  const getEventsForDay = (day: number) => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const dayStart = new Date(year, month, day);
    const dayEnd = new Date(year, month, day + 1);

    return approvedEvents.filter((event: Event) => {
      const eventStart = new Date(event.dateStart);
      const eventEnd = event.dateEnd ? new Date(event.dateEnd) : eventStart;
      return eventStart < dayEnd && eventEnd >= dayStart;
    });
  };

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCalendarDate(new Date());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      calendarDate.getMonth() === today.getMonth() &&
      calendarDate.getFullYear() === today.getFullYear()
    );
  };

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  return (
    <div className={`event-list ${className}`}>
      {/* Main Heading */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Events</h2>
        <div className="flex items-center gap-1">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-md transition-colors duration-150 cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-[#363838] shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-white"
              }`}
              aria-label="Calendar view"
              title="Calendar view"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors duration-150 cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-[#363838] shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-white"
              }`}
              aria-label="List view"
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
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
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="mb-3">
          {/* Month Title */}
          <h3 className="text-2xl font-bold mb-3">
            {calendarDate.toLocaleDateString("en-US", { month: "long" })}{" "}
            <span className="text-gray-400 dark:text-neutral-500">
              {calendarDate.getFullYear()}
            </span>
          </h3>

          {/* Month Navigation */}
          <div className="flex items-center justify-end gap-1 mb-3">
            <button
              onClick={prevMonth}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-neutral-400" />
            </button>
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5 dark:text-neutral-300 transition-colors duration-150 cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-neutral-400" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/10">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-[11px] font-semibold text-gray-500 dark:text-neutral-500 uppercase tracking-wide py-1.5"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="border-l border-gray-200 dark:border-white/10">
            {getCalendarWeeks(calendarDate).map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 border-b border-gray-200 dark:border-white/10">
                {week.map((day, dayIdx) => {
                  const dayEvents = day !== null ? getEventsForDay(day) : [];
                  const maxVisible = 2;
                  const remaining = dayEvents.length - maxVisible;

                  return (
                    <div
                      key={dayIdx}
                      className={`min-h-[72px] border-r border-gray-200 dark:border-white/10 p-1 flex flex-col transition-colors duration-100 ${
                        day !== null ? "hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" : "bg-gray-50/50 dark:bg-white/[0.02]"
                      } ${selectedDay === day && day !== null ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                      onClick={() => {
                        if (day !== null) {
                          setSelectedDay(selectedDay === day ? null : day);
                        }
                      }}
                    >
                      {day !== null && (
                        <>
                          {/* Day Number */}
                          <div className="flex justify-end mb-0.5">
                            <span
                              className={`text-xs leading-none flex items-center justify-center ${
                                isToday(day)
                                  ? "bg-red-500 text-white font-bold w-5 h-5 rounded-full"
                                  : "text-gray-700 dark:text-neutral-400 font-medium w-5 h-5"
                              }`}
                            >
                              {day}
                            </span>
                          </div>

                          {/* Event Pills */}
                          <div className="flex flex-col gap-px flex-1 min-w-0">
                            {dayEvents.slice(0, maxVisible).map((event) => (
                              <button
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                                className={`${getEventColor(event.id)} text-white text-[9px] leading-tight font-medium px-1 py-0.5 rounded truncate text-left cursor-pointer hover:brightness-110 transition-all duration-100`}
                                title={event.name}
                              >
                                {event.name}
                              </button>
                            ))}
                            {remaining > 0 && (
                              <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium px-1">
                                +{remaining} more
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Selected Day Detail */}
          {selectedDay !== null && getEventsForDay(selectedDay).length > 0 && (
            <div key={selectedDay} className="calendar-day-reveal mt-3 pt-3 border-t-2 border-highlight/60 dark:border-highlight/40">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-highlight animate-pulse flex-shrink-0" />
                <p className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  {new Date(
                    calendarDate.getFullYear(),
                    calendarDate.getMonth(),
                    selectedDay
                  ).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {getEventsForDay(selectedDay).map((event: Event, i: number) => {
                  const startDate = new Date(event.dateStart);
                  const endDate = event.dateEnd ? new Date(event.dateEnd) : null;
                  let variant: "live" | "upcoming" | "past" = "upcoming";
                  if (now >= startDate && (!endDate || now <= endDate)) {
                    variant = "live";
                  } else if (endDate && now > endDate) {
                    variant = "past";
                  }
                  return (
                    <li
                      key={event.id}
                      className="calendar-card-pop"
                      style={{ "--index": i } as React.CSSProperties}
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
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && <>

      {/* Awaiting Approval Section - Admin Only */}
      {isAdmin && unapprovedEvents.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2 fade-in-heading">
            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            <span className="font-semibold pl-1 text-sm text-yellow-600 dark:text-yellow-400">
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
            <span className="font-semibold text-sm pl-1 text-red-600 dark:text-red-400">
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
            <span className="font-semibold text-sm pl-1 text-blue-600 dark:text-blue-400">
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
            <span className="font-semibold text-sm pl-1 text-gray-600 dark:text-neutral-400">
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

      </>}
    </div>
  );
}
