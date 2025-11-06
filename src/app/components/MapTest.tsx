"use client";

import { useRef, useState, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapContext } from "@/context/MapContext";
import { useSidebar } from "@/context/SidebarContext";

const INTITIAL_CENTER: [number, number] = [-119.74784, 36.81226];
const INITIAL_ZOOM = 15;

// map will take building and polygon data and event data as props =)
export default function MapTest() {
  const mapRef = useRef<mapboxgl.Map>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { buildings, events, buildingPolygons, setSelectedBuilding, setSelectedEvent } = useMapContext();
  const { setView, setIsOpen } = useSidebar();

  const [center, setCenter] = useState<[number, number]>(INTITIAL_CENTER);
  const [zoom, setZoom] = useState<number>(INITIAL_ZOOM);

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
      }
    });

    mapRef.current.on("load", () => {
      if (!mapRef.current) return;

      // Add building polygons source
      mapRef.current.addSource('buildings', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: buildingPolygons.map(polygon => {
            const feature = polygon.geojson as unknown as GeoJSON.Feature;
            return {
              type: 'Feature',
              id: polygon.building_id, // Mapbox uses this for feature identification
              geometry: feature.geometry,
              properties: {
                ...(feature.properties || {}),
                buildingId: polygon.building_id // Store building_id for lookups
              }
            };
          })
        }
      });

      // Add fill layer (colored building polygons)
      mapRef.current.addLayer({
        id: 'buildings-fill',
        type: 'fill',
        source: 'buildings',
        paint: {
          'fill-color': '#088',
          'fill-opacity': 0.5
        }
      });

      // Add outline layer
      mapRef.current.addLayer({
        id: 'buildings-outline',
        type: 'line',
        source: 'buildings',
        paint: {
          'line-color': '#000',
          'line-width': 2
        }
      });

      // Add event points source
      mapRef.current.addSource('events', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: events
            .filter(event => event.isApproved) // Only show approved events
            .map(event => ({
              type: 'Feature',
              id: event.id,
              geometry: {
                type: 'Point',
                coordinates: [event.longitude, event.latitude]
              },
              properties: {
                eventId: event.id,
                name: event.name,
                description: event.description,
                dateStart: event.dateStart,
                dateEnd: event.dateEnd,
                metaTags: event.metaTags
              }
            }))
        }
      });

      // Add event circle markers
      mapRef.current.addLayer({
        id: 'events-circle',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': 10,
          'circle-color': '#ff0000',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Handle clicks on building polygons
      mapRef.current.on('click', 'buildings-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const buildingId = feature.properties?.buildingId;

          if (buildingId && mapRef.current) {
            // Find the full building data using the buildingId
            const building = buildings.find(b => b.id === buildingId);

            if (building) {
              console.log(building);
              setSelectedBuilding(building);
              setView('building'); // Switch sidebar to building view
              setIsOpen(true); // Ensure sidebar is open

              // Get the center of the clicked building using Mapbox's getBounds
              const bounds = new mapboxgl.LngLatBounds();

              if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates[0].forEach((coord: number[]) => {
                  bounds.extend(coord as [number, number]);
                });
              } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach((polygon: number[][][]) => {
                  polygon[0].forEach((coord: number[]) => {
                    bounds.extend(coord as [number, number]);
                  });
                });
              }

              // Fly to the center of the building with smooth animation
              mapRef.current.flyTo({
                center: bounds.getCenter(),
                zoom: 17,
                duration: 1000,
                essential: true
              });
            }
          }
        }
      });

      // Handle clicks on event markers
      mapRef.current.on('click', 'events-circle', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const eventId = feature.properties?.eventId;

          if (eventId) {
            // Find the full event data using the eventId
            const event = events.find(ev => ev.id === eventId);

            if (event) {
              console.log('Event clicked:', event);
              setSelectedEvent(event);
              setView('event'); // Switch sidebar to event view
              setIsOpen(true); // Ensure sidebar is open
              
              // Fly to the event location with smooth animation
              if(mapRef.current)
              mapRef.current.flyTo({
                center: [event.longitude, event.latitude],
                zoom: 17,
                duration: 1000,
                essential: true
              });
            }
          }
        }
      });

      // Change cursor on hover for buildings
      mapRef.current.on('mouseenter', 'buildings-fill', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        }
      });

      mapRef.current.on('mouseleave', 'buildings-fill', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = '';
        }
      });

      // Change cursor on hover for events
      mapRef.current.on('mouseenter', 'events-circle', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        }
      });

      mapRef.current.on('mouseleave', 'events-circle', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = '';
        }
      });
    });

    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, [buildingPolygons, buildings, events, setSelectedBuilding, setSelectedEvent, setView, setIsOpen]);

  return (
    <div
      ref={mapContainerRef}
      id="map-container"
      className="bg-neutral-200 absolute w-full h-full top-0 left-0 right-0 bottom-0 "
    ></div>
  );
}
