const PHASES = [
  {
    phase: "Phase 1",
    title: "The Gas Leak",
    status: "active" as const,
    items: [
      "Website launch",
      "Social media takeover",
      "Community building",
      "Stealth launch on Raydium",
      "1,000 holders",
    ],
  },
  {
    phase: "Phase 2",
    title: "The Rumble",
    status: "upcoming" as const,
    items: [
      "CoinGecko & CoinMarketCap listings",
      "Influencer partnerships",
      "Meme contests & airdrops",
      "5,000 holders",
      "First CEX listing",
    ],
  },
  {
    phase: "Phase 3",
    title: "The Explosion",
    status: "upcoming" as const,
    items: [
      "Major CEX listings",
      "FartGirl NFT collection",
      "Merchandise store",
      "FartBoy collaboration event",
      "25,000 holders",
    ],
  },
  {
    phase: "Phase 4",
    title: "The Aftermath",
    status: "upcoming" as const,
    items: [
      "FartGirl animated series",
      "DAO governance launch",
      "Cross-chain expansion",
      "100,000 holders",
      "World domination 💨",
    ],
  },
];

export default function Roadmap() {
  return (
    <section id="roadmap" className="relative bg-black py-20 sm:py-28">
      <div className="absolute inset-0 bg-gradient-to-t from-green-500/5 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
              Roadmap
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Our path to gassy greatness.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PHASES.map((phase) => (
            <div
              key={phase.phase}
              className={`rounded-2xl p-6 border transition-all hover:-translate-y-1 ${
                phase.status === "active"
                  ? "bg-gradient-to-b from-green-500/20 to-green-500/5 border-green-400/50 shadow-lg shadow-green-500/10"
                  : "bg-green-500/5 border-green-500/15 hover:border-green-500/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    phase.status === "active"
                      ? "bg-green-400 text-black"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {phase.phase}
                </span>
                {phase.status === "active" && (
                  <span className="text-green-400 text-xs font-semibold animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <h3 className="text-white font-bold text-xl mb-4">
                {phase.title}
              </h3>
              <ul className="space-y-2">
                {phase.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-gray-400 text-sm"
                  >
                    <span className="text-green-400 mt-0.5">○</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
