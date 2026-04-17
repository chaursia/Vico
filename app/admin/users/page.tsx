import type { Metadata } from "next";
export const metadata: Metadata = { title: "Users · Vico Admin" };

export default function UsersPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h2>User Management</h2>
          <p>View, search, ban, and promote users</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="search" placeholder="Search username…" style={{ width: 220 }} />
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Trust Score</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                Connect Supabase to see real user data.<br />
                <code style={{ fontFamily: "monospace", fontSize: 11 }}>GET /api/admin/users</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card mt-4 card-sm">
        <strong>API Reference</strong>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
          <div>GET  /api/admin/users?page=1&limit=20&search=username</div>
          <div>POST /api/admin/users  {"{"} user_id, action: &quot;ban&quot; | &quot;unban&quot; | &quot;make_admin&quot; | &quot;remove_admin&quot; {"}"}</div>
        </div>
      </div>
    </>
  );
}
