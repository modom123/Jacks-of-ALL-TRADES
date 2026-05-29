'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const programs = [
  {
    icon: '🪚',
    title: 'Carpentry',
    description:
      'Learn framing, finishing, cabinetry, and furniture making. Build the structures that define our city.',
    duration: '12 months',
    wage: '$18–$28/hr',
  },
  {
    icon: '⚡',
    title: 'Electrical',
    description:
      'Master wiring, panel installation, and code compliance. Power homes and businesses across Detroit.',
    duration: '18 months',
    wage: '$22–$35/hr',
  },
  {
    icon: '🔧',
    title: 'Plumbing',
    description:
      'From pipe fitting to fixture installation. Keep Detroit flowing with essential water systems.',
    duration: '18 months',
    wage: '$20–$32/hr',
  },
  {
    icon: '🌿',
    title: 'Landscaping',
    description:
      'Transform urban spaces into green havens. Horticulture, design, and sustainable grounds care.',
    duration: '9 months',
    wage: '$16–$22/hr',
  },
  {
    icon: '🏠',
    title: 'Drywalling',
    description:
      'Hanging, taping, finishing, and texturing. Shape the interiors of Detroit's rebirth.',
    duration: '6 months',
    wage: '$17–$25/hr',
  },
  {
    icon: '🔨',
    title: 'Roofing',
    description:
      'Shingles, flat roofs, insulation, and repairs. Protect Detroit families from the elements.',
    duration: '9 months',
    wage: '$19–$28/hr',
  },
];

export default function Programs() {
  return (
    <section id="programs" className="py-20 bg-lions-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-lions-blue text-sm font-semibold tracking-widest uppercase font-montserrat">
            Trade Programs
          </span>
          <h2 className="font-montserrat font-black text-3xl sm:text-4xl text-white mt-2 mb-4">
            Six Paths to a Career
          </h2>
          <p className="font-opensans text-lions-silver max-w-xl mx-auto">
            Every program pairs classroom instruction with real job sites, giving apprentices
            marketable skills and industry certifications.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program, i) => (
            <motion.div
              key={program.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="bg-lions-mid border border-white/10 hover:border-lions-blue/50 rounded-2xl p-6 transition-all duration-200 group cursor-default"
            >
              <div className="text-4xl mb-4">{program.icon}</div>
              <h3 className="font-montserrat font-bold text-white text-xl mb-2 group-hover:text-lions-blue transition-colors">
                {program.title}
              </h3>
              <p className="font-opensans text-lions-silver text-sm mb-4 leading-relaxed">
                {program.description}
              </p>
              <div className="flex gap-4 text-xs font-semibold font-montserrat">
                <span className="text-lions-blue/80">⏱ {program.duration}</span>
                <span className="text-green-400/80">💰 {program.wage}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/apply"
            className="inline-block px-8 py-4 bg-lions-blue hover:bg-lions-blue-light text-white font-montserrat font-bold rounded-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            Apply to a Program
          </Link>
        </div>
      </div>
    </section>
  );
}
