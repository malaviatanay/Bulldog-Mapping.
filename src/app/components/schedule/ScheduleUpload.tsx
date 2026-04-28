 "use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  AlertCircle,
  MapPin,
  Plus,
  Trash2,
  BookMarked,
  Download,
  Navigation,
  Loader,
  RefreshCw,
  CalendarClock,
  Route as RouteIcon,
  Flag,
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useMapContext } from "@/context/MapContext";
import { useNavigation } from "@/context/NavigationContext";
import { matchAllClasses } from "@/utils/schedule/buildingMatcher";
import { buildCampusGraph } from "@/utils/pathfinding/campusGraph";
import { planScheduleRoute } from "@/utils/pathfinding/routePlanner";
import { getCenterFromPolygon } from "@/utils/pathfinding/geoUtils";
import ScheduleResult from "./ScheduleResult";
import { MatchResult, RouteStop, ScheduleRoute, BuildingData } from "@/types/schedule";
import { SavedRoute, DayOfWeek, DAYS_OF_WEEK, DAY_LABELS } from "@/types/savedRoute";
import { deleteSavedRoute } from "@/app/actions/savedRouteActions";
import { User } from "@supabase/supabase-js";

type BuildingEntry = { building: string; startTime: string; endTime: string };

interface ScheduleUploadProps {
  savedRoutes: SavedRoute[];
  user: User | null;
}

type ScheduleMode = "schedule" | "directions";

export default function ScheduleUpload({ savedRoutes, user }: ScheduleUploadProps) {
  const [mode, setMode] = useState<ScheduleMode>("schedule");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);

  // Manual entry state
  const [buildingEntries, setBuildingEntries] = useState<BuildingEntry[]>([{ building: "", startTime: "", endTime: "" }]);
  const [startFromParking, setStartFromParking] = useState(false);
  const [selectedParkingLot, setSelectedParkingLot] = useState("");

  // Quick directions state
  const [dirFromMode, setDirFromMode] = useState<"location" | "building">("location");
  const [dirFromBuilding, setDirFromBuilding] = useState("");
  const [dirTo, setDirTo] = useState("");
  const [dirError, setDirError] = useState<string | null>(null);
  const [dirProcessing, setDirProcessing] = useState(false);

  // Saved routes state
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setView, setIsOpen } = useSidebar();
  const { buildings, buildingPolygons, parkingLots: parkingLotsData, parkingPolygons, constructionZones, setScheduleRoute, clearScheduleRoute, userLocation } = useMapContext();

  // Derive locationStatus from the shared userLocation so this view stays in sync
  // with MapTest's watchPosition instead of running its own one-shot fetch that
  // can race the GPS fix and get stuck in "denied".
  const [locationDenied, setLocationDenied] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    if (typeof navigator.permissions?.query === "function") {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((p) => setLocationDenied(p.state === "denied"))
        .catch(() => {});
    }
  }, []);
  const locationStatus: "pending" | "granted" | "denied" = locationDenied
    ? "denied"
    : userLocation
      ? "granted"
      : "pending";
  const { startDirectionsTo: navStartDirectionsTo, startDirectionsBetween: navStartDirectionsBetween, clearDirections: navClearDirections } = useNavigation();

  const parkingLots = parkingLotsData.map((lot) => lot.name);

  const savedRoutesByDay = new Map<DayOfWeek, SavedRoute>();
  for (const route of savedRoutes) {
    savedRoutesByDay.set(route.dayOfWeek, route);
  }

  const selectedSavedRoute = selectedDay ? savedRoutesByDay.get(selectedDay) ?? null : null;

  const findParkingLotByName = (name: string) => {
    return parkingLotsData.find((lot) => lot.name === name) || null;
  };

  const filterRouteFromCurrentTime = (route: ScheduleRoute): ScheduleRoute => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const toMinutes = (time?: string): number => {
      if (!time) return -1;
      const [h, m] = time.split(":").map(Number);
      return isNaN(h) || isNaN(m) ? -1 : h * 60 + m;
    };

    const locationStop = route.stops.find((s) => s.isUserLocation) ?? null;
    const classStops = route.stops.filter((s) => !s.isUserLocation);

    // Only filter if at least one stop has time data entered
    const hasAnyTimes = classStops.some(
      (s) => toMinutes(s.classTime) !== -1 || toMinutes(s.classEndTime) !== -1
    );
    if (!hasAnyTimes) return route;

    // A stop is still relevant if:
    // - it has an end time and the class hasn't ended yet (endTime > now)
    // - it has only a start time and hasn't started yet (startTime >= now)
    const isStillRelevant = (stop: RouteStop): boolean => {
      const endMins = toMinutes(stop.classEndTime);
      const startMins = toMinutes(stop.classTime);
      if (endMins !== -1) return endMins > currentMinutes;
      if (startMins !== -1) return startMins >= currentMinutes;
      return true; // no times at all — keep
    };

    const firstActiveIndex = classStops.findIndex(isStillRelevant);
    const activeClassStops = firstActiveIndex !== -1 ? classStops.slice(firstActiveIndex) : [];
    const activeSegments = firstActiveIndex !== -1 ? route.segments.slice(firstActiveIndex) : [];

    return {
      ...route,
      stops: locationStop ? [locationStop, ...activeClassStops] : activeClassStops,
      segments: activeSegments,
      totalDistance: activeSegments.reduce((sum, s) => sum + s.totalDistance, 0),
      totalWalkTime: activeSegments.reduce((sum, s) => sum + s.totalWalkTime, 0),
    };
  };

  const injectUserLocationStop = (route: ScheduleRoute, location: [number, number]): ScheduleRoute => {
    const locationStop: RouteStop = {
      order: 0,
      building: {
        id: "user-location",
        name: "Your Location",
        address: null,
        daysOpen: null,
        description: "Your current GPS location",
        eventIDs: null,
        floors: 1,
        hoursOpen: "",
        image_URLs: [],
        metaTags: [],
        otherNames: [],
        rooms: null,
        website: null,
      } as unknown as BuildingData,
      coordinates: location,
      classTime: "",
      className: "Current Location",
      isUserLocation: true,
    };
    return {
      ...route,
      stops: [locationStop, ...route.stops],
    };
  };

  const isTodaysDayOfWeek = (day: DayOfWeek): boolean => {
    const todayIndex = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dayMap: Record<number, DayOfWeek> = {
      1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday",
    };
    return dayMap[todayIndex] === day;
  };

  const computeRoute = (
    entries: BuildingEntry[],
    useParking: boolean,
    parkingName: string | null,
    filterByTime = true
  ) => {
    const allNames = useParking && parkingName
      ? [parkingName, ...entries.map((e) => e.building)]
      : entries.map((e) => e.building);

    const parsedClasses = allNames.map((name, index) => {
      const isParking = useParking && index === 0;
      const entryIndex = useParking ? index - 1 : index;
      const entry = !isParking ? entries[entryIndex] : null;
      return {
        id: Math.random().toString(36).substring(2, 9),
        courseCode: isParking ? "Parking" : `Class ${index}`,
        courseName: undefined,
        daysOfWeek: [],
        startTime: entry?.startTime ?? "",
        endTime: entry?.endTime ?? "",
        buildingRaw: name.trim(),
        roomRaw: "",
        rawText: name,
      };
    });

    let results = matchAllClasses(parsedClasses, buildings);

    if (useParking && parkingName) {
      const parkingLot = findParkingLotByName(parkingName);
      if (parkingLot) {
        results = [
          {
            parsedClass: parsedClasses[0],
            match: {
              building: {
                id: parkingLot.id,
                name: parkingLot.name,
                address: null,
                daysOpen: null,
                description: parkingLot.description || "Parking lot",
                eventIDs: null,
                floors: 1,
                hoursOpen: "24/7",
                image_URLs: [],
                metaTags: ["parking"],
                otherNames: [],
                rooms: null,
                website: null,
              },
              confidence: 1.0,
              matchedOn: "exact",
              matchType: "exact",
            },
            suggestions: [],
          },
          ...results.slice(1),
        ];
      }
    }

    setMatchResults(results);

    const validMatches = results.filter((r) => r.match !== null);
    if (validMatches.length >= 1) {
      const allPolygons = [...buildingPolygons, ...parkingPolygons];
      const allBuildings =
        useParking
          ? [
              ...buildings,
              ...parkingLotsData.map((lot) => ({
                id: lot.id,
                name: lot.name,
                address: null,
                daysOpen: null,
                description: lot.description || "Parking lot",
                eventIDs: null,
                floors: 1,
                hoursOpen: "24/7",
                image_URLs: [],
                metaTags: ["parking"],
                otherNames: [],
                rooms: null,
                website: null,
              })),
            ]
          : buildings;

      const graph = buildCampusGraph(allBuildings, allPolygons);
      let routeResult = planScheduleRoute(graph, results, allPolygons, constructionZones);
      if (routeResult && userLocation) {
        routeResult = injectUserLocationStop(routeResult, userLocation);
      }
      if (filterByTime) routeResult = filterRouteFromCurrentTime(routeResult);
      setScheduleRoute(routeResult, results);
    }
  };

  const handleLoadSavedRoute = (savedRoute: SavedRoute) => {
    const useParking = !!savedRoute.parkingLotName;
    const parkingName = savedRoute.parkingLotName;

    const restoredEntries: BuildingEntry[] = savedRoute.buildingNames.map((name, i) => ({
      building: name,
      startTime: savedRoute.classStartTimes?.[i] ?? "",
      endTime: savedRoute.classEndTimes?.[i] ?? "",
    }));

    setBuildingEntries(restoredEntries);
    if (useParking && parkingName) {
      setStartFromParking(true);
      setSelectedParkingLot(parkingName);
    } else {
      setStartFromParking(false);
      setSelectedParkingLot("");
    }

    setIsProcessing(true);
    setError(null);
    try {
      computeRoute(restoredEntries, useParking, parkingName, isTodaysDayOfWeek(savedRoute.dayOfWeek));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved route");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSavedRoute = async (day: DayOfWeek) => {
    if (!confirm(`Delete your saved route for ${DAY_LABELS[day].full}?`)) return;
    setIsDeleting(true);
    try {
      await deleteSavedRoute(day);
      if (selectedDay === day) setSelectedDay(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete saved route");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setMatchResults(null);
    // Keep building entries so the user can restore the route
  };

  const handleNewSchedule = () => {
    setError(null);
    setMatchResults(null);
    setBuildingEntries([{ building: "", startTime: "", endTime: "" }]);
    setStartFromParking(false);
    setSelectedParkingLot("");
  };

  const addBuildingEntry = () => {
    setBuildingEntries([...buildingEntries, { building: "", startTime: "", endTime: "" }]);
  };

  const removeBuildingEntry = (index: number) => {
    if (buildingEntries.length > 1) {
      setBuildingEntries(buildingEntries.filter((_, i) => i !== index));
    }
  };

  const updateBuildingEntry = (index: number, field: keyof BuildingEntry, value: string) => {
    const newEntries = [...buildingEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setBuildingEntries(newEntries);
  };

  const getSuggestions = (input: string): string[] => {
    if (input.length < 2) return [];
    const normalized = input.toLowerCase();
    return buildings
      .filter((b) => b.name.toLowerCase().includes(normalized))
      .slice(0, 5)
      .map((b) => b.name);
  };

  // Suggestions for directions: combines buildings + parking lots
  const getLocationSuggestions = (input: string): string[] => {
    if (input.length < 2) return [];
    const normalized = input.toLowerCase();
    const buildingMatches = buildings
      .filter((b) => b.name.toLowerCase().includes(normalized))
      .map((b) => b.name);
    const parkingMatches = parkingLotsData
      .filter((p) => p.name.toLowerCase().includes(normalized))
      .map((p) => p.name);
    return [...buildingMatches, ...parkingMatches].slice(0, 8);
  };

  const parkingLotToBuildingData = (lot: (typeof parkingLotsData)[number]): BuildingData =>
    ({
      id: lot.id,
      name: lot.name,
      address: null,
      daysOpen: null,
      description: lot.description || "Parking lot",
      eventIDs: null,
      floors: 1,
      hoursOpen: "24/7",
      image_URLs: [],
      metaTags: ["parking"],
      otherNames: [],
      rooms: null,
      website: null,
    }) as unknown as BuildingData;

  const computeDirections = async () => {
    setDirError(null);

    const toName = dirTo.trim();
    if (!toName) {
      setDirError("Please enter a destination");
      return;
    }
    const fromName = dirFromMode === "building" ? dirFromBuilding.trim() : "";
    if (dirFromMode === "building" && !fromName) {
      setDirError("Please enter a starting location");
      return;
    }
    if (dirFromMode === "location" && !userLocation) {
      setDirError("Your location isn't available — pick a starting building instead");
      return;
    }

    setDirProcessing(true);
    try {
      // Match the names to actual buildings/parking lots
      const namesToMatch = fromName ? [fromName, toName] : [toName];
      const parsedClasses = namesToMatch.map((name) => ({
        id: Math.random().toString(36).substring(2, 9),
        courseCode: "",
        courseName: undefined,
        daysOfWeek: [],
        startTime: "",
        endTime: "",
        buildingRaw: name,
        roomRaw: "",
        rawText: name,
      }));

      const combinedBuildings: BuildingData[] = [
        ...buildings,
        ...parkingLotsData.map(parkingLotToBuildingData),
      ];
      const allPolygons = [...buildingPolygons, ...parkingPolygons];
      const results = matchAllClasses(parsedClasses, combinedBuildings);
      const unmatchedIndex = results.findIndex((r) => r.match === null);
      if (unmatchedIndex !== -1) {
        setDirError(
          `Could not find "${namesToMatch[unmatchedIndex]}" — try a different name`
        );
        setDirProcessing(false);
        return;
      }

      // Resolve coordinates (polygon center) for each matched place
      const resolveCoords = (
        match: NonNullable<(typeof results)[number]["match"]>
      ): [number, number] | null => {
        const polygon = allPolygons.find((p) => p.building_id === match.building.id);
        if (!polygon?.geojson) return null;
        try {
          return getCenterFromPolygon(polygon.geojson);
        } catch {
          return null;
        }
      };

      if (fromName) {
        const fromMatch = results[0].match!;
        const toMatch = results[1].match!;
        const fromCoords = resolveCoords(fromMatch);
        const toCoords = resolveCoords(toMatch);
        if (!fromCoords || !toCoords) {
          setDirError("Could not resolve those locations on the map");
          setDirProcessing(false);
          return;
        }
        const isParking = (m: typeof fromMatch) =>
          m.building.metaTags?.includes("parking");
        await navStartDirectionsBetween(
          { name: fromMatch.building.name, coordinates: fromCoords },
          {
            id: toMatch.building.id,
            kind: isParking(toMatch) ? "parking" : "building",
            name: toMatch.building.name,
            coordinates: toCoords,
          }
        );
      } else {
        const toMatch = results[0].match!;
        const toCoords = resolveCoords(toMatch);
        if (!toCoords) {
          setDirError("Could not resolve that destination on the map");
          setDirProcessing(false);
          return;
        }
        const isParking = toMatch.building.metaTags?.includes("parking");
        await navStartDirectionsTo({
          id: toMatch.building.id,
          kind: isParking ? "parking" : "building",
          name: toMatch.building.name,
          coordinates: toCoords,
        });
      }

      // Collapse the sidebar so the bottom card has visual focus
      setIsOpen(false);
    } catch (err) {
      setDirError(err instanceof Error ? err.message : "Failed to compute directions");
    } finally {
      setDirProcessing(false);
    }
  };

  const switchMode = (next: ScheduleMode) => {
    if (next === mode) return;
    // Clear the map so the other mode's route isn't left over
    clearScheduleRoute();
    navClearDirections();
    setDirError(null);
    setMatchResults(null);
    setError(null);
    setMode(next);
  };

  const processManualEntry = () => {
    const validEntries = buildingEntries.filter((e) => e.building.trim().length > 0);
    if (validEntries.length === 0) {
      setError("Please enter at least one building");
      return;
    }

    if (startFromParking && !selectedParkingLot) {
      setError("Please select a parking lot");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      computeRoute(
        validEntries,
        startFromParking && !!selectedParkingLot,
        startFromParking ? selectedParkingLot : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process entry");
    } finally {
      setIsProcessing(false);
    }
  };

  if (matchResults) {
    const validEntries = buildingEntries.filter((e) => e.building.trim().length > 0);
    const saveBuildingNames = validEntries.map((e) => e.building);
    const saveStartTimes = validEntries.map((e) => e.startTime);
    const saveEndTimes = validEntries.map((e) => e.endTime);
    const saveParkingLotName = startFromParking && selectedParkingLot ? selectedParkingLot : null;

    return (
      <ScheduleResult
        results={matchResults}
        onBack={handleBack}
        onNewSchedule={handleNewSchedule}
        user={user}
        buildingNames={saveBuildingNames}
        parkingLotName={saveParkingLotName}
        classStartTimes={saveStartTimes}
        classEndTimes={saveEndTimes}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("search")}
          className="button-depth group p-2 rounded-lg border border-transparent hover:border-highlight-hover hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 group-hover:text-white transition-colors duration-150 ease-out-2" />
        </button>
        <h2 className="text-xl font-semibold">Plan Your Route</h2>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 mb-4 bg-neutral-100 dark:bg-white/5 rounded-lg p-1">
        <button
          onClick={() => switchMode("schedule")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
            mode === "schedule"
              ? "bg-white dark:bg-[#363838] shadow-sm text-gray-900 dark:text-gray-100"
              : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          Class Route
        </button>
        <button
          onClick={() => switchMode("directions")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
            mode === "directions"
              ? "bg-white dark:bg-[#363838] shadow-sm text-gray-900 dark:text-gray-100"
              : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
          }`}
        >
          <RouteIcon className="w-3.5 h-3.5" />
          Quick Directions
        </button>
      </div>

      {mode === "directions" ? (
        <div className="flex-1 flex flex-col min-h-0">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
            Get walking directions between any two campus locations.
          </p>

          {/* From */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 uppercase tracking-wide">
              From
            </label>
            <div className="flex gap-1 mb-2 bg-neutral-100 dark:bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setDirFromMode("location")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  dirFromMode === "location"
                    ? "bg-white dark:bg-[#363838] shadow-sm text-gray-900 dark:text-gray-100"
                    : "text-gray-500 dark:text-neutral-400"
                }`}
              >
                <Navigation className="w-3 h-3" />
                My Location
              </button>
              <button
                onClick={() => setDirFromMode("building")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  dirFromMode === "building"
                    ? "bg-white dark:bg-[#363838] shadow-sm text-gray-900 dark:text-gray-100"
                    : "text-gray-500 dark:text-neutral-400"
                }`}
              >
                <MapPin className="w-3 h-3" />
                Pick a place
              </button>
            </div>
            {dirFromMode === "location" ? (
              <div
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium border ${
                  locationStatus === "granted"
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800/50 dark:text-blue-300"
                    : "bg-neutral-100 border-neutral-200 text-neutral-500 dark:bg-white/5 dark:border-white/10 dark:text-neutral-400"
                }`}
              >
                <Navigation
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    locationStatus === "granted" ? "text-blue-500 dark:text-blue-400" : "text-neutral-400"
                  }`}
                />
                {locationStatus === "granted" && "Using your live location"}
                {locationStatus === "denied" && "Location unavailable — switch to Pick a place"}
                {locationStatus === "pending" && "Getting your location..."}
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={dirFromBuilding}
                  onChange={(e) => setDirFromBuilding(e.target.value)}
                  placeholder="e.g., Student Union, Lot P10"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent text-sm bg-white dark:bg-[#2d2f2f] dark:text-neutral-100 dark:placeholder-neutral-500"
                  list="directions-from-suggestions"
                />
                <datalist id="directions-from-suggestions">
                  {getLocationSuggestions(dirFromBuilding).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </>
            )}
          </div>

          {/* To */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 uppercase tracking-wide">
              To
            </label>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-highlight text-white flex items-center justify-center flex-shrink-0">
                <Flag className="w-3 h-3" />
              </span>
              <input
                type="text"
                value={dirTo}
                onChange={(e) => setDirTo(e.target.value)}
                placeholder="Search for any building or parking"
                className="flex-1 px-3 py-2 border border-neutral-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent text-sm bg-white dark:bg-[#2d2f2f] dark:text-neutral-100 dark:placeholder-neutral-500"
                list="directions-to-suggestions"
              />
              <datalist id="directions-to-suggestions">
                {getLocationSuggestions(dirTo).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {dirError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{dirError}</span>
            </div>
          )}

          <button
            onClick={computeDirections}
            disabled={dirProcessing || !dirTo.trim()}
            className="button-depth w-full bg-highlight text-white py-2.5 rounded-xl border border-highlight-hover hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 font-medium text-sm"
          >
            {dirProcessing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Finding route...
              </>
            ) : (
              <>
                <RouteIcon className="w-4 h-4" />
                Get Directions
              </>
            )}
          </button>

        </div>
      ) : (<>

      {/* Location Status */}
      <div className={`mb-3 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium border ${
        locationStatus === "granted"
          ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800/50 dark:text-blue-300"
          : "bg-neutral-100 border-neutral-200 text-neutral-500 dark:bg-white/5 dark:border-white/10 dark:text-neutral-400"
      }`}>
        <Navigation className={`w-3.5 h-3.5 flex-shrink-0 ${locationStatus === "granted" ? "text-blue-500 dark:text-blue-400" : "text-neutral-400"}`} />
        {locationStatus === "granted" && "Using your live location as starting point"}
        {locationStatus === "denied" && "Location unavailable — route starts from first building"}
        {locationStatus === "pending" && "Getting your location..."}
      </div>

      {/* Saved Routes Section */}
      {savedRoutes.length > 0 && user && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl dark:bg-green-950/20 dark:border-green-800/40">
          <div className="flex items-center gap-2 mb-2.5">
            <BookMarked className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-800 dark:text-green-300">Saved Routes</span>
          </div>

          <div className="flex gap-1.5 mb-2">
            {DAYS_OF_WEEK.map((day) => {
              const hasSaved = savedRoutesByDay.has(day);
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? "bg-green-600 text-white shadow-sm"
                      : hasSaved
                        ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60"
                        : "bg-white border border-neutral-200 text-neutral-300 cursor-default dark:bg-white/5 dark:border-white/10 dark:text-neutral-600"
                  }`}
                  disabled={!hasSaved}
                >
                  {DAY_LABELS[day].short}
                  {hasSaved && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-green-50 dark:border-[#252626]" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedSavedRoute && (
            <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800/40">
              <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-0.5">
                {DAY_LABELS[selectedSavedRoute.dayOfWeek].full}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mb-2.5 truncate">
                {selectedSavedRoute.buildingNames.join(" → ")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLoadSavedRoute(selectedSavedRoute)}
                  disabled={isProcessing}
                  className="flex-1 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Load Route
                </button>
                <button
                  onClick={() => handleDeleteSavedRoute(selectedSavedRoute.dayOfWeek)}
                  disabled={isDeleting}
                  className="py-1.5 px-3 border text-red-500 border-red-200 rounded-lg hover:bg-red-50 dark:border-red-800/50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Manual Entry */}
      <div className="flex-1 flex flex-col min-h-0">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
          Enter the buildings you need to visit in order. Start typing for suggestions.
        </p>

        {/* Parking Lot Option */}
        <div className="mb-3 p-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={startFromParking}
              onChange={(e) => setStartFromParking(e.target.checked)}
              className="w-4 h-4 rounded text-highlight focus:ring-highlight accent-highlight"
            />
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Start from parking lot
            </span>
          </label>
          {startFromParking && (
            <select
              value={selectedParkingLot}
              onChange={(e) => setSelectedParkingLot(e.target.value)}
              className="mt-2.5 w-full px-3 py-2 border border-neutral-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-sm bg-white dark:bg-[#2d2f2f] dark:text-neutral-200"
            >
              <option value="">Select a parking lot</option>
              {parkingLots.map((lot) => (
                <option key={lot} value={lot}>
                  {lot}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto px-0.5 py-1">
          {buildingEntries.map((entry, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-highlight text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={entry.building}
                  onChange={(e) => updateBuildingEntry(index, "building", e.target.value)}
                  placeholder="e.g., McKee-Fisk, Science 1, Peters Business"
                  className="flex-1 px-3 py-2 border border-neutral-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent text-sm bg-white dark:bg-[#2d2f2f] dark:text-neutral-100 dark:placeholder-neutral-500"
                  list={`suggestions-${index}`}
                />
                <datalist id={`suggestions-${index}`}>
                  {getSuggestions(entry.building).map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
                {buildingEntries.length > 1 && (
                  <button
                    onClick={() => removeBuildingEntry(index)}
                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 pl-8">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs text-neutral-400 whitespace-nowrap">Start</span>
                  <input
                    type="time"
                    value={entry.startTime}
                    onChange={(e) => updateBuildingEntry(index, "startTime", e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-neutral-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent text-sm bg-white dark:bg-[#2d2f2f] dark:text-neutral-200"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs text-neutral-400 whitespace-nowrap">End</span>
                  <input
                    type="time"
                    value={entry.endTime}
                    onChange={(e) => updateBuildingEntry(index, "endTime", e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-neutral-300 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent text-sm bg-white dark:bg-[#2d2f2f] dark:text-neutral-200"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addBuildingEntry}
          className="mt-3 w-full py-2 border-2 border-dashed border-neutral-300 dark:border-white/15 rounded-lg text-neutral-400 dark:text-neutral-500 hover:border-highlight hover:text-highlight dark:hover:border-highlight dark:hover:text-highlight transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Another Building
        </button>

        <button
          onClick={processManualEntry}
          disabled={buildingEntries.every((e) => e.building.trim().length === 0) || isProcessing}
          className="button-depth mt-4 w-full bg-highlight text-white py-3 rounded-xl border border-highlight-hover hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 font-medium"
        >
          {isProcessing ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : buildingEntries.some((e) => e.building.trim().length > 0) ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Show Route Again
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              Create Route
            </>
          )}
        </button>

        {buildingEntries.some((e) => e.building.trim().length > 0) && (
          <button
            onClick={handleNewSchedule}
            className="mt-2 w-full py-2 border border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-400 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors text-sm"
          >
            New Schedule
          </button>
        )}
      </div>
      </>)}
    </div>
  );
}
