const express = require('express');
const { z } = require('zod');
const { supabase } = require('../lib/supabase');
const { sendContactAlert } = require('../lib/email');
const { validate } = require('../middleware/validate');

const router = express.Router();

const contactSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  subject: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  type: z.enum(['general', 'volunteer', 'donate', 'mentor']).default('general'),
});

router.post('/', validate(contactSchema), async (req, res) => {
  try {
    const { full_name, email, subject, message, type } = req.body;

    const { data, error } = await supabase
      .from('contacts')
      .insert({ full_name, email, subject, message, type })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to submit message' });
    }

    sendContactAlert({ full_name, email, subject, message, type }).catch(console.error);

    return res.status(201).json({ success: true, id: data.id, message: 'Message sent successfully' });
  } catch (err) {
    console.error('Contact route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
