import { createClient } from "@/utils/supabase/server";

export async function getBuildingPolygons() {
  const supabase = await createClient();

  // const { data: building, error } = await supabase.from("building").select("*");
  const { data, error } = await supabase.from("building_polygons").select(`
      id,
      geojson,
      building_id 
    `);
  if (error) return error;

  return data;
}

export async function getBuildings() {
  const supabase = await createClient();

  const { data: building, error } = await supabase.from("building").select("*");
  if (error) throw error;

  return building;
}


export async function getEvents() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("event").select("*");
  if (error) throw error;

  return data;
}