const TOKENOMICS_DATA = [
  { label: "Total Supply", value: "1,000,000,000", icon: "🌍" },
  { label: "Tax", value: "0%", icon: "✅" },
  { label: "Liquidity", value: "Burned", icon: "🔥" },
  { label: "Contract", value: "Renounced", icon: "🔒" },
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
              <div
                className={`text-green-400 font-black mb-1 ${
                  item.label === "Total Supply"
                    ? "text-[clamp(0.95rem,3.8vw,1.35rem)] sm:text-[1.55rem] leading-tight"
                    : "text-xl sm:text-2xl"
                }`}
              >
                {item.value}
              </div>
              <div className="text-gray-400 text-sm font-medium">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
