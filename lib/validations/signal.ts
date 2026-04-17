import { z } from "zod";

// India bounding box — validated in sync with lib/mappls/client.ts
const indiaLat = () => z.number().min(6.46).max(37.09);
const indiaLng = () => z.number().min(68.10).max(97.41);

export const createSignalSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(10).max(500),
  category: z.enum([
    "meetup",
    "sports",
    "food",
    "study",
    "music",
    "gaming",
    "travel",
    "other",
  ]),
  latitude: indiaLat(),
  longitude: indiaLng(),
  location_name: z.string().min(2).max(200),
  duration: z.number().int().min(15).max(480), // 15 min – 8 hrs
  slots: z.number().int().min(2).max(50),
  safety_check_time: z.number().int().min(5).max(60),
});

export const joinSignalSchema = z.object({
  signal_id: z.string().uuid(),
});

export const completeSignalSchema = z.object({
  signal_id: z.string().uuid(),
});

export const signalNoticeSchema = z.object({
  signal_id: z.string().uuid(),
  message: z.string().min(1).max(300),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(6.46).max(37.09),
  lng: z.coerce.number().min(68.10).max(97.41),
  radius: z.coerce.number().min(1).max(50).default(10),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});


export type CreateSignalInput = z.infer<typeof createSignalSchema>;
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
