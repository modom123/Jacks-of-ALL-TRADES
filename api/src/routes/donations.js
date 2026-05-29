const express = require('express');
const { z } = require('zod');
const { stripe } = require('../lib/stripe');
const { supabase } = require('../lib/supabase');
const { sendDonationReceipt } = require('../lib/email');
const { validate } = require('../middleware/validate');

const router = express.Router();

const donationSchema = z.object({
  donor_name: z.string().optional(),
  donor_email: z.string().email('Valid email required').optional(),
  amount_cents: z.number().int().min(100, 'Minimum donation is $1'),
  type: z.enum(['financial', 'property', 'materials', 'tools', 'time']).default('financial'),
});

// POST /api/donations/checkout
router.post('/checkout', validate(donationSchema), async (req, res) => {
  try {
    const { donor_name, donor_email, amount_cents, type } = req.body;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Donation to Jacks of All Trades',
              description: 'Supporting Detroit youth apprenticeship programs',
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      customer_email: donor_email || undefined,
      metadata: {
        donor_name: donor_name || '',
        donor_email: donor_email || '',
        type,
        amount_cents: String(amount_cents),
      },
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&type=donation`,
      cancel_url: `${FRONTEND_URL}/donate`,
    });

    const { error: dbError } = await supabase.from('donations').insert({
      donor_name: donor_name || null,
      donor_email: donor_email || null,
      amount_cents,
      type,
      stripe_session_id: session.id,
      status: 'pending',
    });

    if (dbError) {
      console.error('Donation DB insert error:', dbError);
    }

    return res.status(200).json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('Donation checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook handler (exported separately for raw body mounting in index.js)
async function webhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { donor_name, donor_email, type, amount_cents } = session.metadata || {};

    const { error } = await supabase
      .from('donations')
      .update({ status: 'completed' })
      .eq('stripe_session_id', session.id);

    if (error) {
      console.error('Donation update error:', error);
    }

    if (donor_email || session.customer_email) {
      sendDonationReceipt({
        donor_name,
        donor_email: donor_email || session.customer_email,
        amount_cents: parseInt(amount_cents || '0', 10),
        type: type || 'financial',
      }).catch(console.error);
    }
  }

  return res.json({ received: true });
}

module.exports = router;
module.exports.webhookHandler = webhookHandler;
