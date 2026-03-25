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
const SCORES_PER_DRAW = 5;
const DRAW_NUMBER_MIN = 1;
const DRAW_NUMBER_MAX = 45;
const DRAW_TIERS = [5, 4, 3];

const isMissingSubscriptionPlanColumn = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('subscription_plan') && message.includes('does not exist');
};

const isMissingCharityColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (message.includes('charities') || message.includes("'charity'")) && message.includes('column');
};

const isMissingJackpotRolloverColumn = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (message.includes('jackpot_rollover') && message.includes('does not exist')) || message.includes("'jackpot_rollover' column of 'draws'");
};

const getMissingCharityColumnName = (error) => {
  const message = String(error?.message || '');
  const singleQuoteMatch = message.match(/'([^']+)' column of 'charities'/i);
  if (singleQuoteMatch) {
    return singleQuoteMatch[1];
  }

  const doubleQuoteMatch = message.match(/column ["`]?([a-zA-Z0-9_]+)["`]?/i);
  return doubleQuoteMatch?.[1] || null;
};

const normalizeCharityRecord = (charity) => ({
  ...charity,
  logo_url: charity?.logo_url || null,
  image_url: charity?.image_url || null,
  description: charity?.description || '',
  upcoming_events: Array.isArray(charity?.upcoming_events) ? charity.upcoming_events : [],
  is_spotlight: Boolean(charity?.is_spotlight),
  total_raised: parseNumber(charity?.total_raised, 0),
});

const withDefaultSubscriptionPlans = (records) => (records || []).map((record) => ({
  ...record,
  subscription_plan: record.subscription_plan || 'monthly',
}));

const removeSubscriptionPlan = (payload = {}) => {
  const nextPayload = { ...payload };
  delete nextPayload.subscription_plan;
  return nextPayload;
};

const removeCharityColumns = (payload = {}, columns = []) => {
  const nextPayload = { ...payload };
  for (const column of columns) {
    delete nextPayload[column];
  }
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

const sortNumbersAscending = (numbers = []) => [...numbers].sort((left, right) => left - right);

const formatNumberSeries = (numbers = []) => numbers.join(', ');

const normalizeWinningNumbers = (numbers = []) => {
  const normalized = [...new Set((numbers || []).map((value) => parseInt(value, 10)).filter((value) => (
    Number.isInteger(value) && value >= DRAW_NUMBER_MIN && value <= DRAW_NUMBER_MAX
  )))];

  if (normalized.length !== SCORES_PER_DRAW) {
    throw new Error(`Winning numbers must contain ${SCORES_PER_DRAW} unique values between ${DRAW_NUMBER_MIN} and ${DRAW_NUMBER_MAX}`);
  }

  return sortNumbersAscending(normalized);
};

const buildRandomWinningNumbers = (excludedNumbers = []) => {
  const excluded = new Set(excludedNumbers);
  const selected = new Set(excludedNumbers);

  while (selected.size < SCORES_PER_DRAW + excludedNumbers.length) {
    selected.add(Math.floor(Math.random() * DRAW_NUMBER_MAX) + DRAW_NUMBER_MIN);
  }

  return sortNumbersAscending([...selected].filter((number) => !excluded.has(number)).slice(0, SCORES_PER_DRAW));
};

const pickWeightedUniqueNumbers = (candidates) => {
  const selected = [];
  const available = candidates
    .filter((candidate) => candidate.weight > 0)
    .map((candidate) => ({ ...candidate }));

  while (selected.length < SCORES_PER_DRAW && available.length > 0) {
    const winner = weightedPick(available);
    if (!winner) {
      break;
    }

    selected.push(winner.number);
    const winnerIndex = available.findIndex((candidate) => candidate.number === winner.number);
    if (winnerIndex >= 0) {
      available.splice(winnerIndex, 1);
    }
  }

  if (selected.length < SCORES_PER_DRAW) {
    const filler = buildRandomWinningNumbers(selected);
    selected.push(...filler.slice(0, SCORES_PER_DRAW - selected.length));
  }

  return sortNumbersAscending(selected);
};

const buildWinningNumbers = ({ type, weighting, scoreFrequency, winningNumbers }) => {
  if (Array.isArray(winningNumbers) && winningNumbers.length) {
    return normalizeWinningNumbers(winningNumbers);
  }

  if (type !== 'algorithmic') {
    return buildRandomWinningNumbers();
  }

  const weightedCandidates = Object.entries(scoreFrequency || {}).map(([score, frequency]) => ({
    number: parseInt(score, 10),
    weight: weighting === 'least' ? 1 / Math.max(frequency, 1) : Math.max(frequency, 1),
  }));

  return pickWeightedUniqueNumbers(weightedCandidates);
};

const getTierKey = (tier) => `tier_${tier}`;

const getMatchNumbers = (submittedScores = [], winningNumbers = []) => {
  const submitted = new Set((submittedScores || []).map((score) => parseInt(score, 10)));
  return winningNumbers.filter((number) => submitted.has(number));
};

const buildPrizeBreakdown = ({ totalPool, poolSplit, incomingJackpotRollover, tierWinners }) => {
  return DRAW_TIERS.reduce((result, tier) => {
    const tierKey = getTierKey(tier);
    const basePoolAmount = parseFloat((totalPool * parseNumber(poolSplit[tierKey], 0)).toFixed(2));
    const totalTierPool = parseFloat((basePoolAmount + (tier === 5 ? incomingJackpotRollover : 0)).toFixed(2));
    const winners = tierWinners[tierKey] || [];
    const winnerCount = winners.length;
    const perWinnerAmount = winnerCount > 0
      ? parseFloat((totalTierPool / winnerCount).toFixed(2))
      : 0;
    const rolloverAmount = tier === 5 && winnerCount === 0 ? totalTierPool : 0;

    result[tierKey] = {
      tier,
      tier_key: tierKey,
      winner_count: winnerCount,
      base_pool_amount: basePoolAmount,
      total_pool_amount: totalTierPool,
      per_winner_amount: perWinnerAmount,
      rollover_amount: rolloverAmount,
      winners,
    };
    return result;
  }, {});
};

const fetchIncomingJackpotRollover = async (monthYear) => {
  try {
    const { data, error } = await supabase
      .from('draws')
      .select('jackpot_rollover')
      .eq('status', 'published')
      .lt('month_year', monthYear)
      .order('month_year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingJackpotRolloverColumn(error)) {
        return 0;
      }
      throw error;
    }

    return parseNumber(data?.jackpot_rollover, 0);
  } catch (err) {
    if (isMissingJackpotRolloverColumn(err)) {
      return 0;
    }
    throw err;
  }
};

const buildParticipantEntries = ({ participants, scores, monthEnd }) => {
  const scoresByUser = {};

  for (const scoreEntry of scores || []) {
    const playedDate = new Date(scoreEntry.played_date);
    if (Number.isNaN(playedDate.getTime()) || playedDate >= monthEnd) {
      continue;
    }

    scoresByUser[scoreEntry.user_id] = scoresByUser[scoreEntry.user_id] || [];
    scoresByUser[scoreEntry.user_id].push(scoreEntry);
  }

  return (participants || []).map((participant) => {
    const latestScores = (scoresByUser[participant.id] || [])
      .sort((left, right) => {
        const playedDateDiff = new Date(right.played_date) - new Date(left.played_date);
        if (playedDateDiff !== 0) {
          return playedDateDiff;
        }
        return new Date(right.created_at || 0) - new Date(left.created_at || 0);
      })
      .slice(0, SCORES_PER_DRAW)
      .map((entry) => parseInt(entry.score, 10))
      .filter((score) => Number.isInteger(score));

    return {
      ...participant,
      submitted_scores: sortNumbersAscending(latestScores),
      score_count: latestScores.length,
    };
  }).filter((participant) => participant.score_count >= SCORES_PER_DRAW);
};

const simulateDrawOutcome = async ({ monthYearInput, type = 'algorithmic', weighting = 'most', winningNumbers = null }) => {
  const { end, monthYear, label } = getMonthRange(monthYearInput);

  let [{ data: participants, error: userError }, { data: scores, error: scoreError }] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, subscription_status, subscription_plan')
      .eq('subscription_status', 'active'),
    supabase
      .from('scores')
      .select('user_id, score, played_date, created_at')
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

  const eligibleParticipants = buildParticipantEntries({
    participants,
    scores,
    monthEnd: end,
  });

  const scoreFrequency = {};
  for (const participant of eligibleParticipants) {
    for (const score of participant.submitted_scores) {
      scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;
    }
  }

  const resolvedWinningNumbers = buildWinningNumbers({
    type,
    weighting,
    scoreFrequency,
    winningNumbers,
  });

  const tierWinners = {
    tier_5: [],
    tier_4: [],
    tier_3: [],
  };

  for (const participant of eligibleParticipants) {
    const matchedNumbers = getMatchNumbers(participant.submitted_scores, resolvedWinningNumbers);
    const matchCount = matchedNumbers.length;

    if (!DRAW_TIERS.includes(matchCount)) {
      continue;
    }

    tierWinners[getTierKey(matchCount)].push({
      id: participant.id,
      full_name: participant.full_name,
      email: participant.email,
      submitted_scores: participant.submitted_scores,
      matched_numbers: matchedNumbers,
      match_count: matchCount,
    });
  }

  const totalPool = parseFloat(((participants || []).reduce(
    (sum, participant) => sum + (getMonthlyPlanValue(participant.subscription_plan) * PRIZE_POOL_SHARE),
    0
  )).toFixed(2));
  const incomingJackpotRollover = await fetchIncomingJackpotRollover(monthYear);
  const prizeBreakdown = buildPrizeBreakdown({
    totalPool,
    poolSplit: DEFAULT_POOL_SPLIT,
    incomingJackpotRollover,
    tierWinners,
  });
  const winnerCount = Object.values(prizeBreakdown).reduce((sum, tier) => sum + tier.winner_count, 0);

  return {
    total_participants: participants?.length || 0,
    eligible_participants: eligibleParticipants.length,
    total_pool: totalPool,
    pool_split: DEFAULT_POOL_SPLIT,
    winning_numbers: resolvedWinningNumbers,
    incoming_jackpot_rollover: incomingJackpotRollover,
    outgoing_jackpot_rollover: prizeBreakdown.tier_5?.rollover_amount || 0,
    prize_breakdown: prizeBreakdown,
    winner_count: winnerCount,
    is_simulation: true,
    month_year: monthYear,
    month_label: label,
    settings: { type, weighting },
  };
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

const ensureBucket = async (bucketName, options = {}) => {
  const { data: existingBucket, error: getBucketError } = await supabase
    .storage
    .getBucket(bucketName);

  if (!getBucketError && existingBucket) {
    return existingBucket;
  }

  const { data: createdBucket, error: createBucketError } = await supabase
    .storage
    .createBucket(bucketName, options);

  if (createBucketError && !String(createBucketError.message || '').toLowerCase().includes('already exists')) {
    throw createBucketError;
  }

  return createdBucket || { name: bucketName, public: Boolean(options.public) };
};

const parseDataUrl = (dataUrl) => {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image payload');
  }

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
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

const listCharitiesWithFallback = async () => {
  const fallbackColumns = new Set();

  while (true) {
    const hasSpotlight = !fallbackColumns.has('is_spotlight');
    const hasRaised = !fallbackColumns.has('total_raised');
    const hasImage = !fallbackColumns.has('image_url');
    const hasEvents = !fallbackColumns.has('upcoming_events');
    const hasLogo = !fallbackColumns.has('logo_url');

    const selectedColumns = [
      'id',
      'name',
      'description',
      hasLogo ? 'logo_url' : null,
      hasImage ? 'image_url' : null,
      hasEvents ? 'upcoming_events' : null,
      hasSpotlight ? 'is_spotlight' : null,
      hasRaised ? 'total_raised' : null,
      'created_at',
      'updated_at',
    ].filter(Boolean).join(', ');

    let query = supabase
      .from('charities')
      .select(selectedColumns);

    if (hasSpotlight) {
      query = query.order('is_spotlight', { ascending: false });
    }

    if (hasRaised) {
      query = query.order('total_raised', { ascending: false });
    }

    query = query.order('name');

    const { data, error } = await query;
    if (!error) {
      return (data || []).map((charity) => normalizeCharityRecord(charity));
    }

    if (!isMissingCharityColumnError(error)) {
      throw error;
    }

    const missingColumn = getMissingCharityColumnName(error);
    if (!missingColumn || fallbackColumns.has(missingColumn)) {
      throw error;
    }

    fallbackColumns.add(missingColumn);
  }
};

const saveCharityWithFallback = async ({ method, charityId, payload }) => {
  const omittedColumns = new Set();

  while (true) {
    const currentPayload = removeCharityColumns(payload, [...omittedColumns]);
    let query = supabase.from('charities');

    if (method === 'insert') {
      query = query.insert([currentPayload]);
    } else {
      query = query.update(currentPayload).eq('id', charityId);
    }

    const { data, error } = await query.select().single();
    if (!error) {
      return normalizeCharityRecord(data);
    }

    if (!isMissingCharityColumnError(error)) {
      throw error;
    }

    const missingColumn = getMissingCharityColumnName(error);
    if (!missingColumn || omittedColumns.has(missingColumn)) {
      throw error;
    }

    omittedColumns.add(missingColumn);
  }
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

router.post('/storage/charity-assets/ensure', requireAdmin, async (_req, res) => {
  try {
    const bucket = await ensureBucket('charity-assets', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
    });

    res.json({
      success: true,
      bucket: bucket?.name || 'charity-assets',
    });
  } catch (error) {
    console.error('Ensure charity-assets bucket error:', error);
    res.status(500).json({ error: error.message || 'Failed to prepare charity image storage' });
  }
});

router.post('/storage/charity-assets/upload', requireAdmin, async (req, res) => {
  try {
    const { file_name, file_data, field = 'image' } = req.body || {};

    if (!file_name || !file_data) {
      return res.status(400).json({ error: 'file_name and file_data are required' });
    }

    const safeField = ['logo_url', 'image_url'].includes(field) ? field : 'image';
    const safeFileName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '-');
    const { contentType, buffer } = parseDataUrl(file_data);

    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }

    await ensureBucket('charity-assets', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
    });

    const storagePath = `charities/${Date.now()}-${safeField}-${safeFileName}`;
    const { error: uploadError } = await supabase
      .storage
      .from('charity-assets')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase
      .storage
      .from('charity-assets')
      .getPublicUrl(storagePath);

    res.json({
      path: storagePath,
      public_url: data?.publicUrl || null,
    });
  } catch (error) {
    console.error('Charity asset upload error:', error);
    const message = error.message || 'Failed to upload charity image';
    const statusCode = message.includes('required') || message.includes('Invalid image') || message.includes('Only image')
      ? 400
      : 500;
    res.status(statusCode).json({ error: message });
  }
});

router.get('/charities', requireAdmin, async (_req, res) => {
  try {
    const charities = await listCharitiesWithFallback();
    res.json(charities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/charities', requireAdmin, async (req, res) => {
  try {
    const payload = buildCharityPayload(req.body);
    const data = await saveCharityWithFallback({
      method: 'insert',
      payload,
    });

    if (data.is_spotlight) {
      try {
        await clearOtherSpotlights(data.id);
      } catch (spotlightError) {
        if (!isMissingCharityColumnError(spotlightError)) {
          throw spotlightError;
        }
      }
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

    const data = await saveCharityWithFallback({
      method: 'update',
      charityId: req.params.id,
      payload,
    });

    if (data.is_spotlight) {
      try {
        await clearOtherSpotlights(data.id);
      } catch (spotlightError) {
        if (!isMissingCharityColumnError(spotlightError)) {
          throw spotlightError;
        }
      }
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

    const simulation = await simulateDrawOutcome({
      monthYearInput: req.body.month_year,
      type,
      weighting,
    });

    res.json(simulation);
  } catch (error) {
    console.error('Simulation Error:', error);
    const message = error.message || 'Draw simulation failed';
    res.status(message.includes('month_year') || message.includes('Invalid date') ? 400 : 500).json({ error: message });
  }
});

router.post('/draws/publish', requireAdmin, async (req, res) => {
  const settings = req.body.settings || {};

  try {
    if (!req.body.month_year) {
      return res.status(400).json({ error: 'month_year is required for publishing' });
    }

    if (!Array.isArray(req.body.winning_numbers) || req.body.winning_numbers.length !== SCORES_PER_DRAW) {
      return res.status(400).json({ error: `winning_numbers must contain ${SCORES_PER_DRAW} numbers before publishing` });
    }

    const type = settings.type === 'random' ? 'random' : 'algorithmic';
    const weighting = settings.weighting === 'least' ? 'least' : 'most';
    const simulation = await simulateDrawOutcome({
      monthYearInput: req.body.month_year,
      type,
      weighting,
      winningNumbers: req.body.winning_numbers,
    });
    const { monthYear } = getMonthRange(req.body.month_year);

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

    const payload = {
      month_year: monthYear,
      status: 'published',
      settings: simulation.settings,
      total_pool: simulation.total_pool,
      pool_split: simulation.pool_split,
      winning_numbers: simulation.winning_numbers,
      published_at: new Date().toISOString(),
    };

    // Only add jackpot_rollover if the column exists
    if (simulation.outgoing_jackpot_rollover !== undefined) {
      payload.jackpot_rollover = simulation.outgoing_jackpot_rollover;
    }

    const { data: draw, error: drawError } = await supabase
      .from('draws')
      .insert([payload])
      .select()
      .single();

    if (drawError) {
      if (isMissingJackpotRolloverColumn(drawError)) {
        // Retry without jackpot_rollover
        const { data: retryDraw, error: retryError } = await supabase
          .from('draws')
          .insert([{
            month_year: monthYear,
            status: 'published',
            settings: simulation.settings,
            total_pool: simulation.total_pool,
            pool_split: simulation.pool_split,
            winning_numbers: simulation.winning_numbers,
            published_at: new Date().toISOString(),
          }])
          .select()
          .single();
        
        if (retryError) throw retryError;
        // manually set draw and continue
      } else {
        throw drawError;
      }
    }

    const winnerRecords = Object.values(simulation.prize_breakdown || [])
      .flatMap((tierResult) => tierResult.winners.map((winner) => ({
        draw_id: draw.id,
        user_id: winner.id,
        prize_tier: tierResult.tier,
        amount: tierResult.per_winner_amount,
        matched_numbers: winner.matched_numbers,
        submitted_scores: winner.submitted_scores,
        verification_status: 'pending',
        payment_status: 'pending',
      })));

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
            winning_numbers: simulation.winning_numbers,
            matched_numbers: winner.matched_numbers || [],
          },
        }))),
        insertNotifications(insertedWinners.map((winner) => ({
          user_id: winner.user_id,
          type: 'winner-announcement',
          title: 'You have won this month’s draw',
          message: `You matched ${winner.prize_tier} winning numbers (${formatNumberSeries(winner.matched_numbers || [])}) and have a pending reward of INR ${parseNumber(winner.amount, 0).toLocaleString('en-IN')}.`,
          metadata: {
            draw_id: draw.id,
            winner_id: winner.id,
            month_year: monthYear,
            winning_numbers: simulation.winning_numbers,
          },
        }))),
      ]);
    }

    res.json({
      message: 'Draw published and winners recorded',
      draw_id: draw.id,
      winner_count: winnerRecords.length,
      winning_numbers: simulation.winning_numbers,
    });
  } catch (error) {
    console.error('Publish Error:', error);
    const message = error.message || 'Failed to publish draw';
    const statusCode = message.includes('already exists')
      ? 409
      : message.includes('month_year')
      || message.includes('winning_numbers')
      || message.includes('Invalid date')
      ? 400
      : 500;
    res.status(statusCode).json({ error: message });
  }
});

// --- WINNER MANAGEMENT ---

router.get('/winners', requireAdmin, async (_req, res) => {
  try {
    let { data, error } = await supabase
      .from('winners')
      .select('*, users(full_name, email), draws(month_year, published_at, total_pool, winning_numbers, jackpot_rollover)')
      .order('created_at', { ascending: false });

    if (error && isMissingJackpotRolloverColumn(error)) {
      const fallback = await supabase
        .from('winners')
        .select('*, users(full_name, email), draws(month_year, published_at, total_pool, winning_numbers)')
        .order('created_at', { ascending: false });
      data = (fallback.data || []).map(w => ({ ...w, draws: { ...w.draws, jackpot_rollover: 0 } }));
      error = fallback.error;
    }

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
      .select('verification_status, payment_status')
      .eq('id', req.params.id)
      .single();

    if (winnerFetchError) throw winnerFetchError;

    if (payment_status === 'paid' && currentWinner.payment_status === 'paid') {
      return res.status(400).json({ error: 'Payment is already marked as paid' });
    }

    if (updates.payment_status === 'paid' && currentWinner.verification_status !== 'approved' && updates.verification_status !== 'approved') {
      return res.status(400).json({ error: 'Winner must be approved before payment is marked as paid' });
    }

    const paymentStatusChanged = payment_status !== undefined && payment_status !== currentWinner.payment_status;

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

    if (paymentStatusChanged) {
      auditActions.push({
        winner_id: req.params.id,
        actor_user_id: req.user.id,
        action: `payment_${payment_status}`,
        notes: `Winner payment marked as ${payment_status}`,
        metadata: {},
      });
    }

    let { data, error } = await supabase
      .from('winners')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, users(full_name, email), draws(month_year, published_at, total_pool, winning_numbers, jackpot_rollover)')
      .single();

    if (error && isMissingJackpotRolloverColumn(error)) {
      const fallback = await supabase
        .from('winners')
        .update(updates)
        .eq('id', req.params.id)
        .select('*, users(full_name, email), draws(month_year, published_at, total_pool, winning_numbers)')
        .single();
      data = fallback.data
        ? {
          ...fallback.data,
          draws: fallback.data.draws
            ? { ...fallback.data.draws, jackpot_rollover: 0 }
            : fallback.data.draws,
        }
        : fallback.data;
      error = fallback.error;
    }

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
        paymentStatusChanged && payment_status === 'paid' ? {
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
      { data: draws, error: drawsError },
      { data: winners, error: winnersError },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('subscription_plan').eq('subscription_status', 'active'),
      supabase.from('scores').select('*', { count: 'exact', head: true }),
      supabase.from('draws').select('*').order('month_year', { ascending: false }).limit(6),
      supabase.from('winners').select('id, amount, payment_status, verification_status, prize_tier, created_at').order('created_at', { ascending: false }).limit(25),
    ]);

    let charities = [];
    let charitiesError = null;
    try {
      charities = await listCharitiesWithFallback();
    } catch (error) {
      charitiesError = error;
    }

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
