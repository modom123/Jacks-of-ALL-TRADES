import { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-opensans text-sm text-lions-silver font-medium">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full bg-lions-mid border rounded-xl px-4 py-3 text-white placeholder-white/30 font-opensans text-sm focus:outline-none focus:ring-2 transition-all',
            error
              ? 'border-red-500/60 focus:ring-red-500/40'
              : 'border-white/10 focus:border-lions-blue focus:ring-lions-blue/30',
            className
          )}
          {...props}
        />
        {error && <p className="text-red-400 text-xs font-opensans">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
