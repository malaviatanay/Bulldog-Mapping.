"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { SavedRoute, DayOfWeek } from "@/types/savedRoute";
import { Tables } from "@/types/supabase";

type EventRow = Tables<"event">;

export type NotificationType = "class" | "event";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  eventId?: string;
};

type NotificationPrefs = {
  classReminders: boolean;
  eventNotifications: boolean;
  reminderMinutes: number;
};

type NotificationContextType = {
  feed: AppNotification[];
  unreadCount: number;
  prefs: NotificationPrefs;
  permission: NotificationPermission;
  setClassReminders: (v: boolean) => void;
  setEventNotifications: (v: boolean) => void;
  setReminderMinutes: (v: number) => void;
  requestPermission: () => Promise<NotificationPermission>;
  markAllRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  sendTestNotification: (type?: NotificationType) => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

const STORAGE_FEED_KEY = "bulldog-notif-feed";
const STORAGE_CLASS_KEY = "bulldog-notif-class-reminders";
const STORAGE_EVENT_KEY = "bulldog-notif-events";
const STORAGE_MINUTES_KEY = "bulldog-notif-reminder-minutes";
const STORAGE_SEEN_EVENTS_KEY = "bulldog-notif-seen-events";
const FEED_MAX = 50;

const JS_DAY_TO_ROUTE: Record<number, DayOfWeek | null> = {
  0: null,
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: null,
};

function parseTimeToToday(timeStr: string): Date | null {
  const match = timeStr
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function formatTime12h(timeStr: string): string {
  const parsed = parseTimeToToday(timeStr);
  if (!parsed) return timeStr;
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function loadFeed(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_FEED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveFeed(feed: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_FEED_KEY, JSON.stringify(feed));
  } catch {
    /* ignore quota */
  }
}

function loadBool(key: string, def: boolean): boolean {
  if (typeof window === "undefined") return def;
  const v = localStorage.getItem(key);
  return v === null ? def : v === "true";
}

function loadNumber(key: string, def: number): number {
  if (typeof window === "undefined") return def;
  const v = localStorage.getItem(key);
  if (v === null) return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function loadSeenEvents(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_SEEN_EVENTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSeenEvents(seen: Set<string>) {
  try {
    const arr = Array.from(seen).slice(-200);
    localStorage.setItem(STORAGE_SEEN_EVENTS_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

type NotificationProviderProps = {
  children: React.ReactNode;
  user: User | null;
  savedRoutes: SavedRoute[];
};

export function NotificationProvider({
  children,
  user,
  savedRoutes,
}: NotificationProviderProps) {
  const [feed, setFeed] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    classReminders: true,
    eventNotifications: true,
    reminderMinutes: 15,
  });
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const timeoutsRef = useRef<number[]>([]);
  const seenEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setFeed(loadFeed());
    setPrefs({
      classReminders: loadBool(STORAGE_CLASS_KEY, true),
      eventNotifications: loadBool(STORAGE_EVENT_KEY, true),
      reminderMinutes: loadNumber(STORAGE_MINUTES_KEY, 15),
    });
    seenEventsRef.current = loadSeenEvents();
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const addToFeed = useCallback(
    (n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
      setFeed((prev) => {
        const entry: AppNotification = {
          ...n,
          id: `${n.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
          read: false,
        };
        const next = [entry, ...prev].slice(0, FEED_MAX);
        saveFeed(next);
        return next;
      });
    },
    []
  );

  const fireBrowserNotification = useCallback(
    (title: string, body: string) => {
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      try {
        new Notification(title, {
          body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
        });
      } catch {
        /* ignore */
      }
    },
    []
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as const;
    if (Notification.permission !== "default") return Notification.permission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const setClassReminders = useCallback((v: boolean) => {
    setPrefs((p) => ({ ...p, classReminders: v }));
    localStorage.setItem(STORAGE_CLASS_KEY, String(v));
  }, []);

  const setEventNotifications = useCallback((v: boolean) => {
    setPrefs((p) => ({ ...p, eventNotifications: v }));
    localStorage.setItem(STORAGE_EVENT_KEY, String(v));
  }, []);

  const setReminderMinutes = useCallback((v: number) => {
    setPrefs((p) => ({ ...p, reminderMinutes: v }));
    localStorage.setItem(STORAGE_MINUTES_KEY, String(v));
  }, []);

  const markAllRead = useCallback(() => {
    setFeed((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveFeed(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFeed([]);
    saveFeed([]);
  }, []);

  const sendTestNotification = useCallback(
    (type: NotificationType = "class") => {
      const title =
        type === "class"
          ? "Test: Class starts soon"
          : "Test: New event on campus";
      const body =
        type === "class"
          ? "This is a sample class reminder."
          : "This is a sample event notification.";
      addToFeed({ type, title, body });
      fireBrowserNotification(title, body);
    },
    [addToFeed, fireBrowserNotification]
  );

  const removeNotification = useCallback((id: string) => {
    setFeed((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveFeed(next);
      return next;
    });
  }, []);

  // Schedule class reminders for today
  useEffect(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    if (!prefs.classReminders || !user) return;

    const todayKey = JS_DAY_TO_ROUTE[new Date().getDay()];
    if (!todayKey) return;
    const route = savedRoutes.find((r) => r.dayOfWeek === todayKey);
    if (!route || !route.classStartTimes) return;

    const now = Date.now();
    route.classStartTimes.forEach((timeStr, i) => {
      if (!timeStr) return;
      const classDate = parseTimeToToday(timeStr);
      if (!classDate) return;
      const fireAt =
        classDate.getTime() - prefs.reminderMinutes * 60 * 1000;
      const delay = fireAt - now;
      if (delay <= 0) return;
      const buildingName = route.buildingNames[i] || "your next class";
      const t = window.setTimeout(() => {
        const title = `Class starts in ${prefs.reminderMinutes} min`;
        const body = `${buildingName} at ${formatTime12h(timeStr)}`;
        addToFeed({ type: "class", title, body });
        fireBrowserNotification(title, body);
      }, delay);
      timeoutsRef.current.push(t);
    });

    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, [
    prefs.classReminders,
    prefs.reminderMinutes,
    savedRoutes,
    user,
    addToFeed,
    fireBrowserNotification,
  ]);

  // Supabase realtime: new approved events
  useEffect(() => {
    if (!prefs.eventNotifications) return;
    const supabase = createClient();

    const handleRow = (row: EventRow) => {
      if (!row.isApproved) return;
      if (seenEventsRef.current.has(row.id)) return;
      const startDate = new Date(row.dateStart);
      if (startDate.getTime() < Date.now()) return;
      seenEventsRef.current.add(row.id);
      saveSeenEvents(seenEventsRef.current);
      const title = "New event on campus";
      const whenText = startDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const body = `${row.name} — ${whenText}`;
      addToFeed({ type: "event", title, body, eventId: row.id });
      fireBrowserNotification(title, body);
    };

    const channel = supabase
      .channel("public:event")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event" },
        (payload) => handleRow(payload.new as EventRow)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "event" },
        (payload) => {
          const oldRow = payload.old as Partial<EventRow>;
          const newRow = payload.new as EventRow;
          if (!oldRow.isApproved && newRow.isApproved) handleRow(newRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prefs.eventNotifications, addToFeed, fireBrowserNotification]);

  const unreadCount = useMemo(
    () => feed.filter((n) => !n.read).length,
    [feed]
  );

  const value: NotificationContextType = {
    feed,
    unreadCount,
    prefs,
    permission,
    setClassReminders,
    setEventNotifications,
    setReminderMinutes,
    requestPermission,
    markAllRead,
    clearAll,
    removeNotification,
    sendTestNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return ctx;
}
