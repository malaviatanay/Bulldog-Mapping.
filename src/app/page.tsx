import Map from "./components/Map";
import SearchBar from "./components/SearchBar";

export default function Home() {
  return (
    <div className="h-lvh relative w-full">
      <SearchBar />
      <Map />
    </div>
  );
}