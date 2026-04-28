import { CampusGraph } from "@/types/schedule";
import { ConstructionZone } from "@/types/constructionZone";
import { Tables } from "@/types/supabase";
import { buildCampusGraph } from "./campusGraph";
import { findShortestPath } from "./dijkstra";
import { getFilteredGraph } from "./edgeFiltering";
import { haversineDistance } from "./geoUtils";
import {
  getNavigationRoute,
  NavigationResult,
} from "./mapboxDirections";

type Building = Tables<"building">;
type BuildingPolygon = Tables<"building_polygons">;

export type WaypointInput = {
  coords: [number, number];
  buildingId?: string; // if provided, use as graph node directly
};

const MAPBOX_WAYPOINT_LIMIT = 25;

function findNearestNodeId(
  graph: CampusGraph,
  point: [number, number]
): string | null {
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const [id, node] of graph.nodes) {
    const d = haversineDistance(point, node.coordinates);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}

function subsample(
  coords: [number, number][],
  maxCount: number
): [number, number][] {
  if (coords.length <= maxCount) return coords;
  if (maxCount < 2) return [coords[0], coords[coords.length - 1]];
  const step = (coords.length - 1) / (maxCount - 1);
  const out: [number, number][] = [];
  for (let i = 0; i < maxCount; i++) {
    const idx = Math.round(i * step);
    out.push(coords[Math.min(idx, coords.length - 1)]);
  }
  return out;
}

/**
 * Build a list of Mapbox waypoints that go around active construction zones,
 * by routing through the campus graph between consecutive segments.
 */
export function planWaypointsAvoidingZones(
  segments: WaypointInput[],
  buildings: Building[],
  parkingLots: Building[],
  buildingPolygons: BuildingPolygon[],
  parkingPolygons: BuildingPolygon[],
  constructionZones: ConstructionZone[]
): [number, number][] {
  if (segments.length < 2) {
    return segments.map((s) => s.coords);
  }

  const activeZones = constructionZones.filter(
    (z) => z.isActive && z.isApproved
  );

  // No active zones → nothing to detour around; just return endpoints
  if (activeZones.length === 0) {
    return segments.map((s) => s.coords);
  }

  const allBuildings = [...buildings, ...parkingLots];
  const allPolygons = [...buildingPolygons, ...parkingPolygons];
  const graph = buildCampusGraph(allBuildings, allPolygons);
  const filteredGraph = getFilteredGraph(graph, activeZones);

  const waypoints: [number, number][] = [];
  // Always start with the first input
  waypoints.push(segments[0].coords);

  for (let i = 0; i < segments.length - 1; i++) {
    const from = segments[i];
    const to = segments[i + 1];

    const fromNodeId =
      from.buildingId && filteredGraph.nodes.has(from.buildingId)
        ? from.buildingId
        : findNearestNodeId(filteredGraph, from.coords);
    const toNodeId =
      to.buildingId && filteredGraph.nodes.has(to.buildingId)
        ? to.buildingId
        : findNearestNodeId(filteredGraph, to.coords);

    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) {
      waypoints.push(to.coords);
      continue;
    }

    const path = findShortestPath(filteredGraph, fromNodeId, toNodeId);
    if (!path || path.coordinates.length === 0) {
      waypoints.push(to.coords);
      continue;
    }

    // path.coordinates is [fromNodeCoords, ...intermediates, toNodeCoords].
    // Push the WHOLE path so Mapbox has a continuous chain of waypoints.
    // Including fromNodeCoords ensures the route bridges from segment[0].coords
    // to the campus path; otherwise we'd jump straight to an intermediate node
    // and Mapbox can return a disconnected partial route.
    waypoints.push(...path.coordinates);

    // The last coord of `path` is the toNode's centroid. If the actual `to.coords`
    // (e.g. event marker, building center) differs noticeably, append it as a
    // final waypoint so the line ends at the user's actual destination.
    const last = path.coordinates[path.coordinates.length - 1];
    const dLng = Math.abs(last[0] - to.coords[0]);
    const dLat = Math.abs(last[1] - to.coords[1]);
    if (dLng > 1e-5 || dLat > 1e-5) {
      waypoints.push(to.coords);
    }
  }

  // De-duplicate consecutive identical waypoints
  const dedup: [number, number][] = [];
  for (const wp of waypoints) {
    const prev = dedup[dedup.length - 1];
    if (!prev || prev[0] !== wp[0] || prev[1] !== wp[1]) {
      dedup.push(wp);
    }
  }

  return dedup.length > MAPBOX_WAYPOINT_LIMIT
    ? subsample(dedup, MAPBOX_WAYPOINT_LIMIT)
    : dedup;
}

/**
 * Fetch a Mapbox walking route, but route through the campus graph first to
 * avoid active construction zones.
 */
export async function getNavigationRouteAvoidingZones(
  segments: WaypointInput[],
  buildings: Building[],
  parkingLots: Building[],
  buildingPolygons: BuildingPolygon[],
  parkingPolygons: BuildingPolygon[],
  constructionZones: ConstructionZone[]
): Promise<NavigationResult | null> {
  const waypoints = planWaypointsAvoidingZones(
    segments,
    buildings,
    parkingLots,
    buildingPolygons,
    parkingPolygons,
    constructionZones
  );
  return getNavigationRoute(waypoints);
}
