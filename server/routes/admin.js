const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Edit any user's score
router.put('/scores/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { score, played_date } = req.body;

  try {
    const updateData = {};
    if (score !== undefined) {
      const numericScore = parseInt(score, 10);
      if (isNaN(numericScore) || numericScore < 1 || numericScore > 45) {
        return res.status(400).json({ error: 'Score must be between 1 and 45' });
      }
      updateData.score = numericScore;
    }

    if (played_date) {
      updateData.played_date = played_date;
    }

    const { data: updatedScore, error } = await supabase
      .from('scores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(updatedScore);
  } catch (error) {
    console.error('Admin Error updating score:', error);
    res.status(500).json({ error: 'Failed to update score as admin' });
  }
});

module.exports = router;
