"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "./ComicReader.module.css";

type ComicPage = {
  pageId: string;
  order: number;
  day: number;
  date: string;
  slot: number;
  arcId: string;
  arcTitle: string;
  dayFocus: string;
  caption: string;
  hashtags: string[];
  generatedImageUrl: string;
  tweetId?: string | null;
  publishedAt?: string | null;
};

type ComicReaderProps = {
  pages: ComicPage[];
  initialPageId: string | null;
};

function ComicPreview({ page, position }: { page?: ComicPage; position: "previous" | "next" }) {
  if (!page) return null;

  return (
    <div className={`${styles.sidePage} ${styles[position]}`} aria-hidden="true">
      <Image
        src={page.generatedImageUrl}
        alt=""
        fill
        sizes="16vw"
        className={styles.comicImage}
      />
    </div>
  );
}

export default function ComicReader({ pages, initialPageId }: ComicReaderProps) {
  const requestedIndex = pages.findIndex((page) => page.pageId === initialPageId);
  const [index, setIndex] = useState(
    requestedIndex >= 0 ? requestedIndex : Math.max(0, pages.length - 1),
  );
  const touchStart = useRef<number | null>(null);
  const current = pages[index];
  const previous = pages[index - 1];
  const next = pages[index + 1];

  const moveTo = (nextIndex: number) => {
    setIndex(Math.max(0, Math.min(pages.length - 1, nextIndex)));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setIndex((currentIndex) => Math.max(0, currentIndex - 1));
      }
      if (event.key === "ArrowRight") {
        setIndex((currentIndex) => Math.min(pages.length - 1, currentIndex + 1));
      }
      if (event.key === "Home") setIndex(0);
      if (event.key === "End") setIndex(Math.max(0, pages.length - 1));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pages.length]);

  useEffect(() => {
    if (!current) return;
    window.history.replaceState(null, "", `/comic?page=${current.pageId}`);
  }, [current]);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) < 45) return;
    moveTo(distance > 0 ? index - 1 : index + 1);
  };

  if (!current) {
    return (
      <main className={styles.emptyShell}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} aria-hidden="true" />
          Fart Girl
        </Link>
        <div className={styles.emptyMark}>
          <Image
            src="/logo.png"
            alt="Fart Girl"
            fill
            priority
            sizes="9rem"
          />
        </div>
        <p className={styles.kicker}>Fart Girl</p>
        <h1 className={styles.emptyTitle}>PROJECT CHLORIS</h1>
        <p className={styles.emptyCopy}>Issue one is still in the press.</p>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} aria-hidden="true" />
          Fart Girl
        </Link>
        <div className={styles.titleBlock}>
          <p>Fart Girl</p>
          <h1>PROJECT CHLORIS</h1>
        </div>
        <p className={styles.issueCount}>{index + 1} / {pages.length}</p>
      </header>

      <section
        className={styles.reader}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label="Comic reader"
      >
        <ComicPreview page={previous} position="previous" />

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => moveTo(index - 1)}
          disabled={!previous}
          aria-label="Previous comic page"
          title="Previous page"
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        <article className={styles.currentPage} key={current.pageId}>
          <div className={styles.imageFrame}>
            <Image
              src={current.generatedImageUrl}
              alt={`PROJECT CHLORIS, day ${current.day}, page ${current.slot}`}
              fill
              priority
              sizes="(max-width: 767px) 92vw, (max-width: 1199px) 62vw, 560px"
              className={styles.comicImage}
            />
            <div className={styles.pageStamp}>D{String(current.day).padStart(3, "0")} · P{current.slot}</div>
          </div>
        </article>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => moveTo(index + 1)}
          disabled={!next}
          aria-label="Next comic page"
          title="Next page"
        >
          <ChevronRight aria-hidden="true" />
        </button>

        <ComicPreview page={next} position="next" />
      </section>

      <section className={styles.storyStrip} aria-live="polite">
        <div className={styles.storyMeta}>
          <p>{current.arcId} · {current.arcTitle}</p>
          <h2>Day {current.day}: {current.dayFocus}</h2>
        </div>
        <p className={styles.caption}>{current.caption}</p>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => moveTo(0)}
            className={styles.iconButton}
            disabled={index === 0}
            aria-label="Return to first page"
            title="First page"
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
          {current.tweetId ? (
            <a
              href={`https://x.com/i/status/${current.tweetId}`}
              target="_blank"
              rel="noreferrer"
              className={styles.iconButton}
              aria-label="View original post on X"
              title="View on X"
            >
              <ExternalLink size={18} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </section>

      <div className={styles.timeline}>
        <input
          type="range"
          min="0"
          max={Math.max(0, pages.length - 1)}
          value={index}
          onChange={(event) => moveTo(Number(event.target.value))}
          aria-label="Comic page"
        />
        <div className={styles.timelineLabels}>
          <span>Day 1</span>
          <span>Day {current.day}</span>
          <span>Day {pages.at(-1)?.day}</span>
        </div>
      </div>
    </main>
  );
}