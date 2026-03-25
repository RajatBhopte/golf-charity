const crypto = require("crypto");
const express = require("express");
const Razorpay = require("razorpay");
const supabase = require("../utils/supabase");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");
const { sendSubscriptionStatusEmail } = require("../utils/email");

const router = express.Router();

const VALID_SUBSCRIPTION_PLANS = ["monthly", "yearly"];
const PLAN_AMOUNTS_INR = {
  monthly: 1500,
  yearly: 15000,
};

const isMissingSubscriptionPlanColumn = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("subscription_plan") && message.includes("does not exist")
  );
};

const getMissingUsersColumnName = (error) => {
  const message = String(error?.message || "");
  const usersColumnMatch = message.match(/'([^']+)' column of 'users'/i);
  if (usersColumnMatch) {
    return usersColumnMatch[1];
  }

  const genericColumnMatch = message.match(
    /column ["`']?([a-zA-Z0-9_]+)["`']?/i,
  );
  if (!genericColumnMatch) {
    return null;
  }

  return genericColumnMatch[1];
};

const getRenewalDateByPlan = (plan, baseDate = new Date()) => {
  const renewal = new Date(baseDate);
  if (plan === "yearly") {
    renewal.setFullYear(renewal.getFullYear() + 1);
  } else {
    renewal.setMonth(renewal.getMonth() + 1);
  }
  return renewal.toISOString();
};

const SAFE_USERS_SELECT = "id, email, full_name, subscription_status";

const updateUserWithFallback = async (userId, payload) => {
  const optionalColumns = new Set([
    "subscription_plan",
    "subscription_started_at",
    "subscription_renewal_date",
    "subscription_cancelled_at",
    "subscription_last_payment_at",
  ]);

  const omittedColumns = new Set();

  while (true) {
    const currentPayload = { ...payload };
    for (const key of omittedColumns) {
      delete currentPayload[key];
    }

    const result = await supabase
      .from("users")
      .update(currentPayload)
      .eq("id", userId)
      .select(SAFE_USERS_SELECT)
      .maybeSingle();

    if (!result.error) {
      return result;
    }

    if (
      isMissingSubscriptionPlanColumn(result.error) &&
      !omittedColumns.has("subscription_plan")
    ) {
      omittedColumns.add("subscription_plan");
      continue;
    }

    const missingColumn = getMissingUsersColumnName(result.error);
    if (
      missingColumn &&
      optionalColumns.has(missingColumn) &&
      !omittedColumns.has(missingColumn)
    ) {
      omittedColumns.add(missingColumn);
      continue;
    }

    return result;
  }
};

const upsertCancelledUserWithFallback = async (reqUser) => {
  const fallbackName =
    reqUser.user_metadata?.full_name ||
    (reqUser.email ? reqUser.email.split("@")[0] : null) ||
    "User";

  const basePayload = {
    id: reqUser.id,
    full_name: fallbackName,
    email: reqUser.email || null,
    role: "user",
    subscription_status: "cancelled",
    subscription_cancelled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  let result = await supabase.from("users").upsert(basePayload, {
    onConflict: "id",
  });

  if (result.error) {
    const missingColumn = getMissingUsersColumnName(result.error);
    if (missingColumn === "subscription_cancelled_at") {
      const fallbackPayload = { ...basePayload };
      delete fallbackPayload.subscription_cancelled_at;
      result = await supabase.from("users").upsert(fallbackPayload, {
        onConflict: "id",
      });
    }
  }

  if (result.error) {
    throw result.error;
  }

  return supabase
    .from("users")
    .select(SAFE_USERS_SELECT)
    .eq("id", reqUser.id)
    .maybeSingle();
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

router.post("/razorpay/order", requireAuth, async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({
        error: "Razorpay credentials are not configured on the server",
      });
    }

    const requestedPlan = String(req.body?.plan || "monthly").toLowerCase();
    if (!VALID_SUBSCRIPTION_PLANS.includes(requestedPlan)) {
      return res.status(400).json({ error: "Invalid subscription plan" });
    }

    const amountInr = PLAN_AMOUNTS_INR[requestedPlan];
    const amountPaise = amountInr * 100;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
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
        name: req.user.user_metadata?.full_name || "",
        email: req.user.email || "",
      },
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

router.post("/razorpay/verify", requireAuth, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        error: "Razorpay credentials are not configured on the server",
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } =
      req.body || {};

    const normalizedPlan = String(plan || "monthly").toLowerCase();
    if (!VALID_SUBSCRIPTION_PLANS.includes(normalizedPlan)) {
      return res.status(400).json({ error: "Invalid subscription plan" });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ error: "Missing payment verification fields" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const payload = {
      subscription_status: "active",
      subscription_plan: normalizedPlan,
      subscription_started_at: new Date().toISOString(),
      subscription_last_payment_at: new Date().toISOString(),
      subscription_cancelled_at: null,
      subscription_renewal_date: getRenewalDateByPlan(normalizedPlan),
    };

    let { data: updatedUser, error } = await updateUserWithFallback(
      req.user.id,
      payload,
    );

    if (error) {
      throw error;
    }

    if (!updatedUser) {
      const fallbackName =
        req.user.user_metadata?.full_name ||
        (req.user.email ? req.user.email.split("@")[0] : null) ||
        "User";

      const upsertPayload = {
        id: req.user.id,
        full_name: fallbackName,
        email: req.user.email || null,
        role: "user",
        subscription_status: "active",
        subscription_plan: normalizedPlan,
        subscription_started_at: new Date().toISOString(),
        subscription_last_payment_at: new Date().toISOString(),
        subscription_renewal_date: getRenewalDateByPlan(normalizedPlan),
        charity_percentage: 10,
        created_at: new Date().toISOString(),
      };

      let upsertResult = await supabase
        .from("users")
        .upsert(upsertPayload, { onConflict: "id" });

      if (
        upsertResult.error &&
        isMissingSubscriptionPlanColumn(upsertResult.error)
      ) {
        const fallbackUpsertPayload = { ...upsertPayload };
        delete fallbackUpsertPayload.subscription_plan;
        upsertResult = await supabase
          .from("users")
          .upsert(fallbackUpsertPayload, { onConflict: "id" });
      }

      if (upsertResult.error) {
        throw upsertResult.error;
      }

      const refreshedResult = await supabase
        .from("users")
        .select(SAFE_USERS_SELECT)
        .eq("id", req.user.id)
        .maybeSingle();
      updatedUser = refreshedResult.data;
    }

    await sendSubscriptionStatusEmail({
      to: updatedUser?.email || req.user.email,
      fullName: updatedUser?.full_name || req.user.user_metadata?.full_name,
      status: "active",
      plan: normalizedPlan,
      renewalDate: updatedUser?.subscription_renewal_date || null,
    });

    res.json({
      success: true,
      message: "Payment verified and subscription activated",
      payment_id: razorpay_payment_id,
      plan: normalizedPlan,
    });
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

router.post("/cancel", requireAuth, async (req, res) => {
  try {
    const payload = {
      subscription_status: "cancelled",
      subscription_cancelled_at: new Date().toISOString(),
    };

    let { data, error } = await updateUserWithFallback(req.user.id, payload);

    if (!error && !data) {
      const fallback = await upsertCancelledUserWithFallback(req.user);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    await sendSubscriptionStatusEmail({
      to: data?.email || req.user.email,
      fullName: data?.full_name || req.user.user_metadata?.full_name,
      status: "cancelled",
      plan: data?.subscription_plan || null,
      renewalDate: data?.subscription_renewal_date || null,
    });

    res.json({
      success: true,
      message: "Subscription cancelled successfully",
      subscription_status: "cancelled",
      revoked_premium_access: true,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

router.post("/lifecycle/reconcile", requireAdmin, async (_req, res) => {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("users")
      .update({ subscription_status: "lapsed" })
      .eq("subscription_status", "active")
      .lt("subscription_renewal_date", nowIso)
      .select(
        "id, email, full_name, subscription_plan, subscription_renewal_date",
      );

    if (error) {
      const missing = getMissingUsersColumnName(error);
      if (missing === "subscription_renewal_date") {
        return res.status(400).json({
          error:
            "subscription_renewal_date column missing. Run latest migration first.",
        });
      }
      throw error;
    }

    await Promise.all(
      (data || []).map((userRow) =>
        sendSubscriptionStatusEmail({
          to: userRow.email,
          fullName: userRow.full_name,
          status: "lapsed",
          plan: userRow.subscription_plan,
          renewalDate: userRow.subscription_renewal_date,
        }),
      ),
    );

    res.json({ success: true, lapsed_count: data?.length || 0 });
  } catch (error) {
    console.error("Lifecycle reconcile error:", error);
    res.status(500).json({ error: "Failed to reconcile lifecycle states" });
  }
});

router.post(
  "/razorpay/webhook",
  express.json({ type: "*/*" }),
  async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"];

      if (webhookSecret && signature) {
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(JSON.stringify(req.body))
          .digest("hex");

        if (expectedSignature !== signature) {
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
      }

      const event = req.body?.event;
      const notes = req.body?.payload?.payment?.entity?.notes || {};
      const userId = notes.user_id;
      const plan = VALID_SUBSCRIPTION_PLANS.includes(notes.plan)
        ? notes.plan
        : "monthly";

      if (!userId) {
        return res.json({ received: true, ignored: true });
      }

      if (event === "payment.captured") {
        await updateUserWithFallback(userId, {
          subscription_status: "active",
          subscription_plan: plan,
          subscription_last_payment_at: new Date().toISOString(),
          subscription_cancelled_at: null,
          subscription_renewal_date: getRenewalDateByPlan(plan),
        });
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Razorpay webhook error:", error);
      res.status(500).json({ error: "Webhook handling failed" });
    }
  },
);

module.exports = router;
