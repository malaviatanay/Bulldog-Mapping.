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

// Apply Google Maps-style dark palette to base map layers (land, water, buildings only — not roads)
function applyDarkMapPalette(map: mapboxgl.Map) {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const id = layer.id;
    try {
      if (layer.type === "background") {
        map.setPaintProperty(id, "background-color", "#1a2632");
      } else if (layer.type === "fill") {
        if (/water/.test(id)) {
          map.setPaintProperty(id, "fill-color", "#144043");
        } else if (/^(land|national-park|landuse|aeroway|pitch|grass|scrub|sand)/.test(id)) {
          map.setPaintProperty(id, "fill-color", "#1a2632");
        }
      } else if (layer.type === "line") {
        if (/water/.test(id)) {
          map.setPaintProperty(id, "line-color", "#144043");
        }
      }
    } catch { /* some layers don't support all paint properties */ }
  }
}
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
  const pendingMarkerRef = useRef<mapboxgl.Marker | null>(null);
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
    pendingEventMarker,
    ...sdbr
  } = useMapContext();
  const { setView, setIsOpen } = useSidebar();
  const { resolvedTheme: theme } = useTheme();
  const constructionZonesRef = useRef(constructionZones);

  const [center, setCenter] = useState<[number, number]>(INTITIAL_CENTER);
  const [zoom, setZoom] = useState<number>(INITIAL_ZOOM);
  const [isSimpleView, setIsSimpleView] = useState<boolean>(
    INITIAL_ZOOM < DETAIL_ZOOM_THRESHOLD
  );
  // Track when map is fully loaded and ready for layer operations
  const [mapReady, setMapReady] = useState(false);

  // Keep ref in sync so style.load callbacks always have current zones
  useEffect(() => { constructionZonesRef.current = constructionZones; }, [constructionZones]);

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
          "fill-color": theme === "dark" ? "#1f5054" : "#088",
          "fill-opacity": theme === "dark" ? 0.6 : 0.5,
        },
      });

      // Add outline layer
      mapRef.current.addLayer({
        id: "buildings-outline",
        type: "line",
        source: "buildings",
        paint: {
          "line-color": theme === "dark" ? "#42566e" : "#000",
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

      // Apply Google Maps dark palette to base map layers
      if (theme === "dark") applyDarkMapPalette(mapRef.current);

      // Track the initial style so the theme-switch effect doesn't re-set it
      currentStyleRef.current = theme === "dark" ? DARK_STYLE : LIGHT_STYLE;

      mapContainerRef.current?.setAttribute("data-loading", "false");

      // Signal that the map is fully loaded and ready for layer operations
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, [buildingPolygons]);

  // Track which style URL is currently loaded to avoid unnecessary setStyle calls
  const currentStyleRef = useRef<string | null>(null);

  // Switch map style when theme changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const newStyle = theme === "dark" ? DARK_STYLE : LIGHT_STYLE;

    // Skip if we already have the correct style loaded
    if (currentStyleRef.current === newStyle) return;

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
            "fill-color": theme === "dark" ? "#1f5054" : "#088",
            "fill-opacity": theme === "dark" ? 0.6 : 0.5,
          },
        });
      }

      if (!map.getLayer("buildings-outline")) {
        map.addLayer({
          id: "buildings-outline",
          type: "line",
          source: "buildings",
          paint: {
            "line-color": theme === "dark" ? "#42566e" : "#000",
            "line-width": theme === "dark" ? 1.5 : 1,
          },
        });
      }

      // Apply Google Maps dark palette to base map layers
      if (theme === "dark") applyDarkMapPalette(map);

      // Re-add construction zones after style swap
      const zonesToRender = constructionZonesRef.current.filter(
        (zone) => zone.isActive && zone.isApproved
      );
      if (zonesToRender.length > 0 && !map.getSource("construction-zones")) {
        try {
          map.addSource("construction-zones", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: zonesToRender.map((zone) => ({
                type: "Feature" as const,
                id: zone.id,
                geometry: zone.geojson?.geometry ?? zone.geojson,
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
            paint: { "fill-color": "#ff4444", "fill-opacity": 0.3 },
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
        } catch (e) {
          console.warn("Error re-adding construction zones after style swap:", e);
        }
      }

      currentStyleRef.current = newStyle;
    });

    map.setStyle(newStyle);
  }, [theme, mapReady, buildingPolygons]);

  // Handle click events based on mapPointerEvents mode
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const queryAndOpenBuilding = (point: mapboxgl.Point) => {
      if (!mapRef.current) return;
      if (!mapRef.current.getLayer("buildings-fill")) return;
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
        mapRef.current.getCanvas()?.style && (mapRef.current.getCanvas().style.cursor = "");
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
              geometry: zone.geojson?.geometry ?? zone.geojson,
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
          const startDate = props?.startDate ? new Date(props.startDate as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
          const endDate = props?.endDate ? new Date(props.endDate as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
          const isDark = !!document.querySelector(".dark");

          const bg = isDark ? "#2d2f2f" : "#ffffff";
          const border = isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6";
          const namColor = isDark ? "#f1f5f9" : "#111827";
          const descColor = isDark ? "#94a3b8" : "#6b7280";
          const dateColor = isDark ? "#fbbf24" : "#d97706";
          const dateBg = isDark ? "rgba(251,191,36,0.12)" : "#fffbeb";
          const dateBorder = isDark ? "rgba(251,191,36,0.25)" : "#fde68a";

          const dateSection = startDate
            ? `<div style="margin-top:10px;padding:6px 8px;background:${dateBg};border:1px solid ${dateBorder};border-radius:6px;display:flex;align-items:center;gap:6px;">
                <span style="font-size:13px;">📅</span>
                <span style="font-size:11px;font-weight:600;color:${dateColor};">
                  ${startDate}${endDate ? ` – ${endDate}` : ""}
                </span>
              </div>`
            : "";

          return `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;width:220px;background:${bg};border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.18);">
              <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:10px 12px;display:flex;align-items:center;gap:8px;">
                <span style="font-size:18px;line-height:1;">🚧</span>
                <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:0.06em;text-transform:uppercase;">Construction Zone</span>
              </div>
              <div style="padding:10px 12px;border:1px solid ${border};border-top:none;border-radius:0 0 12px 12px;">
                <p style="margin:0;font-size:13px;font-weight:700;color:${namColor};line-height:1.4;">${name}</p>
                ${description ? `<p style="margin:6px 0 0;font-size:11px;color:${descColor};line-height:1.5;">${description}</p>` : ""}
                ${dateSection}
              </div>
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

  // User location marker ("You are here")
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const map = mapRef.current;

    const el = document.createElement("div");
    el.className = "user-location-marker";
    el.innerHTML = `
      <div class="user-location-marker__pulse"></div>
      <div class="user-location-marker__core"></div>
    `;

    const marker = new mapboxgl.Marker({ element: el, anchor: "center" });
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      className: "user-location-popup",
    }).setHTML("You are here");

    let attached = false;
    let pinned = false;
    const hasHover =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover)").matches;

    const showPopup = () => {
      popup.setLngLat(marker.getLngLat()).addTo(map);
    };
    const hidePopup = () => popup.remove();

    el.addEventListener("mouseenter", () => {
      if (!attached) return;
      showPopup();
    });
    el.addEventListener("mouseleave", () => {
      if (pinned) return;
      hidePopup();
    });
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!attached) return;
      if (hasHover) return;
      pinned = !pinned;
      if (pinned) showPopup();
      else hidePopup();
    });

    let hasCentered = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lngLat: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        console.log(
          "[location] lat=%s lng=%s accuracy=%sm",
          pos.coords.latitude.toFixed(6),
          pos.coords.longitude.toFixed(6),
          Math.round(pos.coords.accuracy)
        );
        marker.setLngLat(lngLat);
        if (!attached) {
          marker.addTo(map);
          attached = true;
        }
        if (!hasCentered) {
          hasCentered = true;
          map.flyTo({ center: lngLat, zoom: 17, duration: 1200, essential: true });
        }
        if (pinned || popup.isOpen()) popup.setLngLat(lngLat);
      },
      (err) => {
        console.warn("Geolocation unavailable:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      popup.remove();
      marker.remove();
    };
  }, [mapReady]);

  // Render a visual marker at the pending event location (during event creation)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove any existing pending marker
    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.remove();
      pendingMarkerRef.current = null;
    }

    if (!pendingEventMarker) return;

    const el = document.createElement("div");
    el.className = "pending-event-marker";
    el.style.cssText = `
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    `;
    el.innerHTML = `
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24s16-14 16-24C32 7.163 24.837 0 16 0z" fill="#dc2626"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `;

    pendingMarkerRef.current = new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat(pendingEventMarker)
      .addTo(map);

    return () => {
      if (pendingMarkerRef.current) {
        pendingMarkerRef.current.remove();
        pendingMarkerRef.current = null;
      }
    };
  }, [pendingEventMarker]);

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
