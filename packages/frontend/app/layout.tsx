import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <div className="flex min-h-screen pb-14 md:pb-0">
          <aside className="hidden md:flex flex-col w-[200px] bg-surface border-r border-border-light p-4 shrink-0">
            <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-8">ResumeMatcher</h1>
            <nav className="flex flex-col gap-1">
              <a href="/dashboard" className="px-3 py-2 rounded text-sm text-accent bg-surface-tertiary font-medium">仪表盘</a>
              <a href="/upload" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">上传简历</a>
              <a href="/jobs" className="px-3 py-2 rounded text-sm text-text-secondary hover:bg-surface-tertiary">我的 JD</a>
            </nav>
          </aside>
          <main className="flex-1 p-4 md:p-6 max-w-[960px]">{children}</main>
        </div>
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border-light flex justify-around py-2 z-50">
          <a href="/dashboard" className="flex flex-col items-center text-xs text-accent">📄 仪表盘</a>
          <a href="/upload" className="flex flex-col items-center text-xs text-text-secondary">📤 上传</a>
          <a href="/jobs" className="flex flex-col items-center text-xs text-text-secondary">📋 JD</a>
        </nav>
      </body>
    </html>
  );
}