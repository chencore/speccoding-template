"use client";

import { usePathname } from "next/navigation";

const SIDEBAR_WIDTH = 220;

interface NavItem {
  label: string;
  href: string;
  icon: string;
  disabled?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "产品工作台", href: "/", icon: "⊞" },
  { label: "选题雷达", href: "/topics", icon: "◎" },
  { label: "文案工坊", href: "/history", icon: "✎" },
  {
    label: "脚本工坊",
    href: "#",
    icon: "▶",
    disabled: true,
    badge: "即将开放",
  },
  {
    label: "视频工坊",
    href: "#",
    icon: "🎬",
    disabled: true,
    badge: "即将开放",
  },
  {
    label: "音频工坊",
    href: "#",
    icon: "♪",
    disabled: true,
    badge: "即将开放",
  },
  {
    label: "数据分析",
    href: "#",
    icon: "📊",
    disabled: true,
    badge: "即将开放",
  },
];

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <aside
        style={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          background: "#fff",
          borderRight: "1px solid #eee",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{ padding: "20px 16px", borderBottom: "1px solid #f3f4f6" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              选
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1f2937" }}>
                选题雷达
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                AI 创作工作台
              </div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.label}
                href={item.disabled ? undefined : item.href}
                onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 4,
                  textDecoration: "none",
                  color: item.disabled ? "#9ca3af" : "#4b5563",
                  background: isActive ? "#eff6ff" : "transparent",
                  borderLeft: isActive
                    ? "3px solid #2563eb"
                    : "3px solid transparent",
                  cursor: item.disabled ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>
                  {item.icon}
                </span>
                <span
                  style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}
                >
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 10,
                      background: "#f3f4f6",
                      color: "#9ca3af",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ck
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>
                独立创作者
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>个人频道</div>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ marginLeft: SIDEBAR_WIDTH, flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
