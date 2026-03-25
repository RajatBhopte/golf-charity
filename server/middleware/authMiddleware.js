const supabase = require("../utils/supabase");

/**
 * Middleware to verify Supabase JWT token.
 * Expects header: "Authorization: Bearer <token>"
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token using Supabase Auth payload
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Auth error:", error);
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Attach user payload to request for downstream handlers
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res
      .status(500)
      .json({ error: "Internal server error during authentication" });
  }
};

/**
 * Middleware to ensure the authenticated user has an active subscription.
 * Uses requireAuth first, then checks public.users.subscription_status.
 */
const requireActiveSubscription = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const { data: profile, error } = await supabase
        .from("users")
        .select("subscription_status")
        .eq("id", req.user.id)
        .single();

      if (error || !profile) {
        return res.status(403).json({
          error: "Subscription check failed",
          code: "SUBSCRIPTION_CHECK_FAILED",
        });
      }

      if (profile.subscription_status !== "active") {
        return res.status(403).json({
          error: "Active subscription required to access this feature",
          code: "SUBSCRIPTION_REQUIRED",
          cta: "/subscribe",
        });
      }

      next();
    } catch (error) {
      console.error("Active subscription middleware error:", error);
      res
        .status(500)
        .json({
          error: "Internal server error during subscription validation",
        });
    }
  });
};

module.exports = { requireAuth, requireActiveSubscription };
