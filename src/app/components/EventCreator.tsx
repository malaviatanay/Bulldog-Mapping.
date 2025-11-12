"use client";
import { useState } from "react";
import { X } from "lucide-react";

export default function EventCreator() {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
    setMetaTags(metaTags.filter(tag => tag !== tagToRemove));
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
    <div className="max-w-lg mx-auto p-6 bg-white rounded-2xl border border-neutral-200 mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center text-highlight">
        Create an Event
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Event Name"
          className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-highlight transition-colors duration-150 ease-out-2"
        />

        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Event Description"
          rows={3}
          className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-highlight transition-colors duration-150 ease-out-2 resize-none"
        />

        {/* Tag Input */}
        <div>
          <input
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags (press Enter to add)"
            className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:border-highlight transition-colors duration-150 ease-out-2"
          />
          {metaTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {metaTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-highlight text-white text-sm px-2.5 py-1 rounded-md"
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

        <div className="grid grid-cols-2 gap-2">
          <input
            name="markerLat"
            value={formData.markerLat}
            onChange={handleChange}
            placeholder="Latitude"
            className="p-2 border border-neutral-200 rounded-lg outline-none focus:border-highlight transition-colors duration-150 ease-out-2"
          />
          <input
            name="markerLng"
            value={formData.markerLng}
            onChange={handleChange}
            placeholder="Longitude"
            className="p-2 border border-neutral-200 rounded-lg outline-none focus:border-highlight transition-colors duration-150 ease-out-2"
          />
        </div>

        {/* Start Date and Time */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Start Date & Time</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              name="dateStart"
              value={formData.dateStart}
              onChange={handleChange}
              className="p-2 border border-neutral-200 rounded-lg outline-none focus:border-highlight transition-colors duration-150 ease-out-2 cursor-pointer"
            />
            <input
              type="time"
              name="timeStart"
              value={formData.timeStart}
              onChange={handleChange}
              className="p-2 border border-neutral-200 rounded-lg outline-none focus:border-highlight transition-colors duration-150 ease-out-2 cursor-pointer"
            />
          </div>
        </div>

        {/* End Date and Time */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">End Date & Time</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              name="dateEnd"
              value={formData.dateEnd}
              onChange={handleChange}
              className="p-2 border border-neutral-200 rounded-lg outline-none focus:border-highlight transition-colors duration-150 ease-out-2 cursor-pointer"
            />
            <input
              type="time"
              name="timeEnd"
              value={formData.timeEnd}
              onChange={handleChange}
              className="p-2 border border-neutral-200 rounded-lg outline-none focus:border-highlight transition-colors duration-150 ease-out-2 cursor-pointer"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-highlight text-white py-2 rounded-lg hover:bg-highlight-hover transition-[transform_background-color] duration-150 ease-out-2 cursor-pointer hover:scale-105 active:scale-95"
        >
          Save Event
        </button>
      </form>
    </div>
  );
}
