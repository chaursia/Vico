import type { Metadata } from "next";
export const metadata: Metadata = { title: "Signals · Vico Admin" };

export default function SignalsPage() {
  const STATUSES = ["all", "active", "completed", "expired"];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Signal Monitoring</h2>
          <p>Monitor, force-expire, or delete signals</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Slots</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
                Connect Supabase to see real signal data.<br />
                <code style={{ fontFamily: "monospace", fontSize: 11 }}>GET /api/admin/signals</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card mt-4 card-sm">
        <strong>API Reference</strong>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
          <div>GET  /api/admin/signals?status=active&page=1</div>
          <div>POST /api/admin/signals {"{"} signal_id, action: &quot;force_expire&quot; | &quot;delete&quot; {"}"}</div>
        </div>
      </div>
    </>
  );
}
