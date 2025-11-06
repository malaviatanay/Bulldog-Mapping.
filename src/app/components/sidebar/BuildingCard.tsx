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
    <div className={`building-card ${className} `}>
      {/* Heading */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold">{selectedBuilding.name}</h2>
          <Tag variant="building" />
        </div>
      </div>

      {/* Image */}
      <div
        key={selectedBuilding.id}
        className="relative w-full h-48 bg-gray-100 flex items-center justify-center mb-3  rounded-lg animate-image-intro"
      >
        {firstImage ? (
          <>
            {/* Blurred glow image underneath */}
            <Image
              src={firstImage}
              alt=""
              fill
              className="object-cover blur-md scale-105 opacity-60 rounded-lg"
            />
            {/* Main image on top */}
            <Image
              src={firstImage}
              alt={selectedBuilding.name}
              fill
              className="object-cover relative z-10 rounded-lg"
            />
          </>
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
            <div className="font-medium text-sm mb-1">Hours</div>
            <div className="text-gray-700 text-sm">
              {selectedBuilding.hoursOpen}
            </div>
          </div>
        )}

        {selectedBuilding.daysOpen && (
          <div className="mb-3">
            <div className="font-medium text-sm mb-1">Days</div>
            <div className="text-gray-700 text-sm">
              {selectedBuilding.daysOpen}
            </div>
          </div>
        )}

        {selectedBuilding.address && (
          <div className="mb-2">
            <span className="font-medium text-sm">Address: </span>
            <span className="text-gray-700 text-sm">
              {selectedBuilding.address}
            </span>
          </div>
        )}

        {selectedBuilding.website && (
          <div className="mb-2">
            <a
              href={selectedBuilding.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-highlight hover:text-highlight-hover text-sm underline transition-colors duration-150 ease-out-2"
            >
              Visit Website
            </a>
          </div>
        )}

        {selectedBuilding.floors && (
          <div className="mb-2">
            <span className="font-medium text-sm">Floors: </span>
            <span className="text-gray-700 text-sm">
              {selectedBuilding.floors}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
