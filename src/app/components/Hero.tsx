import Image from "next/image";
import GreenGasCanvas from "./GreenGasCanvas";

export default function Hero() {
  return (
    <section className="relative isolate min-h-screen flex items-center justify-center overflow-hidden bg-black">
      <GreenGasCanvas />

      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(110%_70%_at_50%_100%,rgba(34,197,94,0.16),transparent_58%),radial-gradient(90%_55%_at_50%_0%,rgba(0,0,0,0.3),transparent_60%)]" />

      {/* Content over canvas */}
      <div className="relative z-20 flex flex-col items-center text-center px-4 py-20 sm:py-32 gap-6 sm:gap-8">
        {/* Logo */}
        <div className="relative w-32 h-32 sm:w-44 sm:h-44 lg:w-56 lg:h-56 rounded-3xl overflow-hidden border-4 border-green-400 shadow-2xl shadow-green-500/40 animate-pulse-slow">
          <Image
            src="/logo.png"
            alt="FartGirl"
            fill
            loading="eager"
            sizes="(max-width: 639px) 8rem, (max-width: 1023px) 11rem, 14rem"
            className="object-cover"
            priority
          />
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
            FARTGIRL
          </span>
        </h1>

        <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 max-w-2xl font-medium">
          The gassiest superheroine on the blockchain.
          <br className="hidden sm:block" />
          Born from the FartBoy universe — powered by community.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <a
            href="#how-to-buy"
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-yellow-500 text-black font-black rounded-full text-lg hover:from-green-400 hover:to-yellow-400 transition-all hover:scale-105 shadow-xl shadow-green-500/30"
          >
            Buy $FARTGIRL
          </a>
          <a
            href="#about"
            className="px-8 py-4 border-2 border-green-400 text-green-400 font-bold rounded-full text-lg hover:bg-green-400/10 transition-all hover:scale-105"
          >
            Learn More
          </a>
        </div>

        {/* Contract badge */}
        <div className="mt-6 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-sm text-green-300 max-w-full overflow-hidden">
          <span className="text-green-500 font-semibold">CA: </span>
          <span className="break-all text-xs sm:text-sm font-mono">
            Cjrrc595e9R47EZ3gkbUmL6ZZpLSxiXg16v2Y3Aapump
          </span>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-20" />
    </section>
  );
}
