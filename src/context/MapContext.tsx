'use client'
import React, { createContext, useContext, useState } from "react"
import { Tables } from "@/types/supabase";

const MapContext = createContext<MapContextType | null>(null);

type Building = Tables<"building">;
type Event = Tables<"event">;
type BuildingPolygon = Tables<"building_polygons">;

type FilterState = {
  tags: string[];
  dateRange?: {
    start: string;
    end: string;
  };
};

type MapContextType = {
  buildings: Building[];
  events: Event[];
  buildingPolygons: BuildingPolygon[];
  selectedBuilding: Building | null;
  selectedEvent: Event | null;
  searchQuery: string;
  filters: FilterState;
  setSelectedBuilding: (building: Building | null) => void;
  setSelectedEvent: (event: Event | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: FilterState) => void;
};

type MapProviderProps = {
  children: React.ReactNode;
  buildings: Building[];
  events: Event[];
  buildingPolygons: BuildingPolygon[];
};

export function MapProvider({ children, buildings, events, buildingPolygons }: MapProviderProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({
    tags: [],
    dateRange: undefined,
  });

  const value: MapContextType = {
    buildings,
    events,
    buildingPolygons,
    selectedBuilding,
    selectedEvent,
    searchQuery,
    filters,
    setSelectedBuilding,
    setSelectedEvent,
    setSearchQuery,
    setFilters,
  };

  return <MapContext value={value}>{children}</MapContext>;
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapContext must be used within a MapProvider");
  }
  return context;
}

// Export types for use in other components
export type { Building, Event, BuildingPolygon, FilterState };