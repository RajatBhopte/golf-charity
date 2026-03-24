const supabase = require('../utils/supabase');
const { requireAuth } = require('./authMiddleware');

const requireAdmin = async (req, res, next) => {
  // First ensure they are authenticated
  await requireAuth(req, res, async () => {
    try {
      // Check if the user has the 'admin' role in the public.users table
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !userProfile) {
        return res.status(403).json({ error: 'Forbidden: Cannot verify admin status' });
      }

      if (userProfile.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      next();
    } catch (error) {
      console.error('Admin middleware error:', error);
      res.status(500).json({ error: 'Internal server error during admin validation' });
    }
  });
};

module.exports = { requireAdmin };
