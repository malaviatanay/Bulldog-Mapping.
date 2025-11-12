"use client";
import { Calendar, Menu, X, Search } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useMapContext } from "@/context/MapContext";
import Clock from "./Clock";
import Image from "next/image";

type NavbarProps = {
  className?: string;
};

export default function Navbar({ className = "" }: NavbarProps) {
  const { isOpen, setView, setIsOpen, toggleSidebar } = useSidebar();
  const { mapPointerEvents } = useMapContext();
  const isDropPinMode = mapPointerEvents === "dropPin";

  return (
    <div
      className={`fixed top-0 left-0 w-full grid items-center justify-items-center z-30 pointer-events-none ${className}`}
    >
      <nav className={`w-full h-14  max-w-md  mt-4 rounded-xl overflow-clip px-2  bg-white pointer-events-auto border border-neutral-200 flex items-center relative transition-opacity duration-150 ease-out-2 ${isDropPinMode ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="nav__content flex items-center justify-between w-full">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden">
            <Image
              src="/bulldogmappingicon.png"
              alt="Bulldog Mapping"
              height={50}
              width={50}
              className="object-cover scale-140"
            />
          </div>
          <Clock className="hidden sm:flex absolute left-1/2 -translate-x-1/2" />
          <div className="buttons flex gap-2">
            <button
              disabled={isDropPinMode}
              className="button-depth group p-2 rounded-lg border border-transparent hover:border-highlight-hover hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95 disabled:cursor-not-allowed"
              aria-label="Events"
              onClick={() => {
                setView("eventCreator");
              }}
            >
              <Calendar className="w-5 h-5 group-hover:text-white transition-colors duration-150 ease-out-2" />
            </button>
            <button
              disabled={isDropPinMode}
              className="button-depth group p-2 rounded-lg border border-transparent hover:border-highlight-hover hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95 disabled:cursor-not-allowed"
              aria-label="Search"
              onClick={() => {
                setView("search");
                setIsOpen(true);
              }}
            >
              <Search className="w-5 h-5 group-hover:text-white transition-colors duration-150 ease-out-2" />
            </button>
            <button
              disabled={isDropPinMode}
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer disabled:cursor-not-allowed ${
                isOpen
                  ? "button-depth bg-highlight hover:bg-highlight-hover border border-highlight-hover"
                  : "hover:bg-gray-100 border border-transparent"
              } hover:scale-105 active:scale-95`}
              aria-label="Toggle Sidebar"
            >
              <span className="grid items-center justify-center grid-cols-1 grid-rows-1 w-5 h-5">
                <Menu
                  className={`transition-[transform_filter_opacity] duration-200 ease-out-2 ${
                    isOpen
                      ? "blur-xs opacity-0 scale-50"
                      : "blur-none opacity-100 scale-100"
                  } inline-block w-full h-full col-start-1 row-start-1 ${
                    isOpen ? "" : "text-gray-900"
                  }`}
                />
                <X
                  className={`transition-[transform_filter_opacity] duration-200 ease-out-2 ${
                    !isOpen
                      ? "blur-xs opacity-0 scale-50"
                      : "blur-none opacity-100 scale-100"
                  } inline-block w-full h-full col-start-1 row-start-1 text-white`}
                />
              </span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
