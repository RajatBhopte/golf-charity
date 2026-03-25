const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const { requireAuth } = require("../middleware/authMiddleware");

const isMissingSchemaError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("does not exist") || message.includes("could not find")
  );
};

const normalizeCharity = (charity) => ({
  ...charity,
  logo_url: charity.logo_url || null,
  image_url: charity.image_url || null,
  description: charity.description || "",
  is_spotlight: Boolean(charity.is_spotlight),
  total_raised: Number(charity.total_raised || 0),
  upcoming_events: Array.isArray(charity.upcoming_events)
    ? charity.upcoming_events
    : [],
});

const isMissingTableError = (error, tableName) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes(String(tableName).toLowerCase()) &&
    message.includes("does not exist")
  );
};

router.get("/", async (req, res) => {
  try {
    const q = String(req.query?.q || "").trim();
    const spotlight = String(req.query?.spotlight || "").toLowerCase();
    const minRaised = Number(req.query?.min_raised || 0);

    let query = supabase
      .from("charities")
      .select("*")
      .order("is_spotlight", { ascending: false })
      .order("total_raised", { ascending: false })
      .order("name");

    if (q) {
      const safeSearch = q.replaceAll(",", " ").trim();
      query = query.or(
        `name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`,
      );
    }

    if (spotlight === "true") {
      query = query.eq("is_spotlight", true);
    }

    if (Number.isFinite(minRaised) && minRaised > 0) {
      query = query.gte("total_raised", minRaised);
    }

    let { data, error } = await query;

    if (error && isMissingSchemaError(error)) {
      const fallbackResult = await supabase
        .from("charities")
        .select("id, name, description, logo_url")
        .order("name");

      if (fallbackResult.error && isMissingSchemaError(fallbackResult.error)) {
        return res.json({ featured: null, charities: [] });
      }

      if (fallbackResult.error) throw fallbackResult.error;

      const fallbackData = (fallbackResult.data || []).map((charity) =>
        normalizeCharity(charity),
      );
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
    console.error("Public charities route error:", error);
    res.status(500).json({ error: "Failed to fetch charities" });
  }
});

router.post("/:id/donate", requireAuth, async (req, res) => {
  try {
    const charityId = req.params.id;
    const amount = Number(req.body?.amount || 0);

    if (!charityId) {
      return res.status(400).json({ error: "charity id is required" });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ error: "Donation amount must be greater than 0" });
    }

    const { data: charity, error: charityError } = await supabase
      .from("charities")
      .select("id, total_raised, name")
      .eq("id", charityId)
      .single();

    if (charityError || !charity) {
      return res.status(404).json({ error: "Charity not found" });
    }

    const donationPayload = {
      user_id: req.user.id,
      charity_id: charityId,
      amount,
      status: "completed",
      created_at: new Date().toISOString(),
    };

    const { data: donation, error: donationError } = await supabase
      .from("donations")
      .insert([donationPayload])
      .select("*")
      .single();

    if (donationError) {
      if (isMissingTableError(donationError, "donations")) {
        return res.status(500).json({
          error:
            "Donations table is missing. Run latest schema migration first.",
        });
      }
      throw donationError;
    }

    const updatedRaised = Number(charity.total_raised || 0) + amount;
    const { error: raisedError } = await supabase
      .from("charities")
      .update({ total_raised: updatedRaised })
      .eq("id", charityId);

    if (raisedError) {
      throw raisedError;
    }

    res.status(201).json({
      success: true,
      donation,
      charity: {
        id: charity.id,
        name: charity.name,
        total_raised: updatedRaised,
      },
    });
  } catch (error) {
    console.error("Donate route error:", error);
    res.status(500).json({ error: "Failed to complete donation" });
  }
});

router.get("/donations/mine", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("donations")
      .select("*, charities(name, logo_url)")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      if (isMissingTableError(error, "donations")) {
        return res.json({ donations: [] });
      }
      throw error;
    }

    const donations = Array.isArray(data)
      ? data.map((item) => ({
          ...item,
          charity_name: item?.charities?.name || null,
          charity_logo_url: item?.charities?.logo_url || null,
        }))
      : [];

    res.json({ donations });
  } catch (error) {
    console.error("My donations route error:", error);
    res.status(500).json({ error: "Failed to fetch donation history" });
  }
});

module.exports = router;
