import type { Metadata } from "next";
import { Roboto, Bebas_Neue } from "next/font/google";
import "@/styles/globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Footer } from "@/components";

export const metadata: Metadata = {
  title: "¿Cuánto Te Debo?",
  description: "Distribuye pagos para que todos paguen la misma cantidad",
  authors: [
    {
      name: "Sebastian Alfieri",
      url: "https://www.linkedin.com/in/sebastianalfieri/",
    },
  ],
  // metadataBase: new URL("http://thecorner.uy"),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/favicon.ico",
    },
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

const roboto = Roboto({
  weight: ["100", "300", "400", "700", "900"],
  variable: "--roboto",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  weight: "400",
  variable: "--bebas",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${bebas.variable}`}>
        {children} <Analytics />
        <Footer />
      </body>
    </html>
  );
}
