import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "@/styles/globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Footer } from "@/components";

export const metadata: Metadata = {
  title: "¿Cuánto Te Debo?",
  description: "Dividí los gastos del grupo y mirá quién le paga a quién",
  authors: [
    {
      name: "Sebastian Alfieri",
      url: "https://www.linkedin.com/in/sebastianalfieri/",
    },
  ],
  // Los íconos y la imagen para compartir salen de app/ (favicon.ico, icon.png, apple-icon.png, opengraph-image.png).
  metadataBase: new URL("https://cuantotedebo.com"),
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "¿Cuánto Te Debo?",
    title: "¿Cuánto Te Debo?",
    description: "Dividí los gastos del grupo y mirá quién le paga a quién",
  },
  twitter: {
    card: "summary_large_image",
  },
  // openGraph: {
  //   type: "website",
  //   url: "https://subelealamexcla.byspotify.com",
  //   images: [
  //     {
  //       url: "share/Share-600x600.png",
  //       width: 600,
  //       height: 600,
  //       alt: "The Corner logo",
  //     },
  //     {
  //       url: "/share/Share-1024x512.png",
  //       width: 1024,
  //       height: 512,
  //       alt: "The Corner logo",
  //     },
  //     {
  //       url: "share/Share-1080x1080.png",
  //       width: 1080,
  //       height: 1080,
  //       alt: "The Corner logo",
  //     },
  //     {
  //       url: "/share/Share-1080x1920.png",
  //       width: 1080,
  //       height: 1920,
  //       alt: "The Corner logo",
  //     },
  //   ],
  // },
};

export const viewport: Viewport = {
  themeColor: "#1d4fd6",
};

const manrope = Manrope({
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={manrope.variable}>
        {children} <Analytics />
        <Footer />
      </body>
    </html>
  );
}
