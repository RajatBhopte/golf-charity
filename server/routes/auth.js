const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const supabase = require("../utils/supabase");

const isMissingSubscriptionPlanColumn = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("subscription_plan") && message.includes("does not exist")
  );
};

const VALID_SUBSCRIPTION_PLANS = ["monthly", "yearly"];

/**
 * @route POST /api/auth/register
 * @desc Register user without email verification and create pending profile
 * @access Public
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name, plan, charity_id, charity_percentage } =
      req.body || {};

    if (!email || !password || !full_name) {
      return res
        .status(400)
        .json({ error: "email, password and full_name are required" });
    }

    if (String(password).length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const normalizedPlan = VALID_SUBSCRIPTION_PLANS.includes(plan)
      ? plan
      : "monthly";

    const normalizedCharityPercentage = parseInt(charity_percentage, 10) || 10;
    if (normalizedCharityPercentage < 10 || normalizedCharityPercentage > 100) {
      return res
        .status(400)
        .json({ error: "charity_percentage must be between 10 and 100" });
    }

    if (charity_id) {
      const { data: charity, error: charityError } = await supabase
        .from("charities")
        .select("id")
        .eq("id", charity_id)
        .single();

      if (charityError || !charity) {
        return res.status(400).json({ error: "Invalid charity_id" });
      }
    }

    const {
      data: { user },
      error: createError,
    } = await supabase.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: {
        full_name: String(full_name).trim(),
      },
    });

    if (createError || !user) {
      const message = createError?.message || "Failed to create user";
      return res
        .status(
          message.toLowerCase().includes("already") ||
            message.toLowerCase().includes("duplicate")
            ? 409
            : 400,
        )
        .json({ error: message });
    }

    const payload = {
      id: user.id,
      full_name: String(full_name).trim(),
      role: "user",
      email: user.email || String(email).trim(),
      subscription_plan: normalizedPlan,
      charity_id: charity_id || null,
      charity_percentage: normalizedCharityPercentage,
      subscription_status: "pending",
      created_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "id" });

    if (error && isMissingSubscriptionPlanColumn(error)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.subscription_plan;

      const fallbackResult = await supabase
        .from("users")
        .upsert(fallbackPayload, { onConflict: "id" });

      error = fallbackResult.error;
    }

    if (error) {
      console.error("Error creating profile during register:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user_id: user.id,
    });
  } catch (err) {
    console.error("Auth register route error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /api/auth/sync
 * @desc Syncs user data to the public.users table after signup.
 * @access Public (Verifies user ID against Supabase Auth admin)
 */
router.post("/sync", async (req, res) => {
  try {
    const { id, full_name, plan, charity_id, charity_percentage } = req.body;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Verify the user actually exists in Supabase Auth using the service_role key
    const {
      data: { user },
      error: adminError,
    } = await supabase.auth.admin.getUserById(id);

    if (adminError || !user) {
      console.error("Auth sync admin verification failed:", {
        adminError,
        requestedUserId: id,
      });
      return res.status(401).json({
        error: "Invalid or unauthorized user ID",
        detail: adminError?.message || "Supabase admin lookup failed",
      });
    }

    // Insert or update the public user profile
    const payload = {
      id: user.id,
      full_name,
      role: "user",
      email: user.email || null,
      subscription_plan: plan || "monthly",
      charity_id: charity_id || null,
      charity_percentage: parseInt(charity_percentage, 10) || 10,
      subscription_status: "pending",
      created_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "id" });

    if (error && isMissingSubscriptionPlanColumn(error)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.subscription_plan;

      const fallbackResult = await supabase
        .from("users")
        .upsert(fallbackPayload, { onConflict: "id" });

      error = fallbackResult.error;
    }

    if (error) {
      console.error("Error syncing user:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: "User profile synchronized" });
  } catch (err) {
    console.error("Auth sync route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route PATCH /api/auth/me
 * @desc Update authenticated user's charity preferences
 * @access Private
 */
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const { charity_id, charity_percentage } = req.body || {};
    const payload = {};

    if (charity_id !== undefined) {
      if (charity_id === null || charity_id === "") {
        payload.charity_id = null;
      } else {
        const { data: charity, error: charityError } = await supabase
          .from("charities")
          .select("id")
          .eq("id", charity_id)
          .single();

        if (charityError || !charity) {
          return res.status(400).json({ error: "Invalid charity selection" });
        }

        payload.charity_id = charity_id;
      }
    }

    if (charity_percentage !== undefined) {
      const parsedPercentage = parseInt(charity_percentage, 10);
      if (
        Number.isNaN(parsedPercentage) ||
        parsedPercentage < 10 ||
        parsedPercentage > 100
      ) {
        return res
          .status(400)
          .json({ error: "Charity percentage must be between 10 and 100" });
      }
      payload.charity_percentage = parsedPercentage;
    }

    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: "No valid fields provided" });
    }

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", req.user.id)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message || "Update failed" });
    }

    return res.json(updatedUser);
  } catch (err) {
    console.error("Auth self-update route error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
