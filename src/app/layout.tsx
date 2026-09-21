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
  title: {
    default: "$FARTGIRL — The Gassiest Superheroine on Solana",
    template: "%s | $FARTGIRL",
  },
  description:
    "Meet FartGirl, the emerald-powered superheroine of the FartBoy universe. Explore the comic, discover the story, and join the loudest community on Solana.",
  applicationName: "FartGirl",
  authors: [{ name: "FartGirl" }],
  creator: "FartGirl",
  publisher: "FartGirl",
  category: "entertainment",
  keywords: [
    "FartGirl",
    "$FARTGIRL",
    "Fart Girl comic",
    "Project Chloris",
    "Solana meme coin",
    "FartBoy universe",
    "superhero comic",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "$FARTGIRL — The Gassiest Superheroine on Solana",
    description:
      "The emerald-powered superheroine of the FartBoy universe. Explore the comic, discover the story, and join the FartGirl community.",
    images: [{
      url: "https://www.fartgirlsolana.com/cover.png",
      width: 1200,
      height: 630,
      alt: "FartGirl, the emerald-powered superheroine",
    }],
    type: "website",
    url: "https://www.fartgirlsolana.com",
    siteName: "$FARTGIRL",
  },
  twitter: {
    card: "summary_large_image",
    title: "$FARTGIRL — The Gassiest Superheroine on Solana",
    description:
      "The emerald-powered superheroine of the FartBoy universe. Explore the comic and join the FartGirl community.",
    images: [{
      url: "https://www.fartgirlsolana.com/cover.png",
      alt: "FartGirl, the emerald-powered superheroine",
    }],
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
