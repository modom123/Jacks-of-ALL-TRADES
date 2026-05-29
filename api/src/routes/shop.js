const express = require('express');
const { z } = require('zod');
const { stripe } = require('../lib/stripe');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/shop/products
router.get('/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true });

    if (error) {
      console.error('Products fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }
    return res.json({ products: data });
  } catch (err) {
    console.error('Shop products error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const cartSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().min(1).max(100),
    })
  ).min(1, 'Cart cannot be empty'),
  customer_email: z.string().email().optional(),
  customer_name: z.string().optional(),
});

// POST /api/shop/checkout
router.post('/checkout', validate(cartSchema), async (req, res) => {
  try {
    const { items, customer_email, customer_name } = req.body;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Fetch products from DB
    const productIds = items.map((i) => i.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('active', true);

    if (productsError || !products.length) {
      return res.status(400).json({ error: 'One or more products not found' });
    }

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    // Build Stripe line items
    const lineItems = items.map((item) => {
      const product = productMap[item.product_id];
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description || undefined,
          },
          unit_amount: product.price_cents,
        },
        quantity: item.quantity,
      };
    });

    const totalCents = items.reduce((sum, item) => {
      const product = productMap[item.product_id];
      return sum + (product ? product.price_cents * item.quantity : 0);
    }, 0);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      customer_email: customer_email || undefined,
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&type=shop`,
      cancel_url: `${FRONTEND_URL}/shop`,
    });

    // Create pending order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_email: customer_email || null,
        customer_name: customer_name || null,
        stripe_session_id: session.id,
        total_cents: totalCents,
        status: 'pending',
      })
      .select()
      .single();

    if (!orderError && order) {
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_cents: productMap[item.product_id]?.price_cents || 0,
      }));

      await supabase.from('order_items').insert(orderItems);
    }

    return res.status(200).json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('Shop checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook handler
async function webhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Shop webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const { error } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('stripe_session_id', session.id);

    if (error) {
      console.error('Order update error:', error);
    }
  }

  return res.json({ received: true });
}

module.exports = router;
module.exports.webhookHandler = webhookHandler;
