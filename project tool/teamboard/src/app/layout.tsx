import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamBoard - Collaborative Project Management",
  description: "Plan projects, assign tasks and collaborate in real time with interactive Kanban boards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans bg-background text-foreground antialiased selection:bg-primary/10">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              className: "border border-border/80 shadow-lg backdrop-blur-md",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
