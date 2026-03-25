const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabase");
const { requireActiveSubscription } = require("../middleware/authMiddleware");

const isMissingSchemaError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("does not exist") || message.includes("could not find")
  );
};

const isMissingJackpotRolloverColumn = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("jackpot_rollover") && message.includes("does not exist")
  );
};

const ensureBucket = async (bucketName, options = {}) => {
  const { data: existingBucket, error: getBucketError } =
    await supabase.storage.getBucket(bucketName);

  if (!getBucketError && existingBucket) {
    return existingBucket;
  }

  const { data: createdBucket, error: createBucketError } =
    await supabase.storage.createBucket(bucketName, options);

  if (
    createBucketError &&
    !String(createBucketError.message || "")
      .toLowerCase()
      .includes("already exists")
  ) {
    throw createBucketError;
  }

  return createdBucket || { name: bucketName, public: Boolean(options.public) };
};

const parseDataUrl = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image payload");
  }

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
};

const attachProofUrls = async (wins) =>
  Promise.all(
    (wins || []).map(async (win) => {
      const proofPath = win.screenshot_url;

      if (!proofPath) {
        return { ...win, proof_signed_url: null };
      }

      if (/^https?:\/\//i.test(proofPath)) {
        return { ...win, proof_signed_url: proofPath };
      }

      const { data } = await supabase.storage
        .from("winner-proofs")
        .createSignedUrl(proofPath, 60 * 60);

      return {
        ...win,
        proof_signed_url: data?.signedUrl || null,
      };
    }),
  );

router.get("/", async (_req, res) => {
  try {
    let { data, error } = await supabase
      .from("draws")
      .select(
        "id, month_year, status, total_pool, pool_split, winning_numbers, jackpot_rollover, published_at",
      )
      .eq("status", "published")
      .order("month_year", { ascending: false });

    if (error && isMissingJackpotRolloverColumn(error)) {
      const fallback = await supabase
        .from("draws")
        .select(
          "id, month_year, status, total_pool, pool_split, winning_numbers, published_at",
        )
        .eq("status", "published")
        .order("month_year", { ascending: false });
      data = (fallback.data || []).map((d) => ({ ...d, jackpot_rollover: 0 }));
      error = fallback.error;
    }

    if (error && isMissingSchemaError(error)) {
      return res.json([]);
    }

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Public draws route error:", error);
    res.status(500).json({ error: "Failed to fetch published draws" });
  }
});

router.get("/my-wins", requireActiveSubscription, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("winners")
      .select(
        "*, draws(month_year, published_at, total_pool, winning_numbers, jackpot_rollover)",
      )
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error && isMissingJackpotRolloverColumn(error)) {
      const fallback = await supabase
        .from("winners")
        .select(
          "*, draws(month_year, published_at, total_pool, winning_numbers)",
        )
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false });
      data = (fallback.data || []).map((w) => ({
        ...w,
        draws: { ...w.draws, jackpot_rollover: 0 },
      }));
      error = fallback.error;
    }

    if (error && isMissingSchemaError(error)) {
      return res.json([]);
    }

    if (error) throw error;
    const wins = await attachProofUrls(data || []);
    res.json(wins);
  } catch (error) {
    console.error("My wins route error:", error);
    res.status(500).json({ error: "Failed to fetch winner history" });
  }
});

router.post(
  "/winners/:id/proof",
  requireActiveSubscription,
  async (req, res) => {
    try {
      const { data: winner, error: winnerError } = await supabase
        .from("winners")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", req.user.id)
        .single();

      if (winnerError || !winner) {
        return res.status(404).json({ error: "Winner record not found" });
      }

      let screenshotUrl = req.body?.screenshot_url?.trim() || "";

      if (req.body?.file_name && req.body?.file_data) {
        const safeFileName = String(req.body.file_name).replace(
          /[^a-zA-Z0-9._-]/g,
          "-",
        );
        const { contentType, buffer } = parseDataUrl(req.body.file_data);

        if (!contentType.startsWith("image/")) {
          return res
            .status(400)
            .json({ error: "Only image uploads are allowed" });
        }

        await ensureBucket("winner-proofs", {
          public: false,
          fileSizeLimit: 5 * 1024 * 1024,
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
            "image/svg+xml",
          ],
        });

        const storagePath = `${req.user.id}/${req.params.id}/${Date.now()}-${safeFileName}`;
        const { error: uploadError } = await supabase.storage
          .from("winner-proofs")
          .upload(storagePath, buffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        screenshotUrl = storagePath;
      }

      if (!screenshotUrl) {
        return res
          .status(400)
          .json({ error: "A proof screenshot or image file is required" });
      }

      const { data: updatedWinner, error: updateError } = await supabase
        .from("winners")
        .update({
          screenshot_url: screenshotUrl,
          verification_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.params.id)
        .eq("user_id", req.user.id)
        .select(
          "*, draws(month_year, published_at, total_pool, winning_numbers, jackpot_rollover)",
        )
        .single();

      let resolvedWinner = updatedWinner;
      let resolvedError = updateError;

      if (resolvedError && isMissingJackpotRolloverColumn(resolvedError)) {
        const fallback = await supabase
          .from("winners")
          .update({
            screenshot_url: screenshotUrl,
            verification_status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", req.params.id)
          .eq("user_id", req.user.id)
          .select(
            "*, draws(month_year, published_at, total_pool, winning_numbers)",
          )
          .single();

        resolvedWinner = fallback.data
          ? {
              ...fallback.data,
              draws: fallback.data.draws
                ? { ...fallback.data.draws, jackpot_rollover: 0 }
                : fallback.data.draws,
            }
          : fallback.data;
        resolvedError = fallback.error;
      }

      if (resolvedError) throw resolvedError;

      await Promise.all([
        supabase.from("winner_audit_logs").insert([
          {
            winner_id: req.params.id,
            actor_user_id: req.user.id,
            action: "proof_submitted",
            notes: "Winner uploaded score proof for review",
            metadata: {
              screenshot_url: screenshotUrl,
            },
          },
        ]),
        supabase.from("notifications").insert([
          {
            user_id: req.user.id,
            type: "winner-proof",
            title: "Proof submitted",
            message:
              "Your score proof was submitted successfully and is awaiting admin review.",
            metadata: {
              winner_id: req.params.id,
            },
          },
        ]),
      ]);

      const [winnerWithSignedProof] = await attachProofUrls([resolvedWinner]);
      res.json(winnerWithSignedProof);
    } catch (error) {
      console.error("Winner proof submission error:", error);
      const message = error.message || "Failed to submit proof";
      const statusCode =
        message.includes("required") ||
        message.includes("Only image") ||
        message.includes("Invalid image")
          ? 400
          : 500;
      res.status(statusCode).json({ error: message });
    }
  },
);

router.get("/notifications", requireActiveSubscription, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error && isMissingSchemaError(error)) {
      return res.json([]);
    }

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Notifications route error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.patch(
  "/notifications/:id/read",
  requireActiveSubscription,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", req.params.id)
        .eq("user_id", req.user.id)
        .select()
        .single();

      if (error && isMissingSchemaError(error)) {
        return res.json({
          id: req.params.id,
          user_id: req.user.id,
          is_read: true,
          read_at: new Date().toISOString(),
        });
      }

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  },
);

module.exports = router;
