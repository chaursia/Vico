import { z } from "zod";

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(200).optional(),
  profile_photo: z.string().url().optional(),
  interests: z.array(z.string().max(30)).max(10).optional(),
});

export const emergencyContactSchema = z.object({
  contact_name: z.string().min(2).max(100),
  relationship: z.string().min(2).max(50),
  phone_number: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number format"),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
