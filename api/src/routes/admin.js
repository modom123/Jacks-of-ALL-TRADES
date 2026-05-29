const express = require('express');
const { supabase } = require('../lib/supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin auth
router.use(requireAdmin);

// GET /api/admin/applications
router.get('/applications', async (req, res) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: 'Failed to fetch applications' });

    return res.json({ applications: data, total: count, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Admin applications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/applications/:id
router.patch('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'reviewing', 'accepted', 'rejected'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update application' });
    if (!data) return res.status(404).json({ error: 'Application not found' });

    return res.json({ application: data });
  } catch (err) {
    console.error('Admin application update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/contacts
router.get('/contacts', async (req, res) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: 'Failed to fetch contacts' });

    return res.json({ contacts: data, total: count, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Admin contacts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/donations
router.get('/donations', async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await supabase
      .from('donations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) return res.status(500).json({ error: 'Failed to fetch donations' });

    return res.json({ donations: data, total: count, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Admin donations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/volunteers
router.get('/volunteers', async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await supabase
      .from('volunteers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) return res.status(500).json({ error: 'Failed to fetch volunteers' });

    return res.json({ volunteers: data, total: count, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Admin volunteers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      { count: pendingApps },
      { data: donationsData },
      { count: volunteerCount },
      { count: unreadMessages },
    ] = await Promise.all([
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('donations').select('amount_cents').eq('status', 'completed'),
      supabase.from('volunteers').select('*', { count: 'exact', head: true }),
      supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
    ]);

    const totalDonationsCents = (donationsData || []).reduce(
      (sum, d) => sum + (d.amount_cents || 0),
      0
    );

    return res.json({
      pending_applications: pendingApps || 0,
      total_donations_cents: totalDonationsCents,
      total_donations_dollars: (totalDonationsCents / 100).toFixed(2),
      volunteer_count: volunteerCount || 0,
      unread_messages: unreadMessages || 0,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
