const { createClient } = require('@supabase/supabase-js');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Verify JWT using Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  supabase.auth.getUser(token)
    .then(({ data, error }) => {
      if (error || !data.user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      req.user = data.user;
      next();
    })
    .catch(() => res.status(401).json({ error: 'Token verification failed' }));
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    const { supabase } = require('../lib/supabase');
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
