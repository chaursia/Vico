import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { getUserById } from "@/lib/db/users";

// GET /api/users/[id]
export const GET = withAuth(
  async (_req: NextRequest, _user, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { data, error } = await getUserById(id);
    if (error || !data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // Strip sensitive fields for public view
    const { is_admin, ...publicData } = data as typeof data & { is_admin: boolean };
    return NextResponse.json({ user: publicData });
  }
);
