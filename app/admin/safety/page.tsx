import type { Metadata } from "next";
export const metadata: Metadata = { title: "Safety Alerts · Vico Admin" };

export default function SafetyPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h2>Safety Alerts</h2>
          <p>Unacknowledged safety checks and emergency contact status</p>
        </div>
        <span className="badge badge-danger">🛡️ Live</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="stat-card stat-accent-3">
          <div className="label">Unacknowledged</div>
          <div className="value">—</div>
        </div>
        <div className="stat-card stat-accent-4">
          <div className="label">Emergency Notified</div>
          <div className="value">—</div>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Signal</th>
              <th>Created</th>
              <th>Reminder Sent</th>
              <th>Emergency Notified</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                No pending safety checks — all users are accounted for.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card mt-4 card-sm">
        <strong>Safety Check Flow</strong>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8 }}>
          1. Signal completes → Safety checks created for all participants<br />
          2. WebSocket <code>safety_check</code> event sent to each user<br />
          3. After 10min → Reminder sent if unacknowledged<br />
          4. After 30min → Emergency contacts notified (SMS TODO)<br />
          5. User responds at <code>POST /api/safety/confirm</code>
        </div>
      </div>
    </>
  );
}
