'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Apply Online',
    description:
      'Fill out a simple application with your name, contact info, and the trade you want to learn. No experience required.',
  },
  {
    number: '02',
    title: 'Interview & Orientation',
    description:
      'Meet our team and tour our facilities. We match you with the right program and mentor based on your goals.',
  },
  {
    number: '03',
    title: 'Hands-On Training',
    description:
      'Work alongside licensed tradespeople on real Detroit projects. Earn while you learn from day one.',
  },
  {
    number: '04',
    title: 'Get Certified',
    description:
      'Complete your apprenticeship with an industry-recognized certification and a full-time job placement.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-lions-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-lions-blue text-sm font-semibold tracking-widest uppercase font-montserrat">
            Process
          </span>
          <h2 className="font-montserrat font-black text-3xl sm:text-4xl text-white mt-2 mb-4">
            How It Works
          </h2>
          <p className="font-opensans text-lions-silver max-w-xl mx-auto">
            From application to career in as little as six months. We guide you every step of the way.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-full w-full h-px bg-gradient-to-r from-lions-blue/40 to-transparent z-0" />
              )}
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-lions-blue/10 border border-lions-blue/30 flex items-center justify-center mb-4">
                  <span className="font-montserrat font-black text-lions-blue text-lg">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-montserrat font-bold text-white text-lg mb-2">{step.title}</h3>
                <p className="font-opensans text-lions-silver text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
