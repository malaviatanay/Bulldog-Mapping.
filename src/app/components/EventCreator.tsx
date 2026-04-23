"use client";
import { useState, useEffect } from "react";
import { X, MapPin, ArrowLeft, CheckCircle } from "lucide-react";
import { useMapContext } from "@/context/MapContext";
import { useSidebar } from "@/context/SidebarContext";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const supabase = createClient(); // Create client instance
  const router = useRouter();

  const MapCtx = useMapContext();
  const { setIsOpen, setView } = useSidebar();

  // Auto-refresh after success
  useEffect(() => {
    if (showSuccess) {
      const timeout = setTimeout(() => {
        router.refresh();
        setView("eventList");
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [showSuccess, router, setView]);

  // Watch for dropped pin coordinates
  useEffect(() => {
    if (MapCtx.lastClickedCords && MapCtx.mapPointerEvents === "dropPin") {
      const [lat, lng] = MapCtx.lastClickedCords;
      setFormData((prev) => ({
        ...prev,
        markerLat: lat.toString(),
        markerLng: lng.toString(),
      }));
      MapCtx.setPendingEventMarker([lng, lat]);
      MapCtx.setLastClickedCords(null);
      MapCtx.setMapPointerEvents("all");
      setIsOpen(true);
    }
  }, [MapCtx, setIsOpen]);

  // Clear the pending marker when this view unmounts
  useEffect(() => {
    return () => {
      MapCtx.setPendingEventMarker(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please sign in to create events");
        setIsSubmitting(false);
        return;
      }

      // Combine date and time into ISO strings
      const startDateTime = formData.dateStart && formData.timeStart
        ? new Date(`${formData.dateStart}T${formData.timeStart}`).toISOString()
        : new Date().toISOString();

      const endDateTime = formData.dateEnd && formData.timeEnd
        ? new Date(`${formData.dateEnd}T${formData.timeEnd}`).toISOString()
        : null;

      // Prepare data
      const eventData = {
        name: formData.name,
        description: formData.description || null,
        latitude: parseFloat(formData.markerLat),
        longitude: parseFloat(formData.markerLng),
        dateStart: startDateTime,
        dateEnd: endDateTime,
        datePosted: new Date().toISOString(),
        metaTags: metaTags,
        creatorID: user.id,
        buildingIDs: [],
        isApproved: false,
      };

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('event')
        .insert([eventData])
        .select();

      if (insertError) {
        setError(insertError.message || "Failed to create event. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Reset form after successful submission
      setFormData({
        name: "",
        description: "",
        markerLat: "",
        markerLng: "",
        dateStart: "",
        timeStart: "",
        dateEnd: "",
        timeEnd: "",
      });
      setMetaTags([]);
      MapCtx.setPendingEventMarker(null);

      // Show success message
      setShowSuccess(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create event. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success state
  if (showSuccess) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center ${className}`}>
        <CheckCircle
          className="w-20 h-20 text-green-500 mb-4 fade-blur-in-stagger"
          style={{ '--index': 0 } as React.CSSProperties}
        />
        <h2
          className="text-2xl font-semibold text-gray-800 mb-2 text-center fade-blur-in-stagger"
          style={{ '--index': 1 } as React.CSSProperties}
        >
          Success!
        </h2>
        <p
          className="text-gray-600 text-center fade-blur-in-stagger"
          style={{ '--index': 2 } as React.CSSProperties}
        >
          Event is awaiting approval
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
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

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Event Name */}
        <div className="mb-3">
          <label
            htmlFor="event-name"
            className="font-medium text-sm mb-1 block"
          >
            Event Name *
          </label>
          <input
            id="event-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Campus Tour"
            required
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
          <div className="font-medium text-sm mb-1">Location *</div>
          <input
            type="hidden"
            name="markerLat"
            value={formData.markerLat}
            required
          />
          <input
            type="hidden"
            name="markerLng"
            value={formData.markerLng}
            required
          />
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
                  MapCtx.setPendingEventMarker(null);
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
          <div className="font-medium text-sm mb-1">Start Date & Time *</div>
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
                required
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
                required
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
          disabled={isSubmitting}
          className="button-depth w-full bg-highlight text-white py-2 rounded-lg border border-highlight-hover hover:bg-highlight-hover transition-[transform_background-color] duration-250 ease-out-3 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSubmitting ? "Creating Event..." : "Save Event"}
        </button>
      </form>
    </div>
  );
}