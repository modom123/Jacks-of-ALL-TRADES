const express = require('express');
const { z } = require('zod');
const { supabase } = require('../lib/supabase');
const { sendVolunteerAlert } = require('../lib/email');
const { validate } = require('../middleware/validate');

const router = express.Router();

const volunteerSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  trade_skill: z.string().optional(),
  role: z.string().optional(),
});

router.post('/', validate(volunteerSchema), async (req, res) => {
  try {
    const { full_name, email, trade_skill, role } = req.body;

    const { data, error } = await supabase
      .from('volunteers')
      .insert({ full_name, email, trade_skill, role })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to submit volunteer form' });
    }

    sendVolunteerAlert({ full_name, email, trade_skill, role }).catch(console.error);

    return res.status(201).json({ success: true, id: data.id, message: 'Volunteer sign-up received' });
  } catch (err) {
    console.error('Volunteer route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
