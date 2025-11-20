'use server'

import { approveEvent as approveEventData, deleteEvent as deleteEventData } from "@/data";

export async function approveEventAction(eventId: string) {
  return await approveEventData(eventId);
}

export async function deleteEventAction(eventId: string) {
  return await deleteEventData(eventId);
}
