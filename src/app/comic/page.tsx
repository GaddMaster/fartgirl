import type { Metadata } from "next";

import { listPublishedComicPages } from "@/lib/comic/pages";
import ComicReader from "./ComicReader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PROJECT CHLORIS Comic",
  description:
    "Read the Fart Girl comic in order. Follow Lena Cole through PROJECT CHLORIS, emerald gas, hard choices, and the city that will not leave her alone.",
  keywords: [
    "Fart Girl comic",
    "PROJECT CHLORIS comic",
    "FartGirl webcomic",
    "emerald superhero comic",
    "FartBoy universe",
  ],
  alternates: { canonical: "/comic" },
  openGraph: {
    type: "website",
    url: "https://www.fartgirlsolana.com/comic",
    siteName: "$FARTGIRL",
    title: "PROJECT CHLORIS — The Fart Girl Comic",
    description:
      "Read the Fart Girl comic in order. A broke barista, a buried laboratory, and emerald power that always sends a bill.",
    images: [{
      url: "https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/ELzDY.jpg",
      width: 1200,
      height: 630,
      alt: "PROJECT CHLORIS, the Fart Girl comic",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PROJECT CHLORIS — The Fart Girl Comic",
    description:
      "Read the Fart Girl comic in order. Emerald power, hard choices, and Kettle City after dark.",
    images: ["https://qxwpzu7euwaw00ro.public.blob.vercel-storage.com/ELzDY.jpg"],
  },
};

export default async function ComicPage({ searchParams }: PageProps<"/comic">) {
  const { page } = await searchParams;
  const pages = await listPublishedComicPages();
  const initialPageId = typeof page === "string" ? page : null;

  return (
    <ComicReader
      pages={pages}
      initialPageId={initialPageId}
    />
  );
}