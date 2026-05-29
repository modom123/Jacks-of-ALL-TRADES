'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, AlertCircle, Users } from 'lucide-react';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Please enter a valid email'),
  trade_skill: z.string().optional(),
  role: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const roles = ['Mentor / Instructor', 'Job Site Supervisor', 'Administrative Support', 'Fundraising', 'Other'];

export default function VolunteerPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await api.submitVolunteer(data);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-lions-black flex items-center justify-center px-4 pt-20">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h1 className="font-montserrat font-black text-3xl text-white mb-4">
            Thank You for Volunteering!
          </h1>
          <p className="font-opensans text-lions-silver mb-8">
            Your interest means the world to us. A member of our team will reach out within a few
            days to discuss how you can get involved.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-lions-blue hover:bg-lions-blue-light text-white font-montserrat font-semibold rounded-xl transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lions-black pt-24 pb-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-lions-blue/10 border border-lions-blue/30 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-lions-blue" />
          </div>
          <span className="text-lions-blue text-sm font-semibold tracking-widest uppercase font-montserrat">
            Get Involved
          </span>
          <h1 className="font-montserrat font-black text-4xl text-white mt-2 mb-3">
            Volunteer With Us
          </h1>
          <p className="font-opensans text-lions-silver">
            Share your skills and experience to help Detroit youth build their careers.
          </p>
        </div>

        <div className="bg-lions-mid border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="font-opensans text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Full Name *"
              placeholder="John Smith"
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            <Input
              label="Email Address *"
              type="email"
              placeholder="john@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Trade Skill / Expertise"
              placeholder="e.g. Licensed Electrician, Carpenter"
              {...register('trade_skill')}
            />

            <div className="flex flex-col gap-1.5">
              <label className="font-opensans text-sm text-lions-silver font-medium">
                How Would You Like to Help?
              </label>
              <select
                {...register('role')}
                className="w-full bg-lions-dark border border-white/10 rounded-xl px-4 py-3 text-white font-opensans text-sm focus:outline-none focus:border-lions-blue focus:ring-2 focus:ring-lions-blue/30 transition-all"
              >
                <option value="">Select a role...</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              Submit Volunteer Form
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
