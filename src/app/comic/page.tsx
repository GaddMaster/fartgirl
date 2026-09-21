import type { Metadata } from "next";

import { listPublishedComicPages } from "@/lib/comic/pages";
import ComicReader from "./ComicReader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PROJECT CHLORIS — Fart Girl",
  description: "Read PROJECT CHLORIS in publishing order.",
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