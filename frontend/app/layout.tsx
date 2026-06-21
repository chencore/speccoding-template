import SidebarLayout from "./components/SidebarLayout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, padding: 0 }}>
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}
