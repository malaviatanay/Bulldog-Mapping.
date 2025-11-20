"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, MapPin } from "lucide-react";
import { useMapContext } from "@/context/MapContext";
import { useSidebar } from "@/context/SidebarContext";
import { Tables } from "@/types/supabase";

type Building = Tables<"building">;
type Event = Tables<"event">;

type Category = {
  name: string;
  icon: string;
  checked?: boolean;
};

// type SearchSuggestion = {
//   building?: Building;
//   event?: Event;
//   id: number;
//   name: string;
//   type: "Building" | "Parking" | "Food" | "Venue" | "Landmark";

// };
type SearchSuggestion = Building | Event;

const SearchBar = () => {
  const {
    buildings,
    events,
    buildingPolygons,
    setSelectedBuilding,
    setSelectedEvent,
    flyTo,
  } = useMapContext();
  const { setIsOpen, isOpen, setView } = useSidebar();
  console.log("Buildings in SearchBar:", buildings);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories: Category[] = [
    { name: "Campus Layer", icon: "🗺️", checked: true },
    { name: "Accessibility", icon: "♿" },
    { name: "Campus Housing", icon: "🏠" },
    { name: "Construction", icon: "🚧" },
    { name: "Emergency", icon: "🚨" },
    { name: "EV Charging Stations", icon: "🔌" },
    { name: "Food & Drink", icon: "🍽️" },
    { name: "Parking", icon: "🅿️" },
    { name: "Restrooms", icon: "🚻" },
  ];

  // Filter suggestions based on search query
  useEffect(() => {
    if (searchQuery.length > 0) {
      const validEvents = events.filter((event) => {
        const now = new Date();
        const eventEnd = event.dateEnd ? new Date(event.dateEnd) : null;
        let isPast = true;
        if (eventEnd) {
          isPast = now > eventEnd;
        }
        return event.isApproved && !isPast;
      });

      const allLocations: SearchSuggestion[] = [...buildings, ...validEvents];
      const filtered = allLocations.filter((location) => {
        if (location.name.toLowerCase().includes(searchQuery.toLowerCase()))
          return true;
        else if (
          location.metaTags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
          return true;
        else return false;
      });
      setSuggestions(filtered.slice(0, 7)); // Show max 7 suggestions
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, buildings, events]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (inputRef.current && isOpen) {
      console.log("Focusing input");
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Helper to calculate center of a GeoJSON polygon
  const getCenterFromGeoJSON = (geojson: GeoJSON.Feature): [number, number] => {
    if (!geojson.geometry || geojson.geometry.type !== "Polygon") {
      return [0, 0];
    }
    const coords =
      geojson.geometry.type === "Polygon"
        ? geojson.geometry.coordinates[0]
        : [];

    // Calculate average lng/lat
    const sumLng = coords.reduce(
      (sum: number, coord: number[]) => sum + coord[0],
      0
    );
    const sumLat = coords.reduce(
      (sum: number, coord: number[]) => sum + coord[1],
      0
    );

    return [sumLng / coords.length, sumLat / coords.length];
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    // if building, use any unique building property to differentiate
    if ("hoursOpen" in suggestion) {
      const geoData = buildingPolygons.find(
        (bp) => bp.building_id === suggestion.id
      )?.geojson;

      if (geoData) {
        const [lng, lat] = getCenterFromGeoJSON(
          geoData as unknown as GeoJSON.Feature
        );
        if (lng && lat) {
          flyTo(lng, lat, 17);
        }
      }

      setSelectedBuilding(suggestion);
      setView("building");
    }
    // else event
    else {
      setSelectedEvent(suggestion);
      setView("event");
      flyTo(suggestion.longitude, suggestion.latitude, 17);
    }

    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
  };

  const handleSearch = () => {
    if (searchQuery) {
      // TODO: Add search logic here
      console.log("Searching for:", searchQuery);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full">
      <div
        className="bg-white rounded-lg border border-neutral-200 overflow-hidden"
        ref={searchRef}
      >
        <div className="flex items-center p-3 border-b border-gray-200">
          <Search className="mr-3 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search buildings, parking, food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            // onKeyPress={handleKeyPress}
            className="flex-1 outline-none border-none text-sm text-gray-700 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSuggestions(false);
              }}
              className="mr-2 p-1 rounded hover:bg-gray-100 transition-colors duration-150 ease-out-2 cursor-pointer"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          <button
            onClick={handleSearch}
            className="bg-highlight button-depth text-white px-4 py-2 rounded-lg ml-2 cursor-pointer text-sm hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 hover:scale-105 active:scale-95"
          >
            Search
          </button>
          {/* <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-2 p-2 bg-highlight text-white rounded-lg cursor-pointer hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 hover:scale-105 active:scale-95"
          >
            <MapPin className="w-5 h-5" />
          </button> */}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="bg-white border-b border-gray-200">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ease-out-2"
              >
                <div className="flex items-center">
                  {/* <span className="mr-3 text-lg">
                    {suggestion.type === "Building" && "🏢"}
                    {suggestion.type === "Parking" && "🅿️"}
                    {suggestion.type === "Food" && "🍽️"}
                    {suggestion.type === "Venue" && "🏟️"}
                    {suggestion.type === "Landmark" && "🌳"}
                  </span> */}
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {suggestion.name}
                    </p>
                    {/* <p className="text-xs text-gray-500">{suggestion.type}</p> */}
                  </div>
                </div>
                <span className="text-gray-400 text-sm">→</span>
              </div>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {showSuggestions && searchQuery && suggestions.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No results found for {`"${searchQuery}"`}.
          </div>
        )}

        {/* Filters Section */}
        {/* {showFilters && (
          <div className="max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center p-3 border-b border-gray-200">
              <h3 className="font-semibold m-0 text-gray-700">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-highlight text-sm border-none bg-transparent cursor-pointer font-medium hover:text-highlight-hover transition-colors duration-150 ease-out-2"
              >
                CLEAR
              </button>
            </div>

            {categories.map((category, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border-b border-gray-200 cursor-pointer bg-white hover:bg-gray-50 transition-colors duration-150 ease-out-2"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{category.icon}</span>
                  <span className="text-gray-700">{category.name}</span>
                </div>
                {category.checked ? (
                  <span className="text-blue-600 text-lg">✓</span>
                ) : (
                  <span className="text-gray-400 text-lg">›</span>
                )}
              </div>
            ))}
          </div>
        )} */}
      </div>
    </div>
  );
};

export default SearchBar;
