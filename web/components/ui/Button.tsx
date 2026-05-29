import { forwardRef, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-montserrat font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-lions-blue focus:ring-offset-2 focus:ring-offset-lions-black disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-lions-blue hover:bg-lions-blue-light text-white shadow-lg shadow-lions-blue/25 hover:-translate-y-0.5':
              variant === 'primary',
            'bg-white/10 hover:bg-white/20 text-white': variant === 'secondary',
            'border border-lions-silver/30 hover:border-lions-blue text-white hover:-translate-y-0.5':
              variant === 'outline',
            'text-lions-silver hover:text-white': variant === 'ghost',
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-5 py-2.5 text-sm': size === 'md',
            'px-8 py-4 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
