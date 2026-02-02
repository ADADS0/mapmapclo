"use client";

import { motion } from "framer-motion";
import { Network, Eye, Clock, Palette, Search, LineChart } from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Force-Directed Graph",
    description: "Interactive network visualization with real-time physics simulation. Drag, zoom, and explore connections.",
    color: "#00ff88",
  },
  {
    icon: Eye,
    title: "Wallet Tracking",
    description: "Monitor any wallet address and see all connected transactions and interactions in one view.",
    color: "#ff00ff",
  },
  {
    icon: Clock,
    title: "Time Travel",
    description: "Scrub through blockchain history to see how the network evolved over time.",
    color: "#00ffff",
  },
  {
    icon: Palette,
    title: "5 Visual Themes",
    description: "Choose from Neon Cyber, Matrix, Deep Ocean, Sunset, and Midnight themes.",
    color: "#ffff00",
  },
  {
    icon: Search,
    title: "Smart Filters",
    description: "Filter by wallet type, balance, risk score, and transaction count to find what matters.",
    color: "#ff8800",
  },
  {
    icon: LineChart,
    title: "Analytics Dashboard",
    description: "Real-time statistics and charts showing network activity and trends.",
    color: "#8844ff",
  },
];

export function FeaturesSection() {
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Powerful </span>
            <span className="text-[#00ff88]">Features</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Everything you need to analyze and understand blockchain networks at a glance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass rounded-2xl p-6 group hover:border-[#00ff88]/20 transition-all duration-300 cursor-pointer"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${feature.color}15` }}
              >
                <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
