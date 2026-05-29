'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Heart } from 'lucide-react';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import clsx from 'clsx';

const schema = z.object({
  donor_name: z.string().optional(),
  donor_email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  custom_amount: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PRESET_AMOUNTS = [25, 50, 100, 250];

const DONATION_TYPES = [
  { value: 'financial', label: 'Financial Gift' },
  { value: 'tools', label: 'Tools Donation' },
  { value: 'materials', label: 'Materials' },
  { value: 'time', label: 'Time / Volunteer' },
];

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [donationType, setDonationType] = useState('financial');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const customAmount = watch('custom_amount');

  const getAmountCents = (): number | null => {
    if (customAmount) {
      const parsed = parseFloat(customAmount.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed >= 1) return Math.round(parsed * 100);
      return null;
    }
    return selectedAmount ? selectedAmount * 100 : null;
  };

  const onSubmit = async (data: FormData) => {
    setError('');
    const amountCents = getAmountCents();
    if (!amountCents) {
      setError('Please select or enter a donation amount.');
      return;
    }

    try {
      const result = await api.createDonationSession({
        donor_name: data.donor_name || undefined,
        donor_email: data.donor_email || undefined,
        amount_cents: amountCents,
        type: donationType,
      });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout session.');
    }
  };

  return (
    <div className="min-h-screen bg-lions-black pt-24 pb-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-lions-blue/10 border border-lions-blue/30 flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-lions-blue" />
          </div>
          <span className="text-lions-blue text-sm font-semibold tracking-widest uppercase font-montserrat">
            Make a Difference
          </span>
          <h1 className="font-montserrat font-black text-4xl text-white mt-2 mb-3">Donate Today</h1>
          <p className="font-opensans text-lions-silver">
            100% of your donation supports Detroit youth apprenticeship programs.
          </p>
        </div>

        <div className="bg-lions-mid border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="font-opensans text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Amount selector */}
            <div>
              <label className="font-opensans text-sm text-lions-silver font-medium block mb-2">
                Donation Amount
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSelectedAmount(amt)}
                    className={clsx(
                      'py-3 rounded-xl font-montserrat font-bold text-sm transition-all',
                      selectedAmount === amt && !customAmount
                        ? 'bg-lions-blue text-white shadow-lg shadow-lions-blue/30'
                        : 'bg-lions-dark border border-white/10 text-lions-silver hover:border-lions-blue/50'
                    )}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Custom amount (e.g. 75)"
                {...register('custom_amount')}
                onFocus={() => setSelectedAmount(null)}
              />
            </div>

            {/* Donation type */}
            <div>
              <label className="font-opensans text-sm text-lions-silver font-medium block mb-2">
                Donation Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DONATION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setDonationType(t.value)}
                    className={clsx(
                      'py-2.5 rounded-xl font-opensans text-sm transition-all',
                      donationType === t.value
                        ? 'bg-lions-blue text-white'
                        : 'bg-lions-dark border border-white/10 text-lions-silver hover:border-lions-blue/50'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Your Name (optional)"
              placeholder="Jane Smith"
              {...register('donor_name')}
            />

            <Input
              label="Email for Receipt (optional)"
              type="email"
              placeholder="jane@example.com"
              error={errors.donor_email?.message}
              {...register('donor_email')}
            />

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              Continue to Secure Checkout
            </Button>

            <p className="text-center font-opensans text-xs text-lions-silver/60">
              Secured by Stripe · Tax-deductible receipt provided
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
