import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vico Admin",
  description: "Vico backend administration panel",
};

const NAV = [
  { href: "/admin",               label: "Dashboard",     icon: "📊" },
  { href: "/admin/users",         label: "Users",         icon: "👥" },
  { href: "/admin/signals",       label: "Signals",       icon: "📡" },
  { href: "/admin/moderation",    label: "Reports",       icon: "🚩" },
  { href: "/admin/safety",        label: "Safety Alerts", icon: "🛡️" },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: "💳" },
  { href: "/admin/settings",      label: "Settings",      icon: "⚙️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="admin-layout">
          {/* Sidebar */}
          <aside className="admin-sidebar">
            <div className="admin-logo">
              <h1>⬡ Vico</h1>
              <p>Admin Panel</p>
            </div>
            <nav className="sidebar-nav">
              <span className="nav-section-label">Main</span>
              {NAV.slice(0, 3).map((item) => (
                <Link key={item.href} href={item.href} className="nav-item">
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <span className="nav-section-label">Moderation</span>
              {NAV.slice(3, 5).map((item) => (
                <Link key={item.href} href={item.href} className="nav-item">
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <span className="nav-section-label">System</span>
              {NAV.slice(5).map((item) => (
                <Link key={item.href} href={item.href} className="nav-item">
                  <span className="icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Vico v1.0.0 · Admin
              </p>
            </div>
          </aside>

          {/* Main area */}
          <div className="admin-main">
            <header className="admin-topbar">
              <span className="topbar-title">Admin Panel</span>
              <div className="topbar-actions">
                <a href="/" className="btn btn-ghost btn-sm">
                  ↗ View API
                </a>
              </div>
            </header>
            <main className="admin-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
