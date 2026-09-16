import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AEGIS PROCURE — See the signal. Follow the evidence.",
    template: "%s · AEGIS PROCURE",
  },
  description:
    "An investigative intelligence layer for public procurement: detect unusual patterns, connect vendor relationships, check context, and prioritize the cases that deserve human review.",
};

export const viewport: Viewport = {
  themeColor: "#0f1215",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full bg-ground text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
