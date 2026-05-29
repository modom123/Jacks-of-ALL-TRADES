const express = require('express');
const { z } = require('zod');
const { supabase } = require('../lib/supabase');
const { sendApplicationAlert } = require('../lib/email');
const { validate } = require('../middleware/validate');

const router = express.Router();

const applicationSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  trade_interest: z.string().min(1, 'Trade interest is required'),
  background: z.string().optional(),
});

router.post('/', validate(applicationSchema), async (req, res) => {
  try {
    const { full_name, email, phone, trade_interest, background } = req.body;

    const { data, error } = await supabase
      .from('applications')
      .insert({ full_name, email, phone, trade_interest, background })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to submit application' });
    }

    // Send email alert (non-blocking)
    sendApplicationAlert({ full_name, email, phone, trade_interest, background }).catch(console.error);

    return res.status(201).json({ success: true, id: data.id, message: 'Application submitted successfully' });
  } catch (err) {
    console.error('Application route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
