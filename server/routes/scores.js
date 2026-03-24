const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { requireAuth } = require('../middleware/authMiddleware');

// Get all scores for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: scores, error } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', req.user.id)
      .order('played_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// Add a new score
router.post('/', requireAuth, async (req, res) => {
  const { score, played_date } = req.body;

  // Validation
  if (!score || !played_date) {
    return res.status(400).json({ error: 'Score and played date are required' });
  }

  const numericScore = parseInt(score, 10);
  if (isNaN(numericScore) || numericScore < 1 || numericScore > 45) {
    return res.status(400).json({ error: 'Score must be between 1 and 45' });
  }

  const playedDateObj = new Date(played_date);
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  if (playedDateObj > today) {
    return res.status(400).json({ error: 'Played date cannot be in the future' });
  }
  if (playedDateObj < oneYearAgo) {
    return res.status(400).json({ error: 'Played date cannot be more than 1 year old' });
  }

  try {
    // 1. Enforce rolling 5-score limit
    // Fetch all current scores to see if we need to delete the oldest
    const { data: existingScores, error: fetchError } = await supabase
      .from('scores')
      .select('id, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true }); // Oldest first

    if (fetchError) throw fetchError;

    // If they have 5 or more, we need to delete the oldest ones so that after insertion, they have 5.
    // So we need to bring the count down to 4 before inserting the new one.
    if (existingScores && existingScores.length >= 5) {
      const scoresToDelete = existingScores.length - 4;
      const idsToDelete = existingScores.slice(0, scoresToDelete).map(s => s.id);

      const { error: deleteError } = await supabase
        .from('scores')
        .delete()
        .in('id', idsToDelete);
        
      if (deleteError) throw deleteError;
    }

    // 2. Insert new score
    const { data: newScore, error: insertError } = await supabase
      .from('scores')
      .insert([
        { 
          user_id: req.user.id, 
          score: numericScore, 
          played_date: played_date 
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json(newScore);
  } catch (error) {
    console.error('Error adding score:', error);
    res.status(500).json({ error: 'Failed to add score' });
  }
});

// Edit a score
router.put('/:id', requireAuth, async (req, res) => {
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
      const playedDateObj = new Date(played_date);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      if (playedDateObj > today) return res.status(400).json({ error: 'Played date cannot be in the future' });
      if (playedDateObj < oneYearAgo) return res.status(400).json({ error: 'Played date cannot be more than 1 year old' });
      
      updateData.played_date = played_date;
    }

    const { data: updatedScore, error } = await supabase
      .from('scores')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id) // Ensure they own it
      .select()
      .single();

    if (error) throw error;
    res.json(updatedScore);
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

// Delete a score
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting score:', error);
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

module.exports = router;
