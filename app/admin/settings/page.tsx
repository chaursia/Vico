import type { Metadata } from "next";
export const metadata: Metadata = { title: "Settings · Vico Admin" };

const TOGGLES = [
  { key: "registrations",    label: "User Registrations",   desc: "Allow new users to sign up" },
  { key: "subscriptions",    label: "Subscriptions",         desc: "Enable Stripe subscription payments" },
  { key: "signal_creation",  label: "Signal Creation",       desc: "Allow users to create new signals" },
  { key: "chat_system",      label: "Chat System",           desc: "Enable personal and room chat" },
  { key: "safety_system",    label: "Safety System",         desc: "Enable post-signal safety checks" },
  { key: "maintenance_mode", label: "Maintenance Mode",      desc: "Takes the app offline for users" },
];

export default function SettingsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h2>Feature Settings</h2>
          <p>Enable or disable platform features at runtime</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {TOGGLES.map((toggle, i) => (
            <div
              key={toggle.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 0",
                borderBottom: i < TOGGLES.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{toggle.label}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {toggle.desc}
                </div>
                <code style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                  PATCH /api/admin/toggles {"{"} key: &quot;{toggle.key}&quot; {"}"}
                </code>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className={`badge ${toggle.key === "maintenance_mode" ? "badge-warning" : "badge-success"}`}
                >
                  {toggle.key === "maintenance_mode" ? "OFF" : "ON"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4" style={{ padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text-muted)" }}>
          💡 Toggles are controlled via the API. Connect a frontend or use the API directly:<br />
          <code style={{ fontFamily: "monospace" }}>PATCH /api/admin/toggles</code> with <code>{'{'}key, enabled{'}'}</code>
        </div>
      </div>
    </>
  );
}
