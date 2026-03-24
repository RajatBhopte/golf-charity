const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { requireAuth } = require('../middleware/authMiddleware');

const isMissingSchemaError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('could not find');
};

const attachProofUrls = async (wins) => Promise.all((wins || []).map(async (win) => {
  const proofPath = win.screenshot_url;

  if (!proofPath) {
    return { ...win, proof_signed_url: null };
  }

  if (/^https?:\/\//i.test(proofPath)) {
    return { ...win, proof_signed_url: proofPath };
  }

  const { data } = await supabase
    .storage
    .from('winner-proofs')
    .createSignedUrl(proofPath, 60 * 60);

  return {
    ...win,
    proof_signed_url: data?.signedUrl || null,
  };
}));

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('draws')
      .select('id, month_year, status, total_pool, pool_split, published_at')
      .eq('status', 'published')
      .order('month_year', { ascending: false });

    if (error && isMissingSchemaError(error)) {
      return res.json([]);
    }

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Public draws route error:', error);
    res.status(500).json({ error: 'Failed to fetch published draws' });
  }
});

router.get('/my-wins', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('winners')
      .select('*, draws(month_year, published_at, total_pool)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error && isMissingSchemaError(error)) {
      return res.json([]);
    }

    if (error) throw error;
    const wins = await attachProofUrls(data || []);
    res.json(wins);
  } catch (error) {
    console.error('My wins route error:', error);
    res.status(500).json({ error: 'Failed to fetch winner history' });
  }
});

router.post('/winners/:id/proof', requireAuth, async (req, res) => {
  const { screenshot_url } = req.body;

  if (!screenshot_url?.trim()) {
    return res.status(400).json({ error: 'A proof screenshot path is required' });
  }

  try {
    const { data: winner, error: winnerError } = await supabase
      .from('winners')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (winnerError || !winner) {
      return res.status(404).json({ error: 'Winner record not found' });
    }

    const { data: updatedWinner, error: updateError } = await supabase
      .from('winners')
      .update({
        screenshot_url: screenshot_url.trim(),
        verification_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('*, draws(month_year, published_at, total_pool)')
      .single();

    if (updateError) throw updateError;

    await Promise.all([
      supabase
        .from('winner_audit_logs')
        .insert([{
          winner_id: req.params.id,
          actor_user_id: req.user.id,
          action: 'proof_submitted',
          notes: 'Winner uploaded score proof for review',
          metadata: {
            screenshot_url: screenshot_url.trim(),
          },
        }]),
      supabase
        .from('notifications')
        .insert([{
          user_id: req.user.id,
          type: 'winner-proof',
          title: 'Proof submitted',
          message: 'Your score proof was submitted successfully and is awaiting admin review.',
          metadata: {
            winner_id: req.params.id,
          },
        }]),
    ]);

    const [resolvedWinner] = await attachProofUrls([updatedWinner]);
    res.json(resolvedWinner);
  } catch (error) {
    console.error('Winner proof submission error:', error);
    res.status(500).json({ error: 'Failed to submit proof' });
  }
});

router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error && isMissingSchemaError(error)) {
      return res.json([]);
    }

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Notifications route error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error && isMissingSchemaError(error)) {
      return res.json({
        id: req.params.id,
        user_id: req.user.id,
        is_read: true,
        read_at: new Date().toISOString(),
      });
    }

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;
