"use client";

const STEPS = [
  {
    num: "01",
    title: "Create a Wallet",
    desc: "Download Phantom or Solflare wallet. Available on iOS, Android, and browser extensions.",
    icon: "👛",
  },
  {
    num: "02",
    title: "Get Some SOL",
    desc: "Buy SOL from an exchange like Coinbase or Binance and send it to your wallet.",
    icon: "💰",
  },
  {
    num: "03",
    title: "Go to a DEX",
    desc: "Head to Raydium or Jupiter. Connect your wallet and paste the $FARTGIRL contract address.",
    icon: "🔄",
  },
  {
    num: "04",
    title: "Swap for $FARTGIRL",
    desc: "Set your slippage, swap your SOL for $FARTGIRL, and join the gassiest community in crypto!",
    icon: "💨",
  },
];

export default function HowToBuy() {
  return (
    <section id="how-to-buy" className="relative bg-black py-20 sm:py-28 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
              How to Buy
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Four simple steps to join the FartGirl army.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="bg-gradient-to-b from-green-500/10 to-transparent border border-green-500/20 rounded-2xl p-6 hover:border-green-400/50 transition-all hover:-translate-y-1 group"
            >
              <div className="text-4xl mb-4">{step.icon}</div>
              <div className="text-green-400 font-mono text-sm mb-2">
                Step {step.num}
              </div>
              <h3 className="text-white font-bold text-xl mb-3 group-hover:text-green-400 transition-colors">
                {step.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Contract address CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-2xl px-6 sm:px-8 py-6">
            <span className="text-green-400 font-bold text-sm uppercase tracking-wider">
              Contract Address
            </span>
            <code className="text-white text-xs sm:text-sm font-mono break-all max-w-md">
              Cjrrc595e9R47EZ3gkbUmL6ZZpLSxiXg16v2Y3Aapump
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText("Cjrrc595e9R47EZ3gkbUmL6ZZpLSxiXg16v2Y3Aapump");
              }}
              className="mt-1 px-5 py-2 bg-green-500 text-black font-bold rounded-full text-sm hover:bg-green-400 transition-colors"
            >
              Copy Address
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
