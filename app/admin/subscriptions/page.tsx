import type { Metadata } from "next";
export const metadata: Metadata = { title: "Subscriptions · Vico Admin" };

export default function SubscriptionsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h2>Subscriptions</h2>
          <p>Stripe subscription and payment management</p>
        </div>
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
        >
          ↗ Stripe Dashboard
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {["Active", "Past Due", "Canceled"].map((label, i) => (
          <div key={label} className="stat-card">
            <div className="label">{label}</div>
            <div className="value" style={{ fontSize: 24 }}>—</div>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>Stripe ID</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                Connect Stripe to see subscription data.<br />
                <code style={{ fontFamily: "monospace", fontSize: 11 }}>GET /api/subscription/status</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card mt-4 card-sm">
        <strong>Webhook Endpoint</strong>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
          POST /api/subscription/webhook<br />
          Register this URL in your Stripe Dashboard → Webhooks
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          Events handled: <code>checkout.session.completed</code>, <code>customer.subscription.updated</code>,{" "}
          <code>customer.subscription.deleted</code>, <code>invoice.payment_succeeded</code>,{" "}
          <code>invoice.payment_failed</code>
        </div>
      </div>
    </>
  );
}
