import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative bg-black border-t border-green-500/20 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-green-400">
              <Image
                src="/logo.png"
                alt="FartGirl"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-xl font-black text-green-400">$FARTGIRL</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <a href="#about" className="hover:text-green-400 transition-colors">About</a>
            <a href="#tokenomics" className="hover:text-green-400 transition-colors">Tokenomics</a>
            <a href="#gallery" className="hover:text-green-400 transition-colors">Gallery</a>
            <a href="#how-to-buy" className="hover:text-green-400 transition-colors">Buy</a>
            <a href="#roadmap" className="hover:text-green-400 transition-colors">Roadmap</a>
            <a href="#community" className="hover:text-green-400 transition-colors">Community</a>
          </div>

          {/* Disclaimer */}
          <p className="text-gray-600 text-xs text-center max-w-lg">
            $FARTGIRL is a meme coin with no intrinsic value or expectation of financial return.
            There is no formal team or roadmap. The coin is completely useless and for entertainment
            purposes only.
          </p>

          <p className="text-gray-700 text-xs">
            © {new Date().getFullYear()} FartGirl. All rights reserved. 💨
          </p>
        </div>
      </div>
    </footer>
  );
}
