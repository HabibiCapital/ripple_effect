"use server"

import { db } from "@/db/db";
import { deedsTable } from "@/db/schema";
import { desc } from "drizzle-orm";
import { MapLocation } from "@/types/ripple-types";

export async function getDeedsAction() {
  try {
    const deedsList = await db.select().from(deedsTable).orderBy(desc(deedsTable.createdAt));
    return { isSuccess: true, data: deedsList };
  } catch (error) {
    console.error("Failed to fetch deeds:", error);
    return { isSuccess: false, data: [], error: "Failed to fetch deeds" };
  }
}

export async function getMapDataAction() {
  try {
    // Get all deeds first, then filter in JavaScript
    const allDeeds = await db.select().from(deedsTable);
    
    // Filter for deeds with valid coordinates
    const deedsWithCoordinates = allDeeds.filter(
      deed => deed.latitude != null && deed.longitude != null
    );
    
    // Map to the expected format
    const locations: MapLocation[] = deedsWithCoordinates.map(deed => ({
      latitude: deed.latitude || 0,
      longitude: deed.longitude || 0,
      title: deed.title,
      impact: deed.impact || 1
    }));
    
    // If no real data, return sample data
    if (locations.length === 0) {
      return { 
        isSuccess: true, 
        data: [
          { latitude: 40.7128, longitude: -74.0060, title: "New York", impact: 5 },
          { latitude: 51.5074, longitude: -0.1278, title: "London", impact: 3 },
          { latitude: 35.6762, longitude: 139.6503, title: "Tokyo", impact: 4 }
        ] 
      };
    }
    
    return { isSuccess: true, data: locations };
  } catch (error) {
    console.error("Failed to fetch map data:", error);
    return { isSuccess: false, data: [], error: "Failed to fetch map data" };
  }
}

export async function createDeedAction(formData: FormData) {
  try {
    // Extract values from FormData
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    const latitudeStr = formData.get('latitude') as string;
    const longitudeStr = formData.get('longitude') as string;
    const impactStr = formData.get('impact') as string;
    
    // Parse numeric values
    const latitude = latitudeStr ? parseFloat(latitudeStr) : null;
    const longitude = longitudeStr ? parseFloat(longitudeStr) : null;
    const impact = impactStr ? parseInt(impactStr, 10) : 1;
    
    const result = await db.insert(deedsTable).values({
      title,
      description,
      location: location || null,
      latitude,
      longitude,
      impact,
      userId: 'anonymous' // Replace with actual user ID when auth is implemented
    }).returning();
    
    return { 
      isSuccess: true, 
      data: result[0],
      message: "Deed recorded successfully! Your ripple is spreading." 
    };
  } catch (error) {
    console.error("Failed to create deed:", error);
    return { 
      isSuccess: false, 
      error: "Failed to create deed",
      message: "Something went wrong. Please try again." 
    };
  }
}