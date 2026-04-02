"use client";

import Image from "next/image";
import { useState } from "react";

const IMAGES = [
  "/IMG_0966.webp",
  "/IMG_1679.webp",
  "/IMG_4284.webp",
  "/IMG_4285.webp",
  "/IMG_4286.webp",
  "/IMG_4288.webp",
  "/IMG_4289.webp",
  "/IMG_4565.webp",
  "/IMG_5155.webp",
  "/IMG_5245.webp",
  "/IMG_5571.webp",
  "/IMG_5573.webp",
  "/IMG_5576.webp",
  "/IMG_6792.webp",
  "/IMG_6948.webp",
  "/IMG_6949.webp",
  "/IMG_9087.webp",
  "/IMG_9140.webp",
  "/IMG_9743.webp",
  "/IMG_9744.webp",
  "/6B56236A-EEFE-4173-9762-C5DBD04152FD.jpg",
];

export default function ImageGallery() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section id="gallery" className="relative bg-black py-20 sm:py-28">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Gallery
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            FartGirl in all her glory. Save, share, meme it up.
          </p>
        </div>

        {/* Grid of square images */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {IMAGES.map((src) => (
            <button
              key={src}
              onClick={() => setSelected(src)}
              className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-green-400 transition-all hover:scale-[1.03] group"
            >
              <Image
                src={src}
                alt="FartGirl meme"
                fill
                className="object-cover group-hover:brightness-110 transition-all"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div className="relative w-full max-w-lg aspect-square rounded-2xl overflow-hidden">
            <Image
              src={selected}
              alt="FartGirl meme"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 90vw, 500px"
            />
          </div>
          <button
            onClick={() => setSelected(null)}
            className="absolute top-6 right-6 text-white text-3xl hover:text-green-400 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
