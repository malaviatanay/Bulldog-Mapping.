"use client";

import { useRef, useState, useEffect } from "react";
import { createRoot, Root } from "react-dom/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useMapContext } from "@/context/MapContext";
import { useSidebar } from "@/context/SidebarContext";
import EventMarker from "./EventMarker";
import RouteMarker, { SimpleRouteMarker } from "./schedule/RouteMarker";
import { Tables } from "@/types/supabase";
import { buildRouteGeoJSON } from "@/utils/pathfinding/routePlanner";
import { getMultiStopWalkingRoute } from "@/utils/pathfinding/mapboxDirections";
import { Feature, Polygon } from "geojson";
import { X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

type Event = Tables<"event">;

const INTITIAL_CENTER: [number, number] = [-119.74784, 36.81226];
const INITIAL_ZOOM = 15;
const LIGHT_STYLE = "mapbox://styles/mapbox/standard";
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const DETAIL_ZOOM_THRESHOLD = 18; // Zoom level for simple vs detailed markers

// map will take building and polygon data and event data as props =)
export default function MapTest() {
  const mapRef = useRef<mapboxgl.Map>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ marker: mapboxgl.Marker; root: Root }[]>([]);
  const routeMarkersRef = useRef<{ marker: mapboxgl.Marker; root: Root }[]>([]);
  const drawRef = useRef<MapboxDraw | null>(null);
  const constructionPopupRef = useRef<mapboxgl.Popup | null>(null);
  const {
    buildings,
    events,
    buildingPolygons,
    constructionZones,
    setSelectedBuilding,
    setSelectedEvent,
    flyToTarget,
    scheduleRoute,
    highlightRouteStop,
    clearScheduleRoute,
    drawingMode,
    setDrawnPolygon,
    stopDrawing,
    ...sdbr
  } = useMapContext();
  const { setView, setIsOpen } = useSidebar();
  const { resolvedTheme: theme } = useTheme();

  const [center, setCenter] = useState<[number, number]>(INTITIAL_CENTER);
  const [zoom, setZoom] = useState<number>(INITIAL_ZOOM);
  const [isSimpleView, setIsSimpleView] = useState<boolean>(
    INITIAL_ZOOM < DETAIL_ZOOM_THRESHOLD
  );
  // Track when map is fully loaded and ready for layer operations
  const [mapReady, setMapReady] = useState(false);

  // Handler for event clicks (called from EventMarker component)
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setView("event");
    setIsOpen(true);

    // Fly to the event location
    if (mapRef.current)
      mapRef.current.flyTo({
        center: [event.longitude, event.latitude],
        zoom: 17,
        duration: 1000,
        essential: true,
      });
  };

  // Initialize the map (runs once)
  useEffect(() => {
    mapContainerRef.current?.setAttribute("data-loading", "true");
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: theme === "dark" ? DARK_STYLE : LIGHT_STYLE,
      center: INTITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });

    mapRef.current.on("move", () => {
      if (mapRef.current) {
        const mapCenter = mapRef.current.getCenter();
        const mapZoom = mapRef.current.getZoom();
        setCenter([mapCenter.lng, mapCenter.lat]);
        setZoom(mapZoom);
        setIsSimpleView(mapZoom < DETAIL_ZOOM_THRESHOLD);
      }
    });

    mapRef.current.on("load", () => {
      if (!mapRef.current) return;

      // Add building polygons source
      mapRef.current.addSource("buildings", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: buildingPolygons.map((polygon) => {
            const feature = polygon.geojson as unknown as GeoJSON.Feature;
            return {
              type: "Feature",
              id: polygon.building_id,
              geometry: feature.geometry,
              properties: {
                ...(feature.properties || {}),
                buildingId: polygon.building_id,
              },
            };
          }),
        },
      });

      // Add fill layer (colored building polygons)
      mapRef.current.addLayer({
        id: "buildings-fill",
        type: "fill",
        source: "buildings",
        paint: {
          "fill-color": theme === "dark" ? "#1e4a7a" : "#088",
          "fill-opacity": theme === "dark" ? 0.5 : 0.5,
        },
      });

      // Add outline layer
      mapRef.current.addLayer({
        id: "buildings-outline",
        type: "line",
        source: "buildings",
        paint: {
          "line-color": theme === "dark" ? "#3a78b8" : "#000",
          "line-width": theme === "dark" ? 1.5 : 1,
        },
      });

      // Change cursor on hover for buildings
      mapRef.current.on("mouseenter", "buildings-fill", () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = "pointer";
        }
      });

      mapRef.current.on("mouseleave", "buildings-fill", () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = "";
        }
      });

      mapContainerRef.current?.setAttribute("data-loading", "false");

      // Signal that the map is fully loaded and ready for layer operations
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, [buildingPolygons]);

  // Switch map style when theme changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const newStyle = theme === "dark" ? DARK_STYLE : LIGHT_STYLE;

    map.once("style.load", () => {
      // Re-add building polygons after style swap
      if (!map.getSource("buildings")) {
        map.addSource("buildings", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: buildingPolygons.map((polygon) => {
              const feature = polygon.geojson as unknown as GeoJSON.Feature;
              return {
                type: "Feature",
                id: polygon.building_id,
                geometry: feature.geometry,
                properties: {
                  ...(feature.properties || {}),
                  buildingId: polygon.building_id,
                },
              };
            }),
          },
        });
      }

      if (!map.getLayer("buildings-fill")) {
        map.addLayer({
          id: "buildings-fill",
          type: "fill",
          source: "buildings",
          paint: {
            "fill-color": theme === "dark" ? "#1e4a7a" : "#088",
            "fill-opacity": theme === "dark" ? 0.5 : 0.5,
          },
        });
      }

      if (!map.getLayer("buildings-outline")) {
        map.addLayer({
          id: "buildings-outline",
          type: "line",
          source: "buildings",
          paint: {
            "line-color": theme === "dark" ? "#2a4a6e" : "#000",
            "line-width": theme === "dark" ? 1.5 : 1,
          },
        });
      }
    });

    map.setStyle(newStyle);
  }, [theme, mapReady, buildingPolygons]);

  // Handle click events based on mapPointerEvents mode
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const queryAndOpenBuilding = (point: mapboxgl.Point) => {
      if (!mapRef.current) return;
      const hitbox = 20;
      const features = mapRef.current.queryRenderedFeatures(
        [
          [point.x - hitbox, point.y - hitbox],
          [point.x + hitbox, point.y + hitbox],
        ],
        { layers: ["buildings-fill"] }
      );
      if (features.length === 0) return;
      const feature = features[0];
      const buildingId = feature.properties?.buildingId;
      if (!buildingId) return;
      const building = buildings.find((b) => b.id === buildingId);
      if (!building) return;

      setSelectedBuilding(building);
      setView("building");
      setIsOpen(true);

      const bounds = new mapboxgl.LngLatBounds();
      if (feature.geometry.type === "Polygon") {
        (feature.geometry.coordinates[0] as number[][]).forEach((coord) =>
          bounds.extend(coord as [number, number])
        );
      } else if (feature.geometry.type === "MultiPolygon") {
        (feature.geometry.coordinates as number[][][][]).forEach((polygon) =>
          polygon[0].forEach((coord) => bounds.extend(coord as [number, number]))
        );
      }
      if (bounds._ne && bounds._sw)
        mapRef.current.flyTo({ center: bounds.getCenter(), zoom: 17, duration: 1000, essential: true });
    };

    // Unified click handler (desktop + Mapbox synthetic click from touch)
    const handleMapClickWithBuilding = (e: mapboxgl.MapMouseEvent) => {
      if (sdbr.mapPointerEvents === "dropPin") {
        sdbr.setLastClickedCords([e.lngLat.lat, e.lngLat.lng]);
        return;
      }
      queryAndOpenBuilding(e.point);
    };

    // Mobile tap detection — always registered so taps work in all modes
    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: mapboxgl.MapTouchEvent) => {
      touchStartX = e.point.x;
      touchStartY = e.point.y;
    };
    const handleTouchEnd = (e: mapboxgl.MapTouchEvent) => {
      const dx = e.point.x - touchStartX;
      const dy = e.point.y - touchStartY;
      const moved = Math.sqrt(dx * dx + dy * dy);
      if (moved >= 10) return; // pan, not a tap
      if (sdbr.mapPointerEvents === "dropPin") {
        sdbr.setLastClickedCords([e.lngLat.lat, e.lngLat.lng]);
      } else {
        queryAndOpenBuilding(e.point);
      }
    };

    mapRef.current.on("click", handleMapClickWithBuilding);
    mapRef.current.on("touchstart", handleTouchStart);
    mapRef.current.on("touchend", handleTouchEnd);
    mapRef.current.getCanvas().style.cursor = sdbr.mapPointerEvents === "dropPin" ? "crosshair" : "";

    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", handleMapClickWithBuilding);
        mapRef.current.off("touchstart", handleTouchStart);
        mapRef.current.off("touchend", handleTouchEnd);
        mapRef.current.getCanvas().style.cursor = "";
      }
    };
  }, [
    mapReady,
    sdbr,
    buildings,
    events,
    setSelectedBuilding,
    setSelectedEvent,
    setView,
    setIsOpen,
  ]);

  // Handle flyTo from context
  useEffect(() => {
    if (!mapRef.current || !flyToTarget) return;

    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: flyToTarget.zoom ?? 17,
      duration: 1000,
      essential: true,
    });
  }, [flyToTarget]);

  // Construction zones visualization - only runs when map is ready
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;

      // Remove existing layers and source
      try {
        if (map.getLayer("construction-zones-fill")) map.removeLayer("construction-zones-fill");
        if (map.getLayer("construction-zones-outline")) map.removeLayer("construction-zones-outline");
        if (map.getSource("construction-zones")) map.removeSource("construction-zones");
      } catch (e) {
        console.warn("Error cleaning up construction zone layers:", e);
      }

      const zonesToRender = constructionZones.filter(
        (zone) => zone.isActive && zone.isApproved
      );

      if (zonesToRender.length === 0) return;

      try {
        map.addSource("construction-zones", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: zonesToRender.map((zone) => ({
              type: "Feature" as const,
              id: zone.id,
              geometry: zone.geojson.geometry,
              properties: {
                name: zone.name,
                description: zone.description,
                startDate: zone.startDate,
                endDate: zone.endDate,
              },
            })),
          },
        });

        map.addLayer({
          id: "construction-zones-fill",
          type: "fill",
          source: "construction-zones",
          paint: {
            "fill-color": "#ff4444",
            "fill-opacity": 0.3,
          },
        });

        map.addLayer({
          id: "construction-zones-outline",
          type: "line",
          source: "construction-zones",
          paint: {
            "line-color": "#ff0000",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        });

        // Helper to build popup HTML from zone properties
        const buildPopupHTML = (props: Record<string, unknown>) => {
          const name = (props?.name as string) ?? "Construction Zone";
          const description = (props?.description as string) ?? null;
          const startDate = props?.startDate ? new Date(props.startDate as string).toLocaleDateString() : null;
          const endDate = props?.endDate ? new Date(props.endDate as string).toLocaleDateString() : null;
          const dateLine = startDate && endDate
            ? `<p style="margin:4px 0 0;color:#b45309;font-size:11px;">📅 ${startDate} – ${endDate}</p>`
            : startDate
              ? `<p style="margin:4px 0 0;color:#b45309;font-size:11px;">📅 Started ${startDate}</p>`
              : "";
          return `
            <div style="font-family:sans-serif;max-width:220px;padding:4px 2px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <span style="font-size:20px;">🚧</span>
                <strong style="font-size:13px;color:#dc2626;">Construction Zone</strong>
              </div>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1f2937;">${name}</p>
              ${description ? `<p style="margin:4px 0 0;font-size:12px;color:#4b5563;">${description}</p>` : ""}
              ${dateLine}
            </div>
          `;
        };

        // Track whether the popup was pinned by a click (vs just hover)
        let isPinned = false;

        // Hover → show popup (desktop)
        map.on("mouseenter", "construction-zones-fill", (e) => {
          map.getCanvas().style.cursor = "pointer";
          if (!e.features || e.features.length === 0 || isPinned) return;
          const html = buildPopupHTML(e.features[0].properties as Record<string, unknown>);
          if (constructionPopupRef.current) constructionPopupRef.current.remove();
          constructionPopupRef.current = new mapboxgl.Popup({ closeButton: false, maxWidth: "260px" })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
        });

        // Mouse leave → close hover popup (unless pinned by click)
        map.on("mouseleave", "construction-zones-fill", () => {
          map.getCanvas().style.cursor = "";
          if (!isPinned && constructionPopupRef.current) {
            constructionPopupRef.current.remove();
            constructionPopupRef.current = null;
          }
        });

        // Click → pin popup open (mobile tap + desktop click to keep open)
        map.on("click", "construction-zones-fill", (e) => {
          if (!e.features || e.features.length === 0) return;
          isPinned = true;
          const html = buildPopupHTML(e.features[0].properties as Record<string, unknown>);
          if (constructionPopupRef.current) constructionPopupRef.current.remove();
          constructionPopupRef.current = new mapboxgl.Popup({ closeButton: true, maxWidth: "260px" })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
          constructionPopupRef.current.on("close", () => { isPinned = false; });
        });
      } catch (e) {
        console.error("Error rendering construction zones:", e);
      }
    };

    // Wait for style to be loaded before adding layers
    const waitAndRun = () => {
      if (cancelled) return;
      if (map.isStyleLoaded()) {
        run();
      } else {
        // Poll until style is loaded (handles HMR and race conditions)
        setTimeout(waitAndRun, 100);
      }
    };

    waitAndRun();

    return () => { cancelled = true; };
  }, [constructionZones, mapReady]);

  // Mapbox GL Draw integration for drawing construction zones
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;

    // Initialize draw control if not already done
    if (!drawRef.current) {
      drawRef.current = new MapboxDraw({
        displayControlsDefault: false,
        defaultMode: "simple_select",
      });
      map.addControl(drawRef.current as unknown as mapboxgl.IControl, "top-right");

      // Listen for when a polygon is created
      map.on("draw.create", (e: { features: GeoJSON.Feature[] }) => {
        const features = e.features;
        if (features && features.length > 0) {
          const feature = features[0];
          if (feature.geometry.type === "Polygon") {
            const polygon: Feature<Polygon> = {
              type: "Feature",
              geometry: feature.geometry,
              properties: feature.properties || {},
            };
            setDrawnPolygon(polygon);
            stopDrawing();
          }
        }
      });
    }

    // Show/hide draw control based on drawing mode
    const drawControl = drawRef.current;
    if (drawControl) {
      try {
        if (drawingMode.isActive) {
          drawControl.changeMode("draw_polygon");
        } else {
          drawControl.changeMode("simple_select");
          drawControl.deleteAll();
        }
      } catch (e) {
        console.warn("Error changing draw mode:", e);
      }
    }
  }, [drawingMode, mapReady, setDrawnPolygon, stopDrawing]);

  // Handle schedule route visualization - only runs when map is ready
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;

    // Clear existing route markers
    const oldRouteMarkers = routeMarkersRef.current;
    routeMarkersRef.current = [];
    setTimeout(() => {
      oldRouteMarkers.forEach(({ marker, root }) => {
        root.unmount();
        marker.remove();
      });
    }, 0);

    let cancelled = false;

    // Remove existing route layers and source if they exist
    const cleanupRouteLayers = () => {
      try {
        if (map.getLayer("schedule-route-line")) map.removeLayer("schedule-route-line");
        if (map.getLayer("schedule-route-casing")) map.removeLayer("schedule-route-casing");
        if (map.getSource("schedule-route")) map.removeSource("schedule-route");
      } catch (e) {
        console.warn("Error cleaning up route layers:", e);
      }
    };

    if (map.isStyleLoaded()) {
      cleanupRouteLayers();
    }

    // If no route or not visible, we're done
    if (!scheduleRoute.route || !scheduleRoute.isVisible) return;

    const { route } = scheduleRoute;

    // Fetch actual walking directions from Mapbox
    const fetchWalkingRoute = async () => {
      if (route.stops.length < 2) return;

      const waypoints = route.stops.map((stop) => stop.coordinates);

      // Check for invalid coordinates
      const hasInvalidCoords = waypoints.some(
        (wp) => !wp || wp[0] === 0 || wp[1] === 0 || isNaN(wp[0]) || isNaN(wp[1])
      );

      if (hasInvalidCoords) {
        console.warn("Invalid coordinates detected:", waypoints);
        return;
      }

      try {
        const result = await getMultiStopWalkingRoute(waypoints);

        if (result && result.coordinates.length > 0) {
          // Update map source with actual walking route
          if (map.getSource("schedule-route")) {
            (map.getSource("schedule-route") as mapboxgl.GeoJSONSource).setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: {
                    distance: result.distance,
                    duration: result.duration,
                  },
                  geometry: {
                    type: "LineString",
                    coordinates: result.coordinates,
                  },
                },
              ],
            });
          }
          return;
        }
      } catch (error) {
        console.error("Could not fetch walking directions:", error);
      }

      // Fallback to straight lines if Mapbox Directions fails
      const routeGeoJSON = buildRouteGeoJSON(route);
      if (map.getSource("schedule-route")) {
        (map.getSource("schedule-route") as mapboxgl.GeoJSONSource).setData(routeGeoJSON);
      }
    };

    const addRouteLayers = () => {
      cleanupRouteLayers();
      try {
        const routeGeoJSON = buildRouteGeoJSON(route);

        map.addSource("schedule-route", {
          type: "geojson",
          data: routeGeoJSON,
        });

        fetchWalkingRoute();

        map.addLayer({
          id: "schedule-route-casing",
          type: "line",
          source: "schedule-route",
          paint: {
            "line-color": "#dc2626",
            "line-width": 8,
            "line-opacity": 0.3,
          },
        });

        map.addLayer({
          id: "schedule-route-line",
          type: "line",
          source: "schedule-route",
          paint: {
            "line-color": "#dc2626",
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });
      } catch (e) {
        console.error("Error rendering schedule route:", e);
      }
    };

    const waitAndAddLayers = () => {
      if (cancelled) return;
      if (map.isStyleLoaded()) {
        addRouteLayers();
      } else {
        setTimeout(waitAndAddLayers, 100);
      }
    };

    waitAndAddLayers();

    // Add markers for each stop
    route.stops.forEach((stop, index) => {
      // Skip stops with invalid coordinates
      if (!stop.coordinates || stop.coordinates[0] === 0 || stop.coordinates[1] === 0) {
        console.warn("Skipping stop with invalid coordinates:", stop);
        return;
      }

      const el = document.createElement("div");
      el.className = "route-marker";
      el.style.pointerEvents = "auto";

      const isStart = index === 0;
      const isEnd = index === route.stops.length - 1;
      const isHighlighted = scheduleRoute.highlightedStop === index;

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat(stop.coordinates)
        .addTo(map);

      const root = createRoot(el);

      if (isSimpleView) {
        root.render(
          <SimpleRouteMarker stop={stop} isStart={isStart} isEnd={isEnd} />
        );
      } else {
        root.render(
          <RouteMarker
            stop={stop}
            isStart={isStart}
            isEnd={isEnd}
            isHighlighted={isHighlighted}
            onClick={() => {
              highlightRouteStop(index);
              map.flyTo({
                center: stop.coordinates,
                zoom: 17,
                duration: 1000,
              });
            }}
          />
        );
      }

      routeMarkersRef.current.push({ marker, root });
    });

    // Cleanup
    return () => {
      cancelled = true;
      const markers = routeMarkersRef.current;
      setTimeout(() => {
        markers.forEach(({ marker, root }) => {
          root.unmount();
          marker.remove();
        });
      }, 0);
    };
  }, [scheduleRoute, isSimpleView, highlightRouteStop, mapReady]);

  // Add/update event markers when events or view mode changes
  useEffect(() => {
    if (!mapRef.current || !events) return;

    // Clear existing markers (defer unmount to avoid race condition)
    const oldMarkers = markersRef.current;
    markersRef.current = [];

    setTimeout(() => {
      oldMarkers.forEach(({ marker, root }) => {
        root.unmount();
        marker.remove();
      });
    }, 0);

    // Add new markers for approved events only
    events
      .filter((event) => {
        const now = new Date();
        const eventEnd = event.dateEnd ? new Date(event.dateEnd) : null;
        let isPast = true;
        if (eventEnd) {
          isPast = now > eventEnd;
        }
        return event.isApproved && !isPast;
      })
      .forEach((event) => {
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.pointerEvents = "auto";

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: isSimpleView ? "center" : "top",
        })
          .setLngLat([event.longitude, event.latitude])
          .addTo(mapRef.current!);

        const root = createRoot(el);
        root.render(
          <EventMarker
            event={event}
            onClick={() => handleEventClick(event)}
            isSimple={isSimpleView}
          />
        );

        markersRef.current.push({ marker, root });
      });

    return () => {
      const markers = markersRef.current;
      setTimeout(() => {
        markers.forEach(({ marker, root }) => {
          root.unmount();
          marker.remove();
        });
      }, 0);
      markersRef.current = [];
    };
  }, [events, isSimpleView, setSelectedEvent, setView, setIsOpen]);

  return (
    <div className="absolute w-full h-full left-0 right-0 bottom-0">
      <div
        ref={mapContainerRef}
        data-loading="true"
        id="map-container"
        className="animate-map-intro absolute w-full h-full left-0 right-0 bottom-0"
      ></div>
      {scheduleRoute.route && (
        <button
          onClick={clearScheduleRoute}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-full shadow-lg hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <X className="w-4 h-4" />
          Clear Route
        </button>
      )}
    </div>
  );
}
