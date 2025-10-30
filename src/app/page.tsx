import { getBuildings, getEvents } from "@/data";
import Map from "./components/Map";
import EventCreator from "./components/EventCreator";

export default async function Home() {
  const buildingData = getBuildings();
  const eventData = getEvents();
  const [buildings, events] = await Promise.all([buildingData, eventData]);
  console.log(buildings);
  console.log(events);

  return (
    <div className="h-lvh relative w-full">
      <Map></Map>
    </div>
  );
}
