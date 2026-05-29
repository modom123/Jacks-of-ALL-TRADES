'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export default function Donate() {
  return (
    <section id="donate" className="py-20 bg-lions-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="w-16 h-16 rounded-2xl bg-lions-blue/10 border border-lions-blue/30 flex items-center justify-center mx-auto mb-6">
            <Heart size={28} className="text-lions-blue" />
          </div>

          <span className="text-lions-blue text-sm font-semibold tracking-widest uppercase font-montserrat">
            Support Our Mission
          </span>
          <h2 className="font-montserrat font-black text-3xl sm:text-4xl text-white mt-2 mb-4">
            Invest in Detroit's Future
          </h2>
          <p className="font-opensans text-lions-silver max-w-xl mx-auto mb-8 leading-relaxed">
            Your donation pays for tools, materials, certifications, and instructor time. Every
            dollar turns a young Detroiter into a skilled professional.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-8 max-w-xl mx-auto">
            {[
              { amount: '$25', label: 'Buys safety gloves for one apprentice' },
              { amount: '$100', label: 'Covers one week of supplies' },
              { amount: '$500', label: 'Sponsors an entire certification' },
            ].map((tier) => (
              <div
                key={tier.amount}
                className="bg-lions-mid border border-white/10 rounded-xl p-4 text-center hover:border-lions-blue/40 transition-colors"
              >
                <div className="font-montserrat font-black text-2xl text-lions-blue mb-1">
                  {tier.amount}
                </div>
                <div className="font-opensans text-lions-silver text-xs">{tier.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/donate"
              className="px-8 py-4 bg-lions-blue hover:bg-lions-blue-light text-white font-montserrat font-bold rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-lions-blue/25"
            >
              Donate Now
            </Link>
            <Link
              href="/shop"
              className="px-8 py-4 border border-lions-silver/30 hover:border-lions-blue text-white font-montserrat font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              Visit Our Shop
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
