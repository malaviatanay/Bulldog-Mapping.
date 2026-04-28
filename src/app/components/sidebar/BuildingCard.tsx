"use client";
import { Building, Navigation } from "lucide-react";
import Image from "next/image";
import { useMapContext } from "@/context/MapContext";
import { useNavigation } from "@/context/NavigationContext";
import { useSidebar } from "@/context/SidebarContext";
import { getCenterFromPolygon } from "@/utils/pathfinding/geoUtils";
import Tag from "../ui/Tag";

type BuildingCardProps = {
  className?: string;
};

export default function BuildingCard({ className = "" }: BuildingCardProps) {
  const { selectedBuilding, buildingPolygons, parkingPolygons } = useMapContext();
  const { startDirectionsTo, loading } = useNavigation();
  const { setIsOpen } = useSidebar();

  if (!selectedBuilding) {
    return null;
  }

  const firstImage = selectedBuilding.image_URLs?.[0];

  const handleDirections = () => {
    const allPolygons = [...buildingPolygons, ...parkingPolygons];
    const polygon = allPolygons.find(
      (p) => p.building_id === selectedBuilding.id
    );
    if (!polygon?.geojson) return;
    try {
      const center = getCenterFromPolygon(polygon.geojson);
      const isParking = selectedBuilding.metaTags?.includes("parking");
      setIsOpen(false);
      startDirectionsTo({
        id: selectedBuilding.id,
        kind: isParking ? "parking" : "building",
        name: selectedBuilding.name,
        coordinates: center,
      });
    } catch (e) {
      console.warn("Could not compute building center for directions:", e);
    }
  };

  return (
    <div key={selectedBuilding.id} className={`building-card ${className} `}>
      {/* Heading */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedBuilding.name}</h2>
          <Tag variant="building" />
        </div>
        <button
          onClick={handleDirections}
          disabled={loading}
          className="button-depth mt-2 w-full bg-highlight text-white py-2.5 rounded-xl border border-highlight-hover hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Navigation className="w-4 h-4" />
          {loading ? "Finding route..." : "Directions"}
        </button>
      </div>

      {/* Image */}
      <div
        key={selectedBuilding.id}
        className="relative w-full h-48 bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3 rounded-lg animate-image-intro"
      >
        {firstImage && firstImage != null ? (
          <div className="w-full h-full relative">
            <Image
              src={firstImage}
              alt=""
              width={500}
              height={500}
              className="object-cover top-0 left-0 w-full h-full absolute z-10 col-start-1 row-start-1 blur-md scale-105 opacity-60 rounded-lg"
            />
            <Image
              src={firstImage}
              alt={selectedBuilding.name}
              width={500}
              height={500}
              className="object-cover w-full h-full relative z-10 col-start-1 row-start-1 rounded-lg"
            />
          </div>
        ) : (
          <Building className="w-16 h-16 text-gray-400 dark:text-neutral-600" />
        )}
      </div>

      {/* Conditional Info */}
      <div>
        {selectedBuilding.description && (
          <p className="text-gray-600 dark:text-gray-200 text-sm mb-3 leading-relaxed">
            {selectedBuilding.description}
          </p>
        )}

        {selectedBuilding.hoursOpen && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1">Hours</div>
            <div className="text-gray-800 dark:text-white text-base font-medium">
              {selectedBuilding.hoursOpen}
            </div>
          </div>
        )}

        {selectedBuilding.daysOpen && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1">Days</div>
            <div className="text-gray-800 dark:text-white text-base font-medium">
              {selectedBuilding.daysOpen}
            </div>
          </div>
        )}

        {selectedBuilding.address && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1">Address</div>
            <div className="text-gray-800 dark:text-white text-base font-medium">
              {selectedBuilding.address}
            </div>
          </div>
        )}

        {selectedBuilding.website && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1">Website</div>
            <a
              href={selectedBuilding.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-highlight hover:text-highlight-hover text-base underline transition-colors duration-150 ease-out-2"
            >
              Visit Website
            </a>
          </div>
        )}

        {selectedBuilding.floors && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1">Floors</div>
            <div className="text-gray-800 dark:text-white text-base font-medium">
              {selectedBuilding.floors}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
