import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

const BASE_SYSTEM_PROMPT = `You are the Bulldog Campus Assistant — a friendly, knowledgeable AI helper for California State University, Fresno (Fresno State / CSU Fresno). You help students, faculty, staff, and visitors with ANY question related to Fresno State.

You should answer questions about ALL of the following topics and more:
- Campus buildings, their locations, and what departments/services are in them
- Parking lots, parking permits, and transportation
- Campus dining options and meal plans
- Henry Madden Library hours, resources, and services
- Student services: financial aid, admissions, registration, enrollment, transcripts
- Tuition, fees, scholarships, and FAFSA
- Academic programs, majors, minors, certificates, and graduate programs
- Course registration, add/drop deadlines, academic calendar, and important dates
- GPA requirements, academic probation, and graduation requirements
- Campus recreation, the Student Recreation Center, and intramural sports
- Fresno State athletics (Bulldogs), sports teams, game schedules, and the Save Mart Center
- Student organizations, clubs, Greek life, and how to get involved
- Housing and residence life (on-campus and off-campus options)
- Health and wellness services (Student Health Center, counseling)
- Career Development Center, internships, and job placement
- Campus safety, Fresno State Police, emergency procedures
- Technology services, email, Canvas LMS, student portal
- Fresno State history, traditions, and fun facts
- The Fresno State campus farm, winery, and agricultural programs
- Study abroad programs and international student services
- Veterans services and support programs
- Accessibility and disability services (SSD)
- Campus events, commencement, homecoming, and Vintage Days

BUILDING LOCATION RULES:
- When a building IS in the provided building data below, use the "Nearby" field to accurately describe its location relative to other buildings.
- When a building or service is NOT in the provided data, use your general knowledge about Fresno State to answer confidently. For example, you know the Testing Center is in the Joyal Administration Building, the Admissions Office is in the Joyal Administration Building, the Financial Aid office is in the Joyal Administration Building, etc. Do NOT say "I don't have data" for well-known campus locations — answer with what you know and suggest the student verify details on fresnostate.edu if needed.
- Only say you don't know if you genuinely have no information about that location.

RESPONSE STYLE:
- Be friendly, concise, and helpful
- Use a warm, encouraging tone — you're a fellow Bulldog!
- If you don't know exact details (like hours that may change), say so and suggest checking the Fresno State website (fresnostate.edu) or calling the relevant office
- For time-sensitive info (deadlines, hours, events), remind students to verify on the official website

SCOPE: You should answer ANY question that relates to Fresno State University in any way — campus life, academics, services, history, sports, the city of Fresno as it relates to students, etc. Only politely decline questions that have absolutely no connection to Fresno State (e.g., "What is the capital of France?" or "Write me Python code"). For those, say something like: "I'm your Bulldog Campus Assistant, so I'm best at helping with Fresno State-related questions! Feel free to ask me anything about campus, classes, services, or student life."
`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getPolygonCenter(geojson: { geometry: { coordinates: number[][][] } }): [number, number] {
  const coords = geojson.geometry.coordinates[0];
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / coords.length, sumLat / coords.length];
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let buildingContextCache: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getBuildingContext(): Promise<string> {
  if (buildingContextCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return buildingContextCache;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const [{ data: buildings }, { data: polygons }] = await Promise.all([
      supabase.from("building").select("*"),
      supabase.from("building_polygons").select("id, geojson, building_id"),
    ]);

    if (!buildings || !polygons) return "";

    const centerMap = new Map<string, [number, number]>();
    for (const p of polygons) {
      if (p.geojson && p.building_id) {
        const geojson = typeof p.geojson === "string" ? JSON.parse(p.geojson) : p.geojson;
        if (geojson?.geometry?.coordinates) {
          centerMap.set(p.building_id, getPolygonCenter(geojson));
        }
      }
    }

    // Only include non-parking buildings for compact context
    const buildingInfos = buildings
      .filter((b) => centerMap.has(b.id) && !b.name.toLowerCase().includes("parking"))
      .map((b) => {
        const [lng, lat] = centerMap.get(b.id)!;
        return { id: b.id, name: b.name, lng, lat };
      });

    const lines: string[] = [];
    for (const b of buildingInfos) {
      const nearby = buildingInfos
        .filter((other) => other.id !== b.id)
        .map((other) => ({ name: other.name, dist: haversine(b.lat, b.lng, other.lat, other.lng) }))
        .sort((a, c) => a.dist - c.dist)
        .slice(0, 3);

      const nearbyStr = nearby.map((n) => `${n.name}(${Math.round(n.dist)}m)`).join(", ");
      lines.push(`${b.name} -> near: ${nearbyStr}`);
    }

    buildingContextCache = `\n\nBUILDING LOCATIONS (name -> nearest buildings with distance in meters):\n${lines.join("\n")}`;
    cacheTimestamp = Date.now();
    return buildingContextCache;
  } catch (error) {
    console.error("Failed to load building data:", error);
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };

    if (!messages || messages.length === 0) {
      return new Response("Messages are required", { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return new Response("Groq API key not configured", { status: 500 });
    }

    const buildingContext = await getBuildingContext();
    const systemPrompt = BASE_SYSTEM_PROMPT + buildingContext;

    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Failed to generate response", { status: 500 });
  }
}
