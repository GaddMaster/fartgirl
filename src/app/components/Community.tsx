import Image from "next/image";

const SOCIALS = [
  {
    name: "Twitter / X",
    icon: "𝕏",
    href: "#",
    color: "hover:bg-gray-800",
    desc: "Follow for updates & memes",
  },
  {
    name: "Telegram",
    icon: "✈️",
    href: "#",
    color: "hover:bg-blue-900/50",
    desc: "Join the community chat",
  },
  {
    name: "Discord",
    icon: "🎮",
    href: "#",
    color: "hover:bg-indigo-900/50",
    desc: "Hang with the FartGirl fam",
  },
  {
    name: "DexScreener",
    icon: "📊",
    href: "#",
    color: "hover:bg-green-900/50",
    desc: "View the live chart",
  },
];

export default function Community() {
  return (
    <section id="community" className="relative bg-black py-20 sm:py-28 overflow-hidden">
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Join the Community
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            The FartGirl army is growing. Don&apos;t miss the blast.
          </p>
        </div>

        {/* Feature image */}
        <div className="relative max-w-sm mx-auto mb-16 aspect-square rounded-3xl overflow-hidden border-2 border-green-500/30 shadow-2xl shadow-green-500/20">
          <Image
            src="/cover.png"
            alt="FartGirl community"
            fill
            className="object-cover"
          />
        </div>

        {/* Social links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {SOCIALS.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`bg-green-500/5 border border-green-500/20 rounded-2xl p-6 text-center transition-all hover:-translate-y-1 hover:border-green-400/50 ${social.color}`}
            >
              <div className="text-3xl mb-3">{social.icon}</div>
              <div className="text-white font-bold mb-1">{social.name}</div>
              <div className="text-gray-500 text-sm">{social.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
