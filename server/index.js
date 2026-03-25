const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));

// Routes
const authRoutes = require("./routes/auth");
const scoreRoutes = require("./routes/scores");
const drawRoutes = require("./routes/draws");
const charityRoutes = require("./routes/charities");
const adminRoutes = require("./routes/admin");
const paymentRoutes = require("./routes/payments");

app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/draws", drawRoutes);
app.use("/api/charities", charityRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

// Health check (useful for local/dev and deployment probes)
const healthHandler = (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "golf-charity-platform-api",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
