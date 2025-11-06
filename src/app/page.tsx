import { getBuildingPolygons, getBuildings, getEvents } from "@/data";
import Map from "./components/Map";
import { MapProvider } from "@/context/MapContext";
import MapTest from "./components/MapTest";
import { SidebarProvider } from "@/context/SidebarContext";

export default async function Home() {
  const buildingData = getBuildings();
  const eventData = getEvents();
  const buildingPolygonData = getBuildingPolygons();
  const [buildings, events, buildingPolygons] = await Promise.all([
    buildingData,
    eventData,
    buildingPolygonData,
  ]);
  console.log(buildings);
  console.log(events);
  console.log(buildingPolygons);
  return (
    <div className="h-lvh relative w-full">
      <MapProvider
        buildings={buildings}
        events={events}
        buildingPolygons={buildingPolygons}
      >
        <SidebarProvider>
          <MapTest></MapTest>
        </SidebarProvider>
        {/* <Map></Map> */}
      </MapProvider>
    </div>
  );
}