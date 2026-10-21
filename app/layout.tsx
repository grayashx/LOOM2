import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LOOM — Stories Worth Staying For", template: "%s · LOOM" },
  description: "Read your next favorite serialized story, build a library, and publish your own work on LOOM.",
  applicationName: "LOOM",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: { type: "website", siteName: "LOOM", title: "LOOM — Stories Worth Staying For", description: "A reader-and-writer ecosystem for serialized fiction." }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f2e9" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="loom-body"><Nav/><main className="site-main">{children}</main><footer className="site-footer"><div className="footer-brand"><span className="brand-mark">L</span><span>LOOM</span></div><p>Stories worth staying for. Words worth owning.</p><div className="footer-links"><a href="/legal/terms">Terms</a><a href="/legal/privacy">Privacy</a><a href="/explore">Explore</a><a href="/studio">Write with us</a></div><small>© {new Date().getFullYear()} LOOM. Authors retain ownership of their work.</small></footer></body></html>;
}
