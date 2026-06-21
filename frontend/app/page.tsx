export default function Home() {
  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>自媒体创作工作台</h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>v0.1 · 选题 + 文案</p>
      </header>

      <nav
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <a
          href="/topics"
          style={{
            padding: "1.5rem",
            border: "1px solid #eee",
            borderRadius: "8px",
            textDecoration: "none",
            color: "inherit",
            background: "#fafafa",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem" }}>
            选题工作台
          </h2>
          <p style={{ margin: 0, color: "#666", fontSize: "0.95rem" }}>
            生成、导入、筛选选题，并管理频道描述与历史视频。
          </p>
        </a>
      </nav>
    </main>
  );
}
