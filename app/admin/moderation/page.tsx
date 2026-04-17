import type { Metadata } from "next";
export const metadata: Metadata = { title: "Reports · Vico Admin" };

export default function ModerationPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h2>Reports & Moderation</h2>
          <p>Manually review flagged content and user reports</p>
        </div>
        <span className="badge badge-warning">Manual Review</span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Reason</th>
              <th>Reporter</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🚩</div>
                No pending reports.<br />
                <code style={{ fontFamily: "monospace", fontSize: 11 }}>GET /api/admin/reports?status=pending</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
