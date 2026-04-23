"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CalendarClock, CalendarDays, Check, Trash2, X } from "lucide-react";
import {
  AppNotification,
  useNotifications,
} from "@/context/NotificationContext";
import { useSidebar } from "@/context/SidebarContext";

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function iconFor(type: AppNotification["type"]) {
  if (type === "class")
    return <CalendarClock className="w-4 h-4 text-blue-500" />;
  return <CalendarDays className="w-4 h-4 text-violet-500" />;
}

export default function NotificationBell() {
  const {
    feed,
    unreadCount,
    markAllRead,
    clearAll,
    removeNotification,
    permission,
    requestPermission,
  } = useNotifications();
  const { setView, setIsOpen } = useSidebar();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      // Defer mark-read so the unread dot animation shows briefly
      setTimeout(() => markAllRead(), 400);
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    if (n.type === "event") {
      setView("eventList");
      setIsOpen(true);
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="button-depth group p-2 rounded-lg border border-transparent dark:border-white/10 dark:bg-[#2d2f2f] hover:border-highlight-hover hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95 relative"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5 dark:text-gray-300 group-hover:text-white transition-colors duration-150 ease-out-2" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center border border-white dark:border-[#252626]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-[#252626] rounded-xl border border-neutral-200 dark:border-white/10 shadow-lg z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-white/10">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Notifications
            </h3>
            <div className="flex items-center gap-1">
              {feed.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 px-1.5 py-0.5 rounded cursor-pointer"
                  title="Clear all"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-neutral-400" />
              </button>
            </div>
          </div>

          {permission === "default" && (
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50">
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-1.5">
                Enable browser notifications to get alerts while the tab is in the background.
              </p>
              <button
                onClick={() => requestPermission()}
                className="text-xs font-medium bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Enable
              </button>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {feed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="w-8 h-8 text-gray-300 dark:text-neutral-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-neutral-400">
                  You&apos;re all caught up
                </p>
                <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">
                  Class reminders and new events will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-white/5">
                {feed.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`group relative flex gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                      !n.read ? "bg-blue-50/60 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{iconFor(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-neutral-300 line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="absolute top-3 right-8 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer shrink-0 self-start"
                      aria-label="Dismiss"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {feed.length > 0 && unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-white/5 border-t border-neutral-200 dark:border-white/10 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
        </div>
      )}
    </div>
  );
}
