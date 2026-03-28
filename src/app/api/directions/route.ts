import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coordinates = searchParams.get("coordinates");

  if (!coordinates) {
    return Response.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!accessToken) {
    return Response.json({ error: "No Mapbox token configured" }, { status: 500 });
  }

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${encodeURIComponent(coordinates)}?geometries=geojson&overview=full&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch {
    return Response.json({ error: "Failed to fetch directions" }, { status: 500 });
  }
}
