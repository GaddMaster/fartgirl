import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fartgirlsolana.com"),
  title: "$FARTGIRL — The Gassiest Superheroine on the Blockchain",
  description:
    "FartGirl is the ultimate meme coin superheroine. Born from the FartBoy universe, powered by community, fueled by gas. Join the movement.",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "$FARTGIRL — The Gassiest Superheroine on the Blockchain",
    description:
      "Born from the FartBoy universe, powered by community, fueled by gas. Join the movement.",
    images: ["/cover.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "$FARTGIRL — The Gassiest Superheroine on the Blockchain",
    description:
      "Born from the FartBoy universe, powered by community, fueled by gas. Join the movement.",
    images: ["/cover.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-black text-white">{children}</body>
    </html>
  );
}
