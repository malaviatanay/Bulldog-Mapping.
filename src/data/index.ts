import { createClient } from "@/utils/supabase/server";

export async function getBuildingPolygons() {
  const supabase = await createClient();

  // const { data: building, error } = await supabase.from("building").select("*");
  const { data, error } = await supabase.from("building_polygons").select(`
      id,
      geojson,
      building_id 
    `);
  if (error) throw error;

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

export async function getUserAdminStatus() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  if (user) console.log("User:", user);

  const userId = user.id;
  const { data, error } = await supabase
    .from("campusAdmin")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;

  return data?.user_id || false;
}
