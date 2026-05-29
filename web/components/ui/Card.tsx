import { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function Card({ hover = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-lions-mid border border-white/10 rounded-2xl p-6',
        hover && 'hover:border-lions-blue/40 transition-all duration-200 hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
