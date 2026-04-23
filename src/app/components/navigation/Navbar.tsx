"use client";
import { Calendar, Settings, Search, Route, Construction, Bot } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useMapContext } from "@/context/MapContext";
import Clock from "./Clock";
import Image from "next/image";
import UserBadge from "./UserBadge";
import NotificationBell from "./NotificationBell";
import { User } from "@supabase/supabase-js";

type NavbarProps = {
  className?: string;
  user: User | null;
  isAdmin: boolean;
};

export default function Navbar({ className = "", user, isAdmin}: NavbarProps) {
  const { setView, setIsOpen } = useSidebar();
  const { mapPointerEvents } = useMapContext();
  const isDropPinMode = mapPointerEvents === "dropPin";

  return (
    <div
      className={`fixed slide-in-top top-0 left-0 w-full grid items-center justify-items-center z-30 pointer-events-none ${className}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <nav
        className={`w-full h-14 max-w-2xl mt-2 mx-2 rounded-xl px-2 bg-white dark:bg-[#252626] pointer-events-auto border border-neutral-200 dark:border-white/10 flex items-center relative transition-all duration-150 ease-out-2 ${
          isDropPinMode ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="nav__content flex items-center justify-between w-full gap-4">
          <UserBadge userData={user} isAdmin={isAdmin} />
          {/* <div className="relative w-10 h-10 rounded-lg overflow-hidden">
            <Image
              src="/logo.png"
              alt="Bulldog Mapping"
              height={50}
              width={50}
              className="object-cover scale-100"
            />
          </div> */}
          <Clock className="hidden md:flex flex-1 justify-center dark:text-gray-300" />
          <div className="buttons flex gap-1.5 flex-shrink-0 items-center">
            <NotificationBell />
            {[
              { icon: Calendar, label: "Events", view: "eventList" as const },
              { icon: Route, label: "Schedule Route", title: "Upload Schedule", view: "schedule" as const },
              ...(user
                ? [{ icon: Construction, label: "Construction Zones", title: isAdmin ? "Manage Construction Zones" : "Report Construction", view: "constructionZones" as const }]
                : []),
              { icon: Bot, label: "Campus Assistant", title: "Campus Assistant", view: "chatbot" as const },
              { icon: Search, label: "Search", view: "search" as const },
              { icon: Settings, label: "Settings", title: "Settings", view: "settings" as const },
            ].map(({ icon: Icon, label, title, view }) => (
              <button
                key={label}
                disabled={isDropPinMode}
                className="button-depth group p-2 rounded-lg border border-transparent dark:border-white/10 dark:bg-[#2d2f2f] hover:border-highlight-hover hover:bg-highlight dark:hover:border-highlight-hover dark:hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95 disabled:cursor-not-allowed"
                aria-label={label}
                title={title}
                onClick={() => {
                  setView(view);
                  setIsOpen(true);
                }}
              >
                <Icon className="w-5 h-5 dark:text-gray-300 group-hover:text-white transition-colors duration-150 ease-out-2" />
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
