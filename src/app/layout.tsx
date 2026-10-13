import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

// latin-ext is needed for č, ć, đ, š, ž.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "FRICK",
  description: "Nedeljni taskovi, boss i rangovi za ekipu.",
  appleWebApp: {
    capable: true,
    title: "FRICK",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

// Keep in sync with --color-abyss in globals.css.
export const viewport: Viewport = {
  themeColor: "#010a13",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sr-Latn"
      className={`${inter.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
