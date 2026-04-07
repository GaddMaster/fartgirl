"use client";

export default function FartGirlGame() {
  return (
    <section id="fartgirl-game" className="relative bg-black py-20 sm:py-28">
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-transparent to-transparent" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 sm:p-12 text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
              FartGirl Game
            </span>
          </h2>
          <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto">
            Fresh start complete. This component is ready for the new game build.
          </p>
        </div>
      </div>
    </section>
  );
}
