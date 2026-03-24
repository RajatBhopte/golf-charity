const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { requireAdmin } = require('../middleware/adminMiddleware');

const VALID_ROLES = ['user', 'admin'];
const VALID_SUBSCRIPTION_PLANS = ['monthly', 'yearly'];
const VALID_SUBSCRIPTION_STATUSES = ['active', 'pending', 'inactive', 'suspended', 'cancelled'];
const VALID_VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'];
const VALID_PAYMENT_STATUSES = ['pending', 'paid'];
const DEFAULT_POOL_SPLIT = { tier_5: 0.4, tier_4: 0.35, tier_3: 0.25 };
const SUBSCRIPTION_FEE_INR = 1500;
const PRIZE_POOL_SHARE = 0.2;

const isMissingSubscriptionPlanColumn = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('subscription_plan') && message.includes('does not exist');
};

const withDefaultSubscriptionPlans = (records) => (records || []).map((record) => ({
  ...record,
  subscription_plan: record.subscription_plan || 'monthly',
}));

const removeSubscriptionPlan = (payload = {}) => {
  const nextPayload = { ...payload };
  delete nextPayload.subscription_plan;
  return nextPayload;
};

const parseNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatDateOnly = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return date.toISOString().slice(0, 10);
};

const getMonthRange = (value) => {
  const source = value ? new Date(value) : new Date();
  if (Number.isNaN(source.getTime())) {
    throw new Error('Invalid month_year value');
  }

  const start = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), 1));
  const end = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 1));

  return {
    start,
    end,
    monthYear: formatDateOnly(start),
    label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
};

const validateScorePayload = ({ score, played_date }) => {
  const numericScore = parseInt(score, 10);
  if (Number.isNaN(numericScore) || numericScore < 1 || numericScore > 45) {
    throw new Error('Score must be between 1 and 45');
  }

  const playedDate = new Date(played_date);
  if (Number.isNaN(playedDate.getTime())) {
    throw new Error('Played date is required');
  }

  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  if (playedDate > today) {
    throw new Error('Played date cannot be in the future');
  }

  if (playedDate < oneYearAgo) {
    throw new Error('Played date cannot be more than 1 year old');
  }

  return {
    score: numericScore,
    played_date: formatDateOnly(playedDate),
  };
};

const buildCharityPayload = (body) => {
  const upcomingEvents = Array.isArray(body.upcoming_events)
    ? body.upcoming_events.filter(Boolean).map((event) => String(event).trim()).filter(Boolean)
    : String(body.upcoming_events || '')
      .split('\n')
      .map((event) => event.trim())
      .filter(Boolean);

  const payload = {
    name: body.name?.trim(),
    description: body.description?.trim() || '',
    logo_url: body.logo_url?.trim() || null,
    image_url: body.image_url?.trim() || null,
    upcoming_events: upcomingEvents,
    is_spotlight: Boolean(body.is_spotlight),
    total_raised: parseNumber(body.total_raised, 0),
  };

  if (!payload.name) {
    throw new Error('Charity name is required');
  }

  return payload;
};

const buildUserPayload = (body) => {
  const payload = {};

  if (body.full_name !== undefined) payload.full_name = body.full_name?.trim() || null;
  if (body.email !== undefined) payload.email = body.email?.trim() || null;
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      throw new Error('Invalid role');
    }
    payload.role = body.role;
  }
  if (body.subscription_plan !== undefined) {
    if (!VALID_SUBSCRIPTION_PLANS.includes(body.subscription_plan)) {
      throw new Error('Invalid subscription plan');
    }
    payload.subscription_plan = body.subscription_plan;
  }
  if (body.subscription_status !== undefined) {
    if (!VALID_SUBSCRIPTION_STATUSES.includes(body.subscription_status)) {
      throw new Error('Invalid subscription status');
    }
    payload.subscription_status = body.subscription_status;
  }
  if (body.charity_percentage !== undefined) {
    const charityPercentage = parseInt(body.charity_percentage, 10);
    if (Number.isNaN(charityPercentage) || charityPercentage < 0 || charityPercentage > 100) {
      throw new Error('Charity percentage must be between 0 and 100');
    }
    payload.charity_percentage = charityPercentage;
  }
  if (body.charity_id !== undefined) {
    payload.charity_id = body.charity_id || null;
  }

  return payload;
};

const weightedPick = (candidates) => {
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (!totalWeight) {
    return null;
  }

  let threshold = Math.random() * totalWeight;
  for (const candidate of candidates) {
    threshold -= candidate.weight;
    if (threshold <= 0) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1] || null;
};

const pickUniqueWinners = (candidates) => {
  const tiers = ['tier_5', 'tier_4', 'tier_3'];
  const winners = {};
  const available = [...candidates];

  for (const tier of tiers) {
    const winner = weightedPick(available);
    winners[tier] = winner
      ? {
          id: winner.id,
          full_name: winner.full_name,
          email: winner.email,
          score_count: winner.score_count,
          weight: winner.weight,
        }
      : null;

    if (winner) {
      const winnerIndex = available.findIndex((candidate) => candidate.id === winner.id);
      if (winnerIndex >= 0) {
        available.splice(winnerIndex, 1);
      }
    }
  }

  return winners;
};

const clearOtherSpotlights = async (charityId) => {
  const { error } = await supabase
    .from('charities')
    .update({ is_spotlight: false })
    .neq('id', charityId)
    .eq('is_spotlight', true);

  if (error) {
    throw error;
  }
};

const getMonthlyPlanValue = (plan) => (plan === 'yearly' ? 15000 / 12 : SUBSCRIPTION_FEE_INR);

const insertNotifications = async (records) => {
  if (!records?.length) {
    return;
  }

  const { error } = await supabase.from('notifications').insert(records);
  if (error) {
    console.warn('Notification insert skipped:', error.message);
  }
};

const insertWinnerAuditLogs = async (records) => {
  if (!records?.length) {
    return;
  }

  const { error } = await supabase.from('winner_audit_logs').insert(records);
  if (error) {
    console.warn('Winner audit insert skipped:', error.message);
  }
};

const attachProofUrls = async (winners) => Promise.all((winners || []).map(async (winner) => {
  const proofPath = winner.screenshot_url;

  if (!proofPath) {
    return { ...winner, proof_signed_url: null };
  }

  if (/^https?:\/\//i.test(proofPath)) {
    return { ...winner, proof_signed_url: proofPath };
  }

  const { data } = await supabase
    .storage
    .from('winner-proofs')
    .createSignedUrl(proofPath, 60 * 60);

  return {
    ...winner,
    proof_signed_url: data?.signedUrl || null,
  };
}));

const attachWinnerAuditLogs = async (winners) => {
  const winnerIds = winners?.map((winner) => winner.id).filter(Boolean) || [];
  if (!winnerIds.length) {
    return winners || [];
  }

  const { data, error } = await supabase
    .from('winner_audit_logs')
    .select('*')
    .in('winner_id', winnerIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Winner audit fetch skipped:', error.message);
    return winners.map((winner) => ({ ...winner, audit_logs: [] }));
  }

  const logMap = new Map();
  for (const log of data || []) {
    const entries = logMap.get(log.winner_id) || [];
    entries.push(log);
    logMap.set(log.winner_id, entries);
  }

  return winners.map((winner) => ({
    ...winner,
    audit_logs: logMap.get(winner.id) || [],
  }));
};

const enrichWinners = async (winners) => {
  const withProofUrls = await attachProofUrls(winners || []);
  return attachWinnerAuditLogs(withProofUrls);
};

// --- USER MANAGEMENT ---

router.get('/users', requireAdmin, async (req, res) => {
  const { search, role, subscription_status, subscription_plan, charity_id } = req.query;

  try {
    const buildQuery = (includePlanFilter = true) => {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (role && role !== 'all') {
        query = query.eq('role', role);
      }

      if (subscription_status && subscription_status !== 'all') {
        query = query.eq('subscription_status', subscription_status);
      }

      if (includePlanFilter && subscription_plan && subscription_plan !== 'all') {
        query = query.eq('subscription_plan', subscription_plan);
      }

      if (charity_id && charity_id !== 'all') {
        query = query.eq('charity_id', charity_id);
      }

      if (search) {
        const safeSearch = String(search).replaceAll(',', ' ').trim();
        query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
      }

      return query;
    };

    let { data: users, error } = await buildQuery();

    if (error && isMissingSubscriptionPlanColumn(error)) {
      const fallbackResult = await buildQuery(false);
      if (fallbackResult.error) throw fallbackResult.error;

      const fallbackUsers = withDefaultSubscriptionPlans(fallbackResult.data);
      return res.json(
        subscription_plan === 'yearly'
          ? []
          : fallbackUsers
      );
    }

    if (error) throw error;
    res.json(withDefaultSubscriptionPlans(users));
  } catch (error) {
    console.error('Admin Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const payload = buildUserPayload({ role: req.body.role });

    if (req.params.id === req.user.id && payload.role !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove your own admin access' });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(withDefaultSubscriptionPlans([updatedUser])[0]);
  } catch (error) {
    const message = error.message || 'Failed to update user role';
    res.status(message === 'Invalid role' ? 400 : 500).json({ error: message });
  }
});

router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const payload = buildUserPayload(req.body);

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No changes supplied' });
    }

    if (req.params.id === req.user.id && payload.role && payload.role !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove your own admin access' });
    }

    let { data: updatedUser, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error && isMissingSubscriptionPlanColumn(error)) {
      const fallbackPayload = removeSubscriptionPlan(payload);

      if (Object.keys(fallbackPayload).length === 0) {
        const fallbackUserResult = await supabase
          .from('users')
          .select('*')
          .eq('id', req.params.id)
          .single();

        if (fallbackUserResult.error) throw fallbackUserResult.error;
        return res.json(withDefaultSubscriptionPlans([fallbackUserResult.data])[0]);
      }

      const fallbackResult = await supabase
        .from('users')
        .update(fallbackPayload)
        .eq('id', req.params.id)
        .select()
        .single();

      updatedUser = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) throw error;
    res.json(withDefaultSubscriptionPlans([updatedUser])[0]);
  } catch (error) {
    const message = error.message || 'Failed to update user';
    const statusCode = message.startsWith('Invalid') || message.includes('between') || message === 'No changes supplied'
      ? 400
      : 500;
    res.status(statusCode).json({ error: message });
  }
});

router.get('/users/:id/scores', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', req.params.id)
      .order('played_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user scores' });
  }
});

router.post('/users/:id/scores', requireAdmin, async (req, res) => {
  try {
    const payload = validateScorePayload(req.body);

    const { data, error } = await supabase
      .from('scores')
      .insert([{ user_id: req.params.id, ...payload }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    const message = error.message || 'Failed to add score';
    res.status(message.includes('Score') || message.includes('Played date') ? 400 : 500).json({ error: message });
  }
});

router.put('/users/:id/scores/:scoreId', requireAdmin, async (req, res) => {
  try {
    const { data: existingScore, error: existingScoreError } = await supabase
      .from('scores')
      .select('score, played_date')
      .eq('id', req.params.scoreId)
      .eq('user_id', req.params.id)
      .single();

    if (existingScoreError) throw existingScoreError;

    const payload = {};
    if (req.body.score !== undefined || req.body.played_date !== undefined) {
      Object.assign(payload, validateScorePayload({
        score: req.body.score ?? existingScore.score,
        played_date: req.body.played_date ?? existingScore.played_date,
      }));
    }

    const { data, error } = await supabase
      .from('scores')
      .update(payload)
      .eq('id', req.params.scoreId)
      .eq('user_id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    const message = error.message || 'Failed to update score';
    res.status(message.includes('Score') || message.includes('Played date') ? 400 : 500).json({ error: message });
  }
});

router.delete('/users/:id/scores/:scoreId', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('id', req.params.scoreId)
      .eq('user_id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

// --- CHARITY MANAGEMENT ---

router.get('/charities', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('charities')
      .select('*')
      .order('is_spotlight', { ascending: false })
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/charities', requireAdmin, async (req, res) => {
  try {
    const payload = buildCharityPayload(req.body);
    const { data, error } = await supabase
      .from('charities')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    if (data.is_spotlight) {
      await clearOtherSpotlights(data.id);
    }

    res.status(201).json(data);
  } catch (error) {
    const message = error.message || 'Failed to create charity';
    res.status(message === 'Charity name is required' ? 400 : 500).json({ error: message });
  }
});

router.put('/charities/:id', requireAdmin, async (req, res) => {
  try {
    const payload = buildCharityPayload(req.body);
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('charities')
      .update(payload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (data.is_spotlight) {
      await clearOtherSpotlights(data.id);
    }

    res.json(data);
  } catch (error) {
    const message = error.message || 'Failed to update charity';
    res.status(message === 'Charity name is required' ? 400 : 500).json({ error: message });
  }
});

router.delete('/charities/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('charities').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DRAW ENGINE ---

router.post('/draws/simulate', requireAdmin, async (req, res) => {
  const type = req.body.type === 'random' ? 'random' : 'algorithmic';
  const weighting = req.body.weighting === 'least' ? 'least' : 'most';

  try {
    if (!req.body.month_year) {
      return res.status(400).json({ error: 'month_year is required for simulation' });
    }

    const { start, end, monthYear, label } = getMonthRange(req.body.month_year);

    let [{ data: participants, error: userError }, { data: scores, error: scoreError }] = await Promise.all([
      supabase
        .from('users')
        .select('id, full_name, email, subscription_status, subscription_plan')
        .eq('subscription_status', 'active'),
      supabase
        .from('scores')
        .select('user_id, score, played_date')
        .gte('played_date', formatDateOnly(start))
        .lt('played_date', formatDateOnly(end)),
    ]);

    if (userError && isMissingSubscriptionPlanColumn(userError)) {
      const fallbackUsersResult = await supabase
        .from('users')
        .select('id, full_name, email, subscription_status')
        .eq('subscription_status', 'active');

      participants = withDefaultSubscriptionPlans(fallbackUsersResult.data);
      userError = fallbackUsersResult.error;
    }

    if (userError) throw userError;
    if (scoreError) throw scoreError;

    const scoreFrequency = {};
    const scoresByUser = {};

    for (const scoreEntry of scores || []) {
      scoreFrequency[scoreEntry.score] = (scoreFrequency[scoreEntry.score] || 0) + 1;
      scoresByUser[scoreEntry.user_id] = scoresByUser[scoreEntry.user_id] || [];
      scoresByUser[scoreEntry.user_id].push(scoreEntry.score);
    }

    const eligibleUsers = (participants || [])
      .map((participant) => {
        const monthlyScores = scoresByUser[participant.id] || [];
        const scoreCount = monthlyScores.length;

        if (scoreCount < 5) {
          return null;
        }

        let weight = 1;
        if (type === 'algorithmic') {
          const rawWeight = monthlyScores.reduce((sum, score) => {
            const frequency = scoreFrequency[score] || 1;
            return weighting === 'least' ? sum + 1 / frequency : sum + frequency;
          }, 0);
          weight = rawWeight > 0 ? rawWeight : 1;
        }

        return {
          ...participant,
          score_count: scoreCount,
          weight,
        };
      })
      .filter(Boolean);

    const winners = pickUniqueWinners(eligibleUsers);
    const totalPool = parseFloat(((participants || []).reduce(
      (sum, participant) => sum + (getMonthlyPlanValue(participant.subscription_plan) * PRIZE_POOL_SHARE),
      0
    )).toFixed(2));

    res.json({
      total_participants: participants?.length || 0,
      eligible_participants: eligibleUsers.length,
      total_pool: totalPool,
      pool_split: DEFAULT_POOL_SPLIT,
      winners,
      is_simulation: true,
      month_year: monthYear,
      month_label: label,
      settings: { type, weighting },
    });
  } catch (error) {
    console.error('Simulation Error:', error);
    const message = error.message || 'Draw simulation failed';
    res.status(message.includes('month_year') || message.includes('Invalid date') ? 400 : 500).json({ error: message });
  }
});

router.post('/draws/publish', requireAdmin, async (req, res) => {
  const { winners = {}, settings = {} } = req.body;

  try {
    if (!req.body.month_year) {
      return res.status(400).json({ error: 'month_year is required for publishing' });
    }

    const { monthYear } = getMonthRange(req.body.month_year);
    const totalPool = parseNumber(req.body.total_pool, 0);
    const poolSplit = req.body.pool_split || DEFAULT_POOL_SPLIT;
    const winnerEntries = Object.entries(winners).filter(([, winner]) => winner?.id);

    if (!winnerEntries.length) {
      return res.status(400).json({ error: 'At least one winner is required before publishing a draw' });
    }

    const { data: existingDraw, error: existingDrawError } = await supabase
      .from('draws')
      .select('id')
      .eq('month_year', monthYear)
      .eq('status', 'published')
      .maybeSingle();

    if (existingDrawError) throw existingDrawError;
    if (existingDraw) {
      return res.status(409).json({ error: 'A published draw already exists for this month' });
    }

    const { data: draw, error: drawError } = await supabase
      .from('draws')
      .insert([{
        month_year: monthYear,
        status: 'published',
        settings,
        total_pool: totalPool,
        pool_split: poolSplit,
        published_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (drawError) throw drawError;

    const winnerRecords = winnerEntries
      .map(([tierKey, winner]) => ({
        draw_id: draw.id,
        user_id: winner.id,
        prize_tier: parseInt(tierKey.split('_')[1], 10),
        amount: parseFloat((totalPool * parseNumber(poolSplit[tierKey], 0)).toFixed(2)),
        verification_status: 'pending',
        payment_status: 'pending',
      }));

    let insertedWinners = [];
    if (winnerRecords.length > 0) {
      const { data: createdWinners, error: winnerError } = await supabase
        .from('winners')
        .insert(winnerRecords)
        .select();

      if (winnerError) throw winnerError;
      insertedWinners = createdWinners || [];

      await Promise.all([
        insertWinnerAuditLogs(insertedWinners.map((winner) => ({
          winner_id: winner.id,
          actor_user_id: req.user.id,
          action: 'draw_published',
          notes: `Winner recorded for draw ${monthYear}`,
          metadata: {
            draw_id: draw.id,
            prize_tier: winner.prize_tier,
            amount: winner.amount,
          },
        }))),
        insertNotifications(insertedWinners.map((winner) => ({
          user_id: winner.user_id,
          type: 'winner-announcement',
          title: 'You have won this month’s draw',
          message: `You matched ${winner.prize_tier} numbers and have a pending reward of INR ${parseNumber(winner.amount, 0).toLocaleString('en-IN')}.`,
          metadata: {
            draw_id: draw.id,
            winner_id: winner.id,
            month_year: monthYear,
          },
        }))),
      ]);
    }

    res.json({
      message: 'Draw published and winners recorded',
      draw_id: draw.id,
      winner_count: winnerRecords.length,
    });
  } catch (error) {
    console.error('Publish Error:', error);
    const message = error.message || 'Failed to publish draw';
    const statusCode = message.includes('already exists')
      ? 409
      : message.includes('month_year')
      || message.includes('At least one winner')
      || message.includes('Invalid date')
      ? 400
      : 500;
    res.status(statusCode).json({ error: message });
  }
});

// --- WINNER MANAGEMENT ---

router.get('/winners', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('winners')
      .select('*, users(full_name, email), draws(month_year, published_at, total_pool)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const enrichedWinners = await enrichWinners(data || []);
    res.json(enrichedWinners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/winners/:id', requireAdmin, async (req, res) => {
  const { verification_status, payment_status, rejection_reason, screenshot_url } = req.body;

  try {
    const updates = { updated_at: new Date().toISOString() };

    if (verification_status !== undefined) {
      if (!VALID_VERIFICATION_STATUSES.includes(verification_status)) {
        return res.status(400).json({ error: 'Invalid verification status' });
      }

      updates.verification_status = verification_status;
      updates.rejection_reason = verification_status === 'rejected'
        ? (rejection_reason?.trim() || 'Rejected by admin')
        : null;

      if (verification_status !== 'approved') {
        updates.payment_status = 'pending';
      }
    }

    if (payment_status !== undefined) {
      if (!VALID_PAYMENT_STATUSES.includes(payment_status)) {
        return res.status(400).json({ error: 'Invalid payment status' });
      }
      if (payment_status === 'paid' && verification_status === 'rejected') {
        return res.status(400).json({ error: 'Rejected winners cannot be marked as paid' });
      }
      updates.payment_status = payment_status;
    }

    if (screenshot_url !== undefined) {
      updates.screenshot_url = screenshot_url?.trim() || null;
    }

    const { data: currentWinner, error: winnerFetchError } = await supabase
      .from('winners')
      .select('verification_status')
      .eq('id', req.params.id)
      .single();

    if (winnerFetchError) throw winnerFetchError;
    if (updates.payment_status === 'paid' && currentWinner.verification_status !== 'approved' && updates.verification_status !== 'approved') {
      return res.status(400).json({ error: 'Winner must be approved before payment is marked as paid' });
    }

    const auditActions = [];
    if (verification_status && verification_status !== currentWinner.verification_status) {
      auditActions.push({
        winner_id: req.params.id,
        actor_user_id: req.user.id,
        action: `verification_${verification_status}`,
        notes: verification_status === 'rejected'
          ? (rejection_reason?.trim() || 'Winner verification rejected')
          : `Winner verification marked as ${verification_status}`,
        metadata: {
          rejection_reason: rejection_reason?.trim() || null,
        },
      });
    }

    if (payment_status) {
      auditActions.push({
        winner_id: req.params.id,
        actor_user_id: req.user.id,
        action: `payment_${payment_status}`,
        notes: `Winner payment marked as ${payment_status}`,
        metadata: {},
      });
    }

    const { data, error } = await supabase
      .from('winners')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, users(full_name, email), draws(month_year, published_at, total_pool)')
      .single();

    if (error) throw error;

    await Promise.all([
      insertWinnerAuditLogs(auditActions),
      insertNotifications([
        verification_status ? {
          user_id: data.user_id,
          type: 'winner-status',
          title: 'Winner verification updated',
          message: verification_status === 'approved'
            ? 'Your prize proof was approved.'
            : verification_status === 'rejected'
              ? `Your prize proof was rejected${rejection_reason ? `: ${rejection_reason}` : '.'}`
              : 'Your prize verification is pending review.',
          metadata: {
            winner_id: data.id,
            verification_status,
          },
        } : null,
        payment_status === 'paid' ? {
          user_id: data.user_id,
          type: 'winner-payment',
          title: 'Prize payment processed',
          message: 'Your prize payment has been marked as paid.',
          metadata: {
            winner_id: data.id,
            payment_status,
          },
        } : null,
      ].filter(Boolean)),
    ]);

    const [enrichedWinner] = await enrichWinners([data]);
    res.json(enrichedWinner);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update winner' });
  }
});

// --- STATS ---

router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const currentMonth = getMonthRange();
    const [
      { count: userCount, error: userCountError },
      activeUsersResult,
      { count: scoreCount, error: scoreCountError },
      { data: charities, error: charitiesError },
      { data: draws, error: drawsError },
      { data: winners, error: winnersError },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('subscription_plan').eq('subscription_status', 'active'),
      supabase.from('scores').select('*', { count: 'exact', head: true }),
      supabase.from('charities').select('*').order('total_raised', { ascending: false }),
      supabase.from('draws').select('*').order('month_year', { ascending: false }).limit(6),
      supabase.from('winners').select('id, amount, payment_status, verification_status, prize_tier, created_at').order('created_at', { ascending: false }).limit(25),
    ]);

    let activeUsers = activeUsersResult.data;
    let activeSubsError = activeUsersResult.error;

    if (activeSubsError && isMissingSubscriptionPlanColumn(activeSubsError)) {
      const fallbackActiveUsers = await supabase
        .from('users')
        .select('id')
        .eq('subscription_status', 'active');

      activeUsers = withDefaultSubscriptionPlans(fallbackActiveUsers.data);
      activeSubsError = fallbackActiveUsers.error;
    }

    if (userCountError || activeSubsError || scoreCountError || charitiesError || drawsError || winnersError) {
      throw userCountError || activeSubsError || scoreCountError || charitiesError || drawsError || winnersError;
    }

    const charityTotals = (charities || []).map((charity) => ({
      id: charity.id,
      name: charity.name,
      total_raised: parseNumber(charity.total_raised, 0),
      is_spotlight: Boolean(charity.is_spotlight),
    }));

    const overallCharityTotal = charityTotals.reduce((sum, charity) => sum + charity.total_raised, 0);
    const paidWinners = (winners || []).filter((winner) => winner.payment_status === 'paid');
    const approvedUnpaid = (winners || []).filter(
      (winner) => winner.verification_status === 'approved' && winner.payment_status !== 'paid'
    );
    const pendingVerification = (winners || []).filter((winner) => winner.verification_status === 'pending');
    const latestCurrentMonthDraw = (draws || []).find((draw) => draw.month_year === currentMonth.monthYear);
    const activeSubscribers = activeUsers?.length || 0;
    const projectedCurrentPool = parseFloat(((
      activeUsers || []
    ).reduce((sum, user) => sum + (getMonthlyPlanValue(user.subscription_plan) * PRIZE_POOL_SHARE), 0)).toFixed(2));

    res.json({
      total_users: userCount || 0,
      active_subscribers: activeSubscribers,
      total_scores: scoreCount || 0,
      total_pool: latestCurrentMonthDraw
        ? parseNumber(latestCurrentMonthDraw.total_pool, 0)
        : projectedCurrentPool,
      current_month: currentMonth.monthYear,
      charity_totals: charityTotals,
      overall_charity_total: parseFloat(overallCharityTotal.toFixed(2)),
      draw_history: (draws || []).map((draw) => ({
        id: draw.id,
        month_year: draw.month_year,
        status: draw.status,
        total_pool: parseNumber(draw.total_pool, 0),
        published_at: draw.published_at,
      })),
      winners_summary: {
        total_records: winners?.length || 0,
        pending_verification: pendingVerification.length,
        approved_unpaid: approvedUnpaid.length,
        paid_count: paidWinners.length,
        paid_amount_total: parseFloat(paidWinners.reduce((sum, winner) => sum + parseNumber(winner.amount, 0), 0).toFixed(2)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
