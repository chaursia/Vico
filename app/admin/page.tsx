import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard · Vico Admin",
};

async function getDashboardStats() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/admin/dashboard`,
      {
        headers: { Authorization: `Bearer ${process.env.INTERNAL_ADMIN_TOKEN ?? ""}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminDashboard() {
  const data = await getDashboardStats();

  const stats = data?.stats ?? {
    total_users: "—",
    active_signals: "—",
    total_signals: "—",
    pending_safety_checks: "—",
    active_subscriptions: "—",
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>System overview and key metrics</p>
        </div>
        <span className="badge badge-success">● Live</span>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card stat-accent-1">
          <div className="icon-bg">👥</div>
          <div className="label">Total Users</div>
          <div className="value">{stats.total_users}</div>
        </div>
        <div className="stat-card stat-accent-2">
          <div className="icon-bg">📡</div>
          <div className="label">Active Signals</div>
          <div className="value">{stats.active_signals}</div>
        </div>
        <div className="stat-card stat-accent-3">
          <div className="icon-bg">🛡️</div>
          <div className="label">Safety Checks</div>
          <div className="value">{stats.pending_safety_checks}</div>
        </div>
        <div className="stat-card stat-accent-4">
          <div className="icon-bg">💳</div>
          <div className="label">Active Subs</div>
          <div className="value">{stats.active_subscriptions}</div>
        </div>
        <div className="stat-card">
          <div className="icon-bg">📊</div>
          <div className="label">Total Signals</div>
          <div className="value">{stats.total_signals}</div>
        </div>
      </div>

      {/* Recent signals */}
      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Signals</h3>
          <a href="/admin/signals" className="btn btn-ghost btn-sm">View all →</a>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Creator</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.recent_signals?.length ? (
                data.recent_signals.map((s: Record<string, string>) => (
                  <tr key={s.id}>
                    <td className="truncate">{s.title}</td>
                    <td>
                      <span className={`badge badge-${
                        s.status === "active" ? "success" :
                        s.status === "completed" ? "info" : "neutral"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="mono text-muted">{s.creator_id?.slice(0, 8)}…</td>
                    <td className="text-muted">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No signals found — connect to Supabase to see data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan breakdown */}
      {data?.plan_breakdown && (
        <div className="card mt-4">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Subscription Plans</h3>
          <div style={{ display: "flex", gap: 16 }}>
            {Object.entries(data.plan_breakdown).map(([plan, count]) => (
              <div key={plan} style={{ flex: 1, padding: "16px", background: "var(--bg-elevated)", borderRadius: "var(--radius)" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize" }}>{plan}</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{count as number}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
