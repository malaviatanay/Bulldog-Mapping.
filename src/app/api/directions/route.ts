import { NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// Rough caps — Mapbox itself only accepts up to 25 waypoints, so cap input
// length to a value well above that to allow query overhead but reject obvious
// abuse like multi-megabyte payloads.
const MAX_COORDINATES_LEN = 1500;

export async function GET(request: NextRequest) {
  // Rate limit by IP. Generous because route previews trigger several requests
  // per user session, but still caps cost-burn from automated scrapers.
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`directions:${ip}`, 30, 90);
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const coordinates = searchParams.get("coordinates");
  const steps = searchParams.get("steps") === "true";

  if (!coordinates) {
    return Response.json({ error: "Missing coordinates" }, { status: 400 });
  }
  if (coordinates.length > MAX_COORDINATES_LEN) {
    return Response.json({ error: "Coordinates too long" }, { status: 400 });
  }
  // Reject anything that doesn't look like the Mapbox waypoint format
  // (lng,lat;lng,lat;... — digits, dots, commas, semicolons, minus signs only)
  if (!/^[-0-9.,;\s]+$/.test(coordinates)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!accessToken) {
    return Response.json({ error: "No Mapbox token configured" }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      geometries: "geojson",
      overview: "full",
      access_token: accessToken,
    });
    if (steps) {
      params.set("steps", "true");
      params.set("banner_instructions", "true");
      params.set("voice_instructions", "true");
      params.set("voice_units", "imperial");
    }
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${encodeURIComponent(coordinates)}?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch {
    return Response.json({ error: "Failed to fetch directions" }, { status: 500 });
  }
}
