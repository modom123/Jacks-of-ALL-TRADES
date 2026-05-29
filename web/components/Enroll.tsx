'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle } from 'lucide-react';

const benefits = [
  'No prior experience required',
  'Paid training from day one',
  'Industry-recognized certifications',
  'Dedicated mentor support',
  'Job placement assistance',
  'Tools and safety gear provided',
];

export default function Enroll() {
  return (
    <section id="enroll" className="py-20 bg-lions-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-lions-blue text-sm font-semibold tracking-widest uppercase font-montserrat">
              Join the Program
            </span>
            <h2 className="font-montserrat font-black text-3xl sm:text-4xl text-white mt-2 mb-6">
              Start Your Trade Career Today
            </h2>
            <p className="font-opensans text-lions-silver mb-8 leading-relaxed">
              Applications are open to Detroit residents aged 18–35. No resume or prior trade
              experience needed — just the will to work and build something great.
            </p>

            <ul className="space-y-3 mb-8">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-3 font-opensans text-sm text-white">
                  <CheckCircle size={18} className="text-lions-blue flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <Link
              href="/apply"
              className="inline-flex items-center gap-2 px-8 py-4 bg-lions-blue hover:bg-lions-blue-light text-white font-montserrat font-bold rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-lions-blue/25"
            >
              Apply Now <ArrowRight size={18} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-lions-mid rounded-2xl p-8 border border-white/10"
          >
            <h3 className="font-montserrat font-bold text-white text-xl mb-6">
              Application Requirements
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Age', value: '18–35 years old' },
                { label: 'Residency', value: 'Detroit, MI resident' },
                { label: 'Education', value: 'HS diploma or GED preferred' },
                { label: 'Commitment', value: 'Full-time, Mon–Fri' },
                { label: 'Start Date', value: 'Rolling admissions' },
                { label: 'Cost', value: 'Free (funded by donors)' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                  <span className="font-opensans text-lions-silver text-sm">{item.label}</span>
                  <span className="font-montserrat font-semibold text-white text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
