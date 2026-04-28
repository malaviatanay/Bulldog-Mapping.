import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coordinates = searchParams.get("coordinates");
  const steps = searchParams.get("steps") === "true";

  if (!coordinates) {
    return Response.json({ error: "Missing coordinates" }, { status: 400 });
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
