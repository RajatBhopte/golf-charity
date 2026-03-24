const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

const isMissingSchemaError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('could not find');
};

const normalizeCharity = (charity) => ({
  ...charity,
  logo_url: charity.logo_url || null,
  image_url: charity.image_url || null,
  description: charity.description || '',
  is_spotlight: Boolean(charity.is_spotlight),
  total_raised: Number(charity.total_raised || 0),
  upcoming_events: Array.isArray(charity.upcoming_events) ? charity.upcoming_events : [],
});

router.get('/', async (_req, res) => {
  try {
    let { data, error } = await supabase
      .from('charities')
      .select('*')
      .order('is_spotlight', { ascending: false })
      .order('total_raised', { ascending: false })
      .order('name');

    if (error && isMissingSchemaError(error)) {
      const fallbackResult = await supabase
        .from('charities')
        .select('id, name, description, logo_url')
        .order('name');

      if (fallbackResult.error && isMissingSchemaError(fallbackResult.error)) {
        return res.json({ featured: null, charities: [] });
      }

      if (fallbackResult.error) throw fallbackResult.error;

      const fallbackData = (fallbackResult.data || []).map((charity) => normalizeCharity(charity));
      return res.json({
        featured: null,
        charities: fallbackData,
      });
    }

    if (error) throw error;
    const normalized = (data || []).map((charity) => normalizeCharity(charity));

    res.json({
      featured: normalized.find((charity) => charity.is_spotlight) || null,
      charities: normalized,
    });
  } catch (error) {
    console.error('Public charities route error:', error);
    res.status(500).json({ error: 'Failed to fetch charities' });
  }
});

module.exports = router;
