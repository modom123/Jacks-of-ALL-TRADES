import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { type?: string; session_id?: string };
}) {
  const type = searchParams.type || 'payment';

  const messages: Record<string, { title: string; body: string }> = {
    donation: {
      title: 'Thank You for Your Donation!',
      body: 'Your generous contribution will help Detroit youth access trade apprenticeships and build life-changing careers. A receipt has been emailed to you.',
    },
    shop: {
      title: 'Order Confirmed!',
      body: 'Thank you for your purchase! Your order is being processed. All proceeds support Jacks of All Trades programs.',
    },
    payment: {
      title: 'Payment Successful!',
      body: 'Thank you for your support of Jacks of All Trades.',
    },
  };

  const msg = messages[type] || messages.payment;

  return (
    <div className="min-h-screen bg-lions-black flex items-center justify-center px-4 pt-20">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-8">
          <CheckCircle size={48} className="text-green-400" />
        </div>

        <h1 className="font-montserrat font-black text-3xl sm:text-4xl text-white mb-4">
          {msg.title}
        </h1>

        <p className="font-opensans text-lions-silver text-base leading-relaxed mb-8">
          {msg.body}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-lions-blue hover:bg-lions-blue-light text-white font-montserrat font-bold rounded-xl transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 border border-lions-silver/30 hover:border-lions-blue text-white font-montserrat font-semibold rounded-xl transition-colors"
          >
            Shop More
          </Link>
        </div>
      </div>
    </div>
  );
}
