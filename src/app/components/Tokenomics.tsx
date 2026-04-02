const TOKENOMICS_DATA = [
  { label: "Total Supply", value: "1,000,000,000", icon: "🌍" },
  { label: "Tax", value: "0%", icon: "✅" },
  { label: "Liquidity", value: "Burned", icon: "🔥" },
  { label: "Contract", value: "Renounced", icon: "🔒" },
];

const DISTRIBUTION = [
  { label: "Community / Airdrop", pct: 40, color: "from-green-400 to-green-500" },
  { label: "Liquidity Pool", pct: 30, color: "from-yellow-400 to-yellow-500" },
  { label: "Marketing", pct: 15, color: "from-orange-400 to-orange-500" },
  { label: "Team (Locked)", pct: 10, color: "from-green-300 to-lime-400" },
  { label: "CEX Reserve", pct: 5, color: "from-yellow-300 to-amber-400" },
];

export default function Tokenomics() {
  return (
    <section id="tokenomics" className="relative bg-black py-20 sm:py-28">
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
              Tokenomics
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Simple. Transparent. Community-first.
          </p>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {TOKENOMICS_DATA.map((item) => (
            <div
              key={item.label}
              className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 text-center hover:border-green-400/50 transition-colors"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="text-green-400 font-black text-xl sm:text-2xl mb-1">
                {item.value}
              </div>
              <div className="text-gray-400 text-sm font-medium">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Distribution bars */}
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-xl font-bold text-white mb-6 text-center">
            Token Distribution
          </h3>
          {DISTRIBUTION.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 font-medium">{item.label}</span>
                <span className="text-green-400 font-bold">{item.pct}%</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
