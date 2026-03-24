const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const supabase = require('../utils/supabase');

/**
 * @route POST /api/auth/sync
 * @desc Syncs user data to the public.users table after signup.
 * @access Public (Verifies user ID against Supabase Auth admin)
 */
router.post('/sync', async (req, res) => {
  try {
    const { id, full_name, plan, charity_id, charity_percentage } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify the user actually exists in Supabase Auth using the service_role key
    const { data: { user }, error: adminError } = await supabase.auth.admin.getUserById(id);
    
    if (adminError || !user) {
      return res.status(401).json({ error: 'Invalid or unauthorized user ID' });
    }

    // Insert or update the public user profile
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        full_name,
        role: 'user',
        charity_id: charity_id || null,
        charity_percentage: parseInt(charity_percentage, 10) || 10,
        subscription_status: 'active', // Temporarily defaulting to active until Stripe is implemented
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error syncing user:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'User profile synchronized' });
  } catch (err) {
    console.error('Auth sync route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
