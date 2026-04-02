import Image from "next/image";

export default function About() {
  return (
    <section id="about" className="relative bg-black py-20 sm:py-28 overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <div className="relative aspect-square max-w-md mx-auto w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-yellow-500/20 rounded-3xl rotate-3" />
            <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-green-500/30">
              <Image
                src="/cover.png"
                alt="FartGirl character"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Text */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-black mb-6">
              <span className="bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
                Who is FartGirl?
              </span>
            </h2>
            <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
              <p>
                FartGirl is the superheroine that the crypto world didn&apos;t know it needed. 
                Born from the legendary FartBoy universe, she brings the power of gas to the blockchain — 
                and she&apos;s here to <span className="text-green-400 font-semibold">blow the competition away</span>.
              </p>
              <p>
                With her iconic green suit, unstoppable confidence, and a community that&apos;s absolutely 
                <span className="text-yellow-400 font-semibold"> explosive</span>, FartGirl is more than 
                just a meme coin. She&apos;s a movement.
              </p>
              <p className="text-green-400 font-bold text-xl">
                💨 Gas fees? She IS the gas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
