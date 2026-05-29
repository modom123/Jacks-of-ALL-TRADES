'use client';

import { motion } from 'framer-motion';

const stats = [
  { value: '200+', label: 'Youth Apprentices Trained', icon: '👷' },
  { value: '85%', label: 'Job Placement Rate', icon: '📈' },
  { value: '$2M+', label: 'Wages Earned by Alumni', icon: '💵' },
  { value: '40+', label: 'Detroit Properties Renovated', icon: '🏚️' },
  { value: '60+', label: 'Mentor Volunteers', icon: '🤝' },
  { value: '6', label: 'Trade Specializations', icon: '🔑' },
];

export default function Impact() {
  return (
    <section id="impact" className="py-20 bg-lions-mid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-lions-blue text-sm font-semibold tracking-widest uppercase font-montserrat">
            Our Impact
          </span>
          <h2 className="font-montserrat font-black text-3xl sm:text-4xl text-white mt-2 mb-4">
            Real Change in Detroit
          </h2>
          <p className="font-opensans text-lions-silver max-w-xl mx-auto">
            Every number behind these stats is a person whose life we helped transform — and a
            neighborhood made stronger.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-lions-dark border border-white/10 rounded-2xl p-6 text-center hover:border-lions-blue/40 transition-colors"
            >
              <div className="text-3xl mb-3">{stat.icon}</div>
              <div className="font-montserrat font-black text-3xl text-lions-blue mb-1">
                {stat.value}
              </div>
              <div className="font-opensans text-lions-silver text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
