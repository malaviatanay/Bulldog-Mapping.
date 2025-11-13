"use client";

import { useRef, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapContext } from "@/context/MapContext";
import { useSidebar } from "@/context/SidebarContext";
import EventMarker from "./EventMarker";

const INTITIAL_CENTER: [number, number] = [-119.74784, 36.81226];
const INITIAL_ZOOM = 15;
const DETAIL_ZOOM_THRESHOLD = 18; // Zoom level for simple vs detailed markers

// map will take building and polygon data and event data as props =)
export default function MapTest() {
  const mapRef = useRef<mapboxgl.Map>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ marker: mapboxgl.Marker; root: any }[]>([]);
  const {
    buildings,
    events,
    buildingPolygons,
    setSelectedBuilding,
    setSelectedEvent,
    ...sdbr
  } = useMapContext();
  const { setView, setIsOpen } = useSidebar();

  const [center, setCenter] = useState<[number, number]>(INTITIAL_CENTER);
  const [zoom, setZoom] = useState<number>(INITIAL_ZOOM);
  const [isSimpleView, setIsSimpleView] = useState<boolean>(INITIAL_ZOOM < DETAIL_ZOOM_THRESHOLD);

  // Handler for event clicks (called from EventMarker component)
  const handleEventClick = (event: any) => {
    console.log("Event clicked:", event);
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

  useEffect(() => {
    // add your public token here
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
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
              id: polygon.building_id, // Mapbox uses this for feature identification
              geometry: feature.geometry,
              properties: {
                ...(feature.properties || {}),
                buildingId: polygon.building_id, // Store building_id for lookups
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
          "fill-color": "#088",
          "fill-opacity": 0.5,
        },
      });

      // Add outline layer
      mapRef.current.addLayer({
        id: "buildings-outline",
        type: "line",
        source: "buildings",
        paint: {
          "line-color": "#000",
          "line-width": 2,
        },
      });

      // Event markers are now handled by custom React components (see separate useEffect below)

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
    });

    return () => {
      // Map cleanup - markers will be automatically removed when map is destroyed
      if (mapRef.current) mapRef.current.remove();
    };
  }, [
    buildingPolygons,
    buildings,
    events,
    setSelectedBuilding,
    setSelectedEvent,
    setView,
    setIsOpen,
  ]);

  // Handle click events based on mapPointerEvents mode
  useEffect(() => {
    if (!mapRef.current) return;

    // Handler for dropping pins
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      console.log("Pin dropped at:", e.lngLat);
      sdbr.setLastClickedCords([e.lngLat.lat, e.lngLat.lng]);
    };

    // Handler for building clicks
    const handleBuildingClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const buildingId = feature.properties?.buildingId;

        if (buildingId && mapRef.current) {
          // Find the full building data using the buildingId
          const building = buildings.find((b) => b.id === buildingId);

          if (building) {
            console.log(building);
            setSelectedBuilding(building);
            setView("building");
            setIsOpen(true);

            // Get the center of the clicked building using Mapbox's getBounds
            const bounds = new mapboxgl.LngLatBounds();

            if (feature.geometry.type === "Polygon") {
              feature.geometry.coordinates[0].forEach((coord: number[]) => {
                bounds.extend(coord as [number, number]);
              });
            } else if (feature.geometry.type === "MultiPolygon") {
              feature.geometry.coordinates.forEach(
                (polygon: number[][][]) => {
                  polygon[0].forEach((coord: number[]) => {
                    bounds.extend(coord as [number, number]);
                  });
                }
              );
            }

            // Fly to the center of the building with smooth animation
            mapRef.current.flyTo({
              center: bounds.getCenter(),
              zoom: 17,
              duration: 1000,
              essential: true,
            });
          }
        }
      }
    };

    // Add appropriate listeners based on mode
    if (sdbr.mapPointerEvents === "dropPin") {
      // Drop pin mode - only allow dropping pins
      mapRef.current.on("click", handleMapClick);
      mapRef.current.getCanvas().style.cursor = "crosshair";
    } else {
      // Normal mode - allow building clicks (event clicks handled by EventMarker component)
      mapRef.current.on("click", "buildings-fill", handleBuildingClick);
    }

    // Cleanup: remove all listeners when mode changes or component unmounts
    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", handleMapClick);
        mapRef.current.off("click", "buildings-fill", handleBuildingClick);
        // No need to reset cursor - if map is being destroyed, cursor doesn't matter
      }
    };
  }, [sdbr, buildings, events, setSelectedBuilding, setSelectedEvent, setView, setIsOpen]);

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
      .filter((event) => event.isApproved)
      .forEach((event) => {
        // Create a div element for the marker
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.pointerEvents = 'auto';

        // Create marker
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: isSimpleView ? 'center' : 'top'
        })
          .setLngLat([event.longitude, event.latitude])
          .addTo(mapRef.current!);

        // Create React root and render EventMarker component
        const root = createRoot(el);
        root.render(
          <EventMarker
            event={event}
            onClick={() => handleEventClick(event)}
            isSimple={isSimpleView}
          />
        );

        // Store reference for cleanup
        markersRef.current.push({ marker, root });
      });

    // Cleanup function
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
    <div
      ref={mapContainerRef}
      id="map-container"
      className="bg-neutral-200 absolute w-full h-full top1 left-0 right-0 bottom-0 "
    ></div>
  );
}
