import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string;
  is_admin: boolean;
}

/**
 * Verifies the Bearer JWT from the Authorization header.
 * Returns the authenticated user or throws a Response error.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Missing authorization token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch extended profile for is_admin flag
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    is_admin: profile?.is_admin ?? false,
  };
}

/**
 * Asserts the user is an admin — throws 403 if not.
 */
export async function verifyAdmin(req: NextRequest): Promise<AuthUser> {
  const user = await verifyAuth(req);
  if (!user.is_admin) {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Wraps a handler so auth errors (thrown as Response) are caught and returned.
 * The handler may optionally accept a third `context` argument (e.g. Next.js dynamic route params).
 */
export function withAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: NextRequest, user: AuthUser, context?: any) => Promise<Response>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, context?: any) => {
    try {
      const user = await verifyAuth(req);
      return await handler(req, user, context);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

export function withAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: NextRequest, user: AuthUser, context?: any) => Promise<Response>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, context?: any) => {
    try {
      const user = await verifyAdmin(req);
      return await handler(req, user, context);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
