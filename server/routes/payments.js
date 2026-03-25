const crypto = require('crypto');
const express = require('express');
const Razorpay = require('razorpay');
const supabase = require('../utils/supabase');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const VALID_SUBSCRIPTION_PLANS = ['monthly', 'yearly'];
const PLAN_AMOUNTS_INR = {
  monthly: 1500,
  yearly: 15000,
};

const isMissingSubscriptionPlanColumn = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('subscription_plan') && message.includes('does not exist');
};

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

router.post('/razorpay/order', requireAuth, async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay credentials are not configured on the server' });
    }

    const requestedPlan = String(req.body?.plan || 'monthly').toLowerCase();
    if (!VALID_SUBSCRIPTION_PLANS.includes(requestedPlan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    const amountInr = PLAN_AMOUNTS_INR[requestedPlan];
    const amountPaise = amountInr * 100;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sub_${req.user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: req.user.id,
        plan: requestedPlan,
      },
    });

    res.json({
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: requestedPlan,
      amount_inr: amountInr,
      prefill: {
        name: req.user.user_metadata?.full_name || '',
        email: req.user.email || '',
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

router.post('/razorpay/verify', requireAuth, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay credentials are not configured on the server' });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
    } = req.body || {};

    const normalizedPlan = String(plan || 'monthly').toLowerCase();
    if (!VALID_SUBSCRIPTION_PLANS.includes(normalizedPlan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const payload = {
      subscription_status: 'active',
      subscription_plan: normalizedPlan,
    };

    let { data: updatedUser, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', req.user.id)
      .select('id')
      .maybeSingle();

    if (error && isMissingSubscriptionPlanColumn(error)) {
      const fallbackPayload = { subscription_status: 'active' };
      const fallbackResult = await supabase
        .from('users')
        .update(fallbackPayload)
        .eq('id', req.user.id)
        .select('id')
        .maybeSingle();

      updatedUser = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      throw error;
    }

    if (!updatedUser) {
      const fallbackName =
        req.user.user_metadata?.full_name
        || (req.user.email ? req.user.email.split('@')[0] : null)
        || 'User';

      const upsertPayload = {
        id: req.user.id,
        full_name: fallbackName,
        email: req.user.email || null,
        role: 'user',
        subscription_status: 'active',
        subscription_plan: normalizedPlan,
        charity_percentage: 10,
        created_at: new Date().toISOString(),
      };

      let upsertResult = await supabase
        .from('users')
        .upsert(upsertPayload, { onConflict: 'id' });

      if (upsertResult.error && isMissingSubscriptionPlanColumn(upsertResult.error)) {
        const fallbackUpsertPayload = { ...upsertPayload };
        delete fallbackUpsertPayload.subscription_plan;
        upsertResult = await supabase
          .from('users')
          .upsert(fallbackUpsertPayload, { onConflict: 'id' });
      }

      if (upsertResult.error) {
        throw upsertResult.error;
      }
    }

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      payment_id: razorpay_payment_id,
      plan: normalizedPlan,
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;