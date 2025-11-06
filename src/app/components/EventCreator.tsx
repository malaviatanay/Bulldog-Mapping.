"use client";
import { useState } from "react";

export default function EventCreator() {
  const [formData, setFormData] = useState({
    name: "",
    otherNames: "",
    metaTags: "",
    isApproved: false,
    markerLat: "",
    markerLng: "",
    buildingName: "",
    datePosted: "",
    creatorName: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formattedData = {
      ...formData,
      otherNames: formData.otherNames.split(",").map((n) => n.trim()),
      metaTags: formData.metaTags.split(",").map((t) => t.trim()),
      markerCords: [
        parseFloat(formData.markerLng),
        parseFloat(formData.markerLat),
      ],
    };

    console.log("Event UI Submitted:", formattedData);
    alert("Event form submitted (UI only)!");
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-2xl shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">
        Create an Event
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Event Name"
          className="w-full p-2 border rounded"
        />

        <input
          name="otherNames"
          value={formData.otherNames}
          onChange={handleChange}
          placeholder="Other Names (comma-separated)"
          className="w-full p-2 border rounded"
        />

        <input
          name="metaTags"
          value={formData.metaTags}
          onChange={handleChange}
          placeholder="Tags (e.g., Music, Campus, Club)"
          className="w-full p-2 border rounded"
        />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="isApproved"
            checked={formData.isApproved}
            onChange={handleChange}
          />
          <label>Approved</label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            name="markerLat"
            value={formData.markerLat}
            onChange={handleChange}
            placeholder="Latitude"
            className="p-2 border rounded"
          />
          <input
            name="markerLng"
            value={formData.markerLng}
            onChange={handleChange}
            placeholder="Longitude"
            className="p-2 border rounded"
          />
        </div>

        {/* Building dropdown */}
        <select
          name="buildingName"
          value={formData.buildingName}
          onChange={handleChange}
          className="w-full p-2 border rounded bg-white"
        >
          <option value="">Select Building</option>
          <option value="Fresno State Library">Henry Madden Library</option>
          <option value="Engineering East">Engineering East</option>
          <option value="Science 1">Science 1</option>
          <option value="Science 2">Science 2</option>
          <option value="Peters Business Building">Peters Business Building</option>
          <option value="University Student Union">University Student Union</option>
          <option value="Music Building">Music Building</option>
          <option value="North Gym">North Gym</option>
          <option value="South Gym">South Gym</option>
          <option value="Bulldog Stadium">Bulldog Stadium</option>
        </select>

        <input
          type="date"
          name="datePosted"
          value={formData.datePosted}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        <input
          name="creatorName"
          value={formData.creatorName}
          onChange={handleChange}
          placeholder="Creator Name"
          className="w-full p-2 border rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Save Event
        </button>
      </form>
    </div>
  );
}
