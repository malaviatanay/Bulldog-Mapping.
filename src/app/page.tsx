import { getBuildingPolygons, getBuildings, getEvents } from "@/data";
import Map from "./components/Map";
import { MapProvider } from "@/context/MapContext";
import MapTest from "./components/MapTest";
import { SidebarProvider } from "@/context/SidebarContext";
import Sidebar from "./components/navigation/Sidebar";
import Navbar from "./components/navigation/Navbar";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const userData = supabase.auth.getUser();
  const buildingData = getBuildings();
  const eventData = getEvents();
  const buildingPolygonData = getBuildingPolygons();
  const [
    buildings,
    events,
    buildingPolygons,
    {
      data: { user },
    },
  ] = await Promise.all([
    buildingData,
    eventData,
    buildingPolygonData,
    userData,
  ]);
  // console.log(buildings);
  // console.log(events);
  // console.log(buildingPolygons);
  return (
    <div className="max-h-dvh h-dvh relative w-full">
      <MapProvider
        buildings={buildings}
        events={events}
        buildingPolygons={buildingPolygons}
      >
        <SidebarProvider>
          <Navbar user={user}></Navbar>
          <main className="h-full w-full relative">
            <Sidebar></Sidebar>
            <MapTest></MapTest>
          </main>
        </SidebarProvider>
        {/* <Map></Map> */}
      </MapProvider>
    </div>
  );
}
