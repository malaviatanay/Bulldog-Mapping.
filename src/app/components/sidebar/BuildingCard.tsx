"use client";
import { Building } from "lucide-react";
import Image from "next/image";
import { useMapContext } from "@/context/MapContext";
import Tag from "../ui/Tag";

type BuildingCardProps = {
  className?: string;
};

export default function BuildingCard({ className = "" }: BuildingCardProps) {
  const { selectedBuilding } = useMapContext();

  if (!selectedBuilding) {
    return null;
  }

  const firstImage = selectedBuilding.image_URLs?.[0];

  return (
    <div key={selectedBuilding.id} className={`building-card ${className} `}>
      {/* Heading */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-xl font-semibold">{selectedBuilding.name}</h2>
          <Tag variant="building" />
        </div>
      </div>

      {/* Image */}
      <div
        key={selectedBuilding.id}
        className="relative w-full h-48 bg-gray-100 flex items-center justify-center mb-3  rounded-lg animate-image-intro"
      >
        {firstImage && firstImage != null ? (
          <div className="w-full h-full relative ">
            {/* Blurred glow image underneath */}
            <Image
              src={firstImage}
              alt=""
              width={500}
              height={500}
              className="object-cover top-0 left-0 w-full h-full absolute z-10 col-start-1 row-start-1 blur-md scale-105 opacity-60 rounded-lg"
            />
            {/* Main image on top */}
            <Image
              src={firstImage}
              alt={selectedBuilding.name}
              width={500}
              height={500}
              className="object-cover w-full h-full relative z-10 col-start-1 row-start-1 rounded-lg"
            />
          </div>
        ) : (
          <Building className="w-16 h-16 text-gray-400" />
        )}
      </div>

      {/* Conditional Info */}
      <div>
        {selectedBuilding.description && (
          <p className="text-gray-600 text-sm mb-3">
            {selectedBuilding.description}
          </p>
        )}

        {selectedBuilding.hoursOpen && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-900 mb-1">Hours</div>
            <div className="text-gray-500 text-base">
              {selectedBuilding.hoursOpen}
            </div>
          </div>
        )}

        {selectedBuilding.daysOpen && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-900 mb-1">Days</div>
            <div className="text-gray-500 text-base">
              {selectedBuilding.daysOpen}
            </div>
          </div>
        )}

        {selectedBuilding.address && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-900 mb-1">Address</div>
            <div className="text-gray-500 text-base">
              {selectedBuilding.address}
            </div>
          </div>
        )}

        {selectedBuilding.website && (
          <div className="mb-3">
            <div className="font-semibold text-xs text-gray-900 mb-1">Website</div>
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
            <div className="font-semibold text-xs text-gray-900 mb-1">Floors</div>
            <div className="text-gray-500 text-base">
              {selectedBuilding.floors}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
