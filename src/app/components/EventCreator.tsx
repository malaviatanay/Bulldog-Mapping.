"use client";
import { useState, useEffect } from "react";
import { X, MapPin, ArrowLeft } from "lucide-react";
import { useMapContext } from "@/context/MapContext";
import { useSidebar } from "@/context/SidebarContext";

type EventCreatorProps = {
  className?: string;
};

export default function EventCreator({ className = "" }: EventCreatorProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    markerLat: "",
    markerLng: "",
    dateStart: "",
    timeStart: "",
    dateEnd: "",
    timeEnd: "",
  });

  const [metaTags, setMetaTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const MapCtx = useMapContext();
  const { setIsOpen, setView } = useSidebar();

  // Watch for dropped pin coordinates
  useEffect(() => {
    if (MapCtx.lastClickedCords && MapCtx.mapPointerEvents === "dropPin") {
      const [lat, lng] = MapCtx.lastClickedCords;
      setFormData((prev) => ({
        ...prev,
        markerLat: lat.toString(),
        markerLng: lng.toString(),
      }));
      // Clear the last clicked coords so we can pick again
      MapCtx.setLastClickedCords(null);
      // Reset map mode and reopen sidebar
      MapCtx.setMapPointerEvents("all");
      setIsOpen(true);
    }
  }, [MapCtx, setIsOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentTag.trim()) {
      e.preventDefault();
      if (!metaTags.includes(currentTag.trim())) {
        setMetaTags([...metaTags, currentTag.trim()]);
      }
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetaTags(metaTags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formattedData = {
      ...formData,
      metaTags,
      markerCords: [
        parseFloat(formData.markerLng),
        parseFloat(formData.markerLat),
      ],
    };

    console.log("Event UI Submitted:", formattedData);
    alert("Event form submitted (UI only)!");
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Heading */}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("eventList")}
          className="button-depth group p-2 rounded-lg border border-transparent hover:border-highlight-hover hover:bg-highlight transition-[transform_background-color_border-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Back to events"
        >
          <ArrowLeft className="w-5 h-5 group-hover:text-white transition-colors duration-150 ease-out-2" />
        </button>
        <h2 className="text-xl font-semibold">Create an Event</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Event Name */}
        <div className="mb-3">
          <label
            htmlFor="event-name"
            className="font-medium text-sm mb-1 block"
          >
            Event Name
          </label>
          <input
            id="event-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Campus Tour"
            className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 transition-colors duration-150 ease-out-2"
          />
        </div>

        {/* Event Description */}
        <div className="mb-3">
          <label
            htmlFor="event-description"
            className="font-medium text-sm mb-1 block"
          >
            Description
          </label>
          <textarea
            id="event-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your event..."
            rows={3}
            className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 transition-colors duration-150 ease-out-2 resize-none"
          />
        </div>

        {/* Tags */}
        <div className="mb-3">
          <label
            htmlFor="event-tags"
            className="font-medium text-sm mb-1 block"
          >
            Tags
          </label>
          <input
            id="event-tags"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags (press Enter)"
            className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 transition-colors duration-150 ease-out-2"
          />
          {metaTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {metaTags.map((tag) => (
                <span
                  key={tag}
                  className="button-depth inline-flex items-center gap-1 bg-highlight text-white text-sm px-2.5 py-1 rounded-md border border-highlight-hover"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:bg-highlight-hover rounded transition-colors duration-150 ease-out-2 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="mb-3">
          <div className="font-medium text-sm mb-1">Location</div>
          {formData.markerLat && formData.markerLng ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 border border-neutral-200 rounded-lg bg-neutral-50 text-sm text-gray-700">
                {Number(formData.markerLat).toFixed(4)},{" "}
                {Number(formData.markerLng).toFixed(4)}
              </div>
              <button
                type="button"
                onClick={() => {
                  MapCtx.setMapPointerEvents("dropPin");
                  setIsOpen(false);
                }}
                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors duration-150 ease-out-2 cursor-pointer"
                title="Change location"
              >
                <MapPin className="w-5 h-5 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    markerLat: "",
                    markerLng: "",
                  }));
                }}
                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors duration-150 ease-out-2 cursor-pointer"
                title="Clear location"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                MapCtx.setMapPointerEvents("dropPin");
                setIsOpen(false);
              }}
              className="w-full p-2 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors duration-150 ease-out-2 cursor-pointer flex items-center justify-center gap-2 text-gray-600"
            >
              <MapPin className="w-5 h-5" />
              Select Location on Map
            </button>
          )}
        </div>

        {/* Start Date and Time */}
        <div className="mb-3">
          <div className="font-medium text-sm mb-1">Start Date & Time</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="event-date-start" className="sr-only">
                Start Date
              </label>
              <input
                id="event-date-start"
                type="date"
                name="dateStart"
                value={formData.dateStart}
                onChange={handleChange}
                className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 transition-colors duration-150 ease-out-2 cursor-pointer"
              />
            </div>
            <div>
              <label htmlFor="event-time-start" className="sr-only">
                Start Time
              </label>
              <input
                id="event-time-start"
                type="time"
                name="timeStart"
                value={formData.timeStart}
                onChange={handleChange}
                className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 transition-colors duration-150 ease-out-2 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* End Date and Time */}
        <div className="mb-3">
          <div className="font-medium text-sm mb-1">End Date & Time</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="event-date-end" className="sr-only">
                End Date
              </label>
              <input
                id="event-date-end"
                type="date"
                name="dateEnd"
                value={formData.dateEnd}
                onChange={handleChange}
                className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 transition-colors duration-150 ease-out-2 cursor-pointer"
              />
            </div>
            <div>
              <label htmlFor="event-time-end" className="sr-only">
                End Time
              </label>
              <input
                id="event-time-end"
                type="time"
                name="timeEnd"
                value={formData.timeEnd}
                onChange={handleChange}
                className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400 transition-colors duration-150 ease-out-2 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="button-depth w-full bg-highlight text-white py-2 rounded-lg border border-highlight-hover hover:bg-highlight-hover transition-[transform_background-color] duration-250 ease-out-3 cursor-pointer hover:scale-105 active:scale-95"
        >
          Save Event
        </button>
      </form>
    </div>
  );
}
