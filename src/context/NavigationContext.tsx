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
import {
  NavigationResult,
  NavigationStep,
} from "@/utils/pathfinding/mapboxDirections";
import { getNavigationRouteAvoidingZones } from "@/utils/pathfinding/navigationPlanner";
import { haversineDistance } from "@/utils/pathfinding/geoUtils";
import { useMapContext } from "./MapContext";

export type Destination = {
  id: string; // building/event id
  kind: "building" | "event" | "parking";
  name: string;
  coordinates: [number, number];
};

export type NavOrigin = {
  name: string;
  coordinates: [number, number];
} | null;

type NavigationContextType = {
  origin: NavOrigin;
  destination: Destination | null;
  route: NavigationResult | null;
  isPreviewing: boolean;
  isNavigating: boolean;
  currentStepIndex: number;
  distanceToNextManeuver: number | null;
  simulated: boolean;
  loading: boolean;
  error: string | null;
  startDirectionsTo: (dest: Destination) => Promise<void>;
  startDirectionsBetween: (
    origin: { name: string; coordinates: [number, number] },
    dest: Destination
  ) => Promise<void>;
  startMultiStopNavigation: (
    stops: { id: string; name: string; coordinates: [number, number] }[],
    fromUserLocation: boolean
  ) => Promise<void>;
  clearDirections: () => void;
  startNavigation: () => void;
  endNavigation: () => void;
  toggleSimulation: () => void;
  recenter: () => void;
  requestCenterPulse: number; // increments to signal MapTest to recenter
};

const NavigationContext = createContext<NavigationContextType | null>(null);

const ARRIVE_RADIUS_M = 15; // meters — auto-advance when within this of maneuver
const ARRIVE_DEST_RADIUS_M = 8;

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const {
    userLocation,
    setScheduleRoute,
    clearScheduleRoute,
    buildings,
    parkingLots,
    buildingPolygons,
    parkingPolygons,
    constructionZones,
  } = useMapContext();

  const [origin, setOrigin] = useState<NavOrigin>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [route, setRoute] = useState<NavigationResult | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulated, setSimulated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestCenterPulse, setRequestCenterPulse] = useState(0);

  const isPreviewing = destination !== null && route !== null && !isNavigating;

  // Keep latest setScheduleRoute in a ref so we don't have to depend on its identity
  const setScheduleRouteRef = useRef(setScheduleRoute);
  useEffect(() => {
    setScheduleRouteRef.current = setScheduleRoute;
  }, [setScheduleRoute]);

  const pushRouteToMap = useCallback(
    (navRoute: NavigationResult) => {
      setScheduleRouteRef.current(
        {
          stops: [],
          totalDistance: navRoute.distance,
          totalWalkTime: navRoute.duration / 60,
          segments: [
            {
              coordinates: navRoute.coordinates,
              totalDistance: navRoute.distance,
              totalWalkTime: navRoute.duration / 60,
              path: [],
              segments: [],
            },
          ],
        },
        null
      );
    },
    []
  );

  const startDirectionsTo = useCallback(
    async (dest: Destination) => {
      setError(null);
      setLoading(true);
      try {
        if (!userLocation) {
          setError("Your location isn't available yet — please enable location access");
          setDestination(null);
          setRoute(null);
          return;
        }
        setOrigin(null);
        setDestination(dest);
        setCurrentStepIndex(0);
        const navRoute = await getNavigationRouteAvoidingZones(
          [
            { coords: userLocation },
            { coords: dest.coordinates, buildingId: dest.id },
          ],
          buildings,
          parkingLots,
          buildingPolygons,
          parkingPolygons,
          constructionZones
        );
        if (!navRoute) {
          setError("Could not find a walking route to this place");
          setRoute(null);
          return;
        }
        setRoute(navRoute);
        pushRouteToMap(navRoute);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch directions");
      } finally {
        setLoading(false);
      }
    },
    [
      userLocation,
      pushRouteToMap,
      buildings,
      parkingLots,
      buildingPolygons,
      parkingPolygons,
      constructionZones,
    ]
  );

  const startDirectionsBetween = useCallback(
    async (
      originLoc: { name: string; coordinates: [number, number] },
      dest: Destination
    ) => {
      setError(null);
      setLoading(true);
      try {
        setOrigin(originLoc);
        setDestination(dest);
        setCurrentStepIndex(0);
        const navRoute = await getNavigationRouteAvoidingZones(
          [
            { coords: originLoc.coordinates },
            { coords: dest.coordinates, buildingId: dest.id },
          ],
          buildings,
          parkingLots,
          buildingPolygons,
          parkingPolygons,
          constructionZones
        );
        if (!navRoute) {
          setError("Could not find a walking route between those points");
          setRoute(null);
          return;
        }
        setRoute(navRoute);
        pushRouteToMap(navRoute);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch directions");
      } finally {
        setLoading(false);
      }
    },
    [
      pushRouteToMap,
      buildings,
      parkingLots,
      buildingPolygons,
      parkingPolygons,
      constructionZones,
    ]
  );

  const startMultiStopNavigation = useCallback(
    async (
      stops: { id: string; name: string; coordinates: [number, number] }[],
      fromUserLocation: boolean
    ) => {
      setError(null);
      setLoading(true);
      try {
        if (stops.length === 0) {
          setError("No stops to navigate to");
          return;
        }
        if (fromUserLocation && !userLocation) {
          setError("Your location isn't available yet — enable location access");
          return;
        }
        const segmentInputs: { coords: [number, number]; buildingId?: string }[] =
          fromUserLocation && userLocation
            ? [
                { coords: userLocation },
                ...stops.map((s) => ({ coords: s.coordinates, buildingId: s.id })),
              ]
            : stops.map((s) => ({ coords: s.coordinates, buildingId: s.id }));

        if (segmentInputs.length < 2) {
          setError("Need at least two stops to navigate");
          return;
        }

        const finalStop = stops[stops.length - 1];
        setOrigin(
          fromUserLocation
            ? null
            : { name: stops[0].name, coordinates: stops[0].coordinates }
        );
        setDestination({
          id: finalStop.id,
          kind: "building",
          name: finalStop.name,
          coordinates: finalStop.coordinates,
        });
        setCurrentStepIndex(0);

        const navRoute = await getNavigationRouteAvoidingZones(
          segmentInputs,
          buildings,
          parkingLots,
          buildingPolygons,
          parkingPolygons,
          constructionZones
        );
        if (!navRoute) {
          setError("Could not build a walking route through those stops");
          setRoute(null);
          return;
        }
        setRoute(navRoute);
        pushRouteToMap(navRoute);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch route");
      } finally {
        setLoading(false);
      }
    },
    [
      userLocation,
      pushRouteToMap,
      buildings,
      parkingLots,
      buildingPolygons,
      parkingPolygons,
      constructionZones,
    ]
  );

  const clearDirections = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setRoute(null);
    setCurrentStepIndex(0);
    setIsNavigating(false);
    setSimulated(false);
    setError(null);
    clearScheduleRoute();
  }, [clearScheduleRoute]);

  const startNavigation = useCallback(() => {
    if (!route) return;
    setCurrentStepIndex(0);
    setIsNavigating(true);
    setRequestCenterPulse((p) => p + 1);
  }, [route]);

  const endNavigation = useCallback(() => {
    setIsNavigating(false);
    setSimulated(false);
  }, []);

  const toggleSimulation = useCallback(() => {
    setSimulated((s) => !s);
  }, []);

  const recenter = useCallback(() => {
    setRequestCenterPulse((p) => p + 1);
  }, []);

  // Simulated walker: advance a virtual user along the route and update context userLocation
  const { setUserLocation } = useMapContext();
  const simStateRef = useRef<{ segIdx: number; segT: number } | null>(null);
  useEffect(() => {
    if (!simulated || !isNavigating || !route) return;
    const coords = route.coordinates;
    if (coords.length < 2) return;
    simStateRef.current = { segIdx: 0, segT: 0 };
    const intervalMs = 300;
    // Simulated walking at ~1.4 m/s (normal) * 8x speed for demo
    const speedMps = 1.4 * 8;
    const tick = setInterval(() => {
      const st = simStateRef.current;
      if (!st) return;
      if (st.segIdx >= coords.length - 1) {
        clearInterval(tick);
        return;
      }
      const a = coords[st.segIdx];
      const b = coords[st.segIdx + 1];
      const segLen = haversineDistance(a, b);
      const stepMeters = speedMps * (intervalMs / 1000);
      const stepT = segLen > 0 ? stepMeters / segLen : 1;
      st.segT += stepT;
      while (st.segT >= 1 && st.segIdx < coords.length - 1) {
        st.segT -= 1;
        st.segIdx += 1;
      }
      const fromIdx = Math.min(st.segIdx, coords.length - 2);
      const aa = coords[fromIdx];
      const bb = coords[fromIdx + 1];
      const t = Math.min(Math.max(st.segT, 0), 1);
      const lng = aa[0] + (bb[0] - aa[0]) * t;
      const lat = aa[1] + (bb[1] - aa[1]) * t;
      setUserLocation([lng, lat]);
    }, intervalMs);
    return () => clearInterval(tick);
  }, [simulated, isNavigating, route, setUserLocation]);

  // Step advancement + distance to next maneuver
  const distanceToNextManeuver = useMemo(() => {
    if (!isNavigating || !route || !userLocation) return null;
    const step = route.steps[currentStepIndex];
    if (!step) return null;
    return haversineDistance(userLocation, step.maneuverLocation);
  }, [isNavigating, route, userLocation, currentStepIndex]);

  useEffect(() => {
    if (!isNavigating || !route || !userLocation) return;
    const step = route.steps[currentStepIndex];
    if (!step) return;
    const dist = haversineDistance(userLocation, step.maneuverLocation);
    // Advance step
    if (dist < ARRIVE_RADIUS_M && currentStepIndex < route.steps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    }
    // Arrived at destination
    if (destination && currentStepIndex === route.steps.length - 1) {
      const distToDest = haversineDistance(userLocation, destination.coordinates);
      if (distToDest < ARRIVE_DEST_RADIUS_M) {
        // Keep nav screen but mark complete by setting step to final; UI reads "You have arrived"
      }
    }
  }, [isNavigating, route, userLocation, currentStepIndex, destination]);

  const value: NavigationContextType = {
    origin,
    destination,
    route,
    isPreviewing,
    isNavigating,
    currentStepIndex,
    distanceToNextManeuver,
    simulated,
    loading,
    error,
    startDirectionsTo,
    startDirectionsBetween,
    startMultiStopNavigation,
    clearDirections,
    startNavigation,
    endNavigation,
    toggleSimulation,
    recenter,
    requestCenterPulse,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return ctx;
}

export type { NavigationStep };
