'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] =
      [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 118, 182, ${p.alpha})`;
        ctx.fill();
      });
      animFrame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-lions-black">
      {/* Gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-lions-black via-lions-mid to-lions-dark" />
      <div className="absolute inset-0 bg-gradient-to-t from-lions-black/80 via-transparent to-transparent" />

      <Particles />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-widest uppercase text-lions-blue border border-lions-blue/40 rounded-full bg-lions-blue/10">
            Detroit Nonprofit Apprenticeship Program
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="font-montserrat font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-6"
        >
          Building Futures,{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-lions-blue to-lions-blue-light">
            Rebuilding Detroit
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-opensans text-lions-silver text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Jacks of All Trades connects Detroit youth with skilled tradespeople, providing
          hands-on apprenticeships and mentoring that transform lives and revitalize our city.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/apply"
            className="px-8 py-4 bg-lions-blue hover:bg-lions-blue-light text-white font-montserrat font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-lions-blue/30 hover:shadow-lions-blue/50 hover:-translate-y-0.5"
          >
            Apply Now
          </Link>
          <a
            href="#programs"
            className="px-8 py-4 border border-lions-silver/30 hover:border-lions-blue text-white font-montserrat font-semibold text-base rounded-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            Learn More
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto"
        >
          {[
            { value: '200+', label: 'Youth Trained' },
            { value: '6', label: 'Trade Programs' },
            { value: '$2M+', label: 'Wages Generated' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-montserrat font-black text-2xl sm:text-3xl text-lions-blue">
                {stat.value}
              </div>
              <div className="font-opensans text-xs text-lions-silver mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <div className="w-5 h-8 border-2 border-lions-silver/30 rounded-full flex items-start justify-center pt-1">
          <div className="w-1 h-2 bg-lions-blue rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}
