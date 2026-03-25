import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const PLAN_OPTIONS = [
  {
    id: "monthly",
    label: "Monthly",
    amountInr: 1500,
    description: "Flexible plan billed every month.",
    perks: [
      "Up to 5 rolling scores",
      "Monthly draw eligibility",
      "Charity donations",
      "Cancel anytime",
    ],
  },
  {
    id: "yearly",
    label: "Yearly",
    amountInr: 15000,
    description: "Save with annual billing.",
    badge: "Save Rs 3,000",
    perks: [
      "Everything in Monthly",
      "2 months free",
      "Premium leaderboard badge",
      "Exclusive event invites",
    ],
  },
  {
    id: "pay_later",
    label: "Pay Later",
    amountInr: 0,
    description: "Limited access, pay anytime.",
    perks: ["Explore the platform", "Scores & draws locked", "Upgrade anytime"],
  },
];

const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function Subscribe() {
  const navigate = useNavigate();
  const { user, refreshUserData } = useAuth();
  const { isDark } = useTheme();

  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const selectedPlanDetails = useMemo(
    () =>
      PLAN_OPTIONS.find((option) => option.id === selectedPlan) ||
      PLAN_OPTIONS[0],
    [selectedPlan],
  );

  const handleCheckout = async () => {
    if (selectedPlan === "pay_later") {
      navigate("/dashboard", { replace: true });
      return;
    }

    setError("");
    setIsProcessing(true);

    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout. Please try again.");
      }

      const orderResponse = await api.post("/payments/razorpay/order", {
        plan: selectedPlan,
      });

      const orderData = orderResponse.data;

      const razorpayInstance = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SwingSave",
        description: `${selectedPlanDetails.label} Subscription`,
        order_id: orderData.order_id,
        prefill: {
          name: orderData.prefill?.name || user?.full_name || "",
          email: orderData.prefill?.email || user?.email || "",
        },
        notes: {
          plan: selectedPlan,
        },
        theme: {
          color: "#ec4899",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        handler: async (paymentResponse) => {
          try {
            await api.post("/payments/razorpay/verify", {
              ...paymentResponse,
              plan: selectedPlan,
            });

            await refreshUserData();
            navigate("/dashboard", { replace: true });
          } catch (verificationError) {
            const verificationMessage =
              verificationError?.response?.data?.error ||
              "Payment captured but verification failed. Please contact support.";
            setError(verificationMessage);
          } finally {
            setIsProcessing(false);
          }
        },
      });

      razorpayInstance.on("payment.failed", (paymentError) => {
        const failureMessage =
          paymentError?.error?.description || "Payment was not completed.";
        setError(failureMessage);
        setIsProcessing(false);
      });

      razorpayInstance.open();
    } catch (checkoutError) {
      const message =
        checkoutError?.response?.data?.error ||
        checkoutError.message ||
        "Unable to start checkout.";
      setError(message);
      setIsProcessing(false);
    }
  };

  const handlePayLater = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-dark-bg text-white" : "bg-light-bg text-light-text"}`}
    >
      <Navbar />
      <main className="px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-5xl">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Choose your <span className="gradient-text">plan</span>
            </h1>
            <p
              className={`mx-auto mt-4 max-w-2xl text-lg ${
                isDark ? "text-gray-400" : "text-slate-600"
              }`}
            >
              Select Monthly, Yearly, or explore with limited free access. You
              can upgrade anytime.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PLAN_OPTIONS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative rounded-3xl border p-6 text-left transition-all ${
                    isSelected
                      ? "border-brand-500 bg-brand-500/10 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]"
                      : isDark
                        ? "border-dark-border bg-dark-card/50 hover:border-brand-500/40"
                        : "border-light-border bg-white hover:border-brand-500/40"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 right-4 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
                      {plan.badge}
                    </span>
                  )}
                  <p className="text-3xl font-bold leading-none">
                    {plan.label}
                  </p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-black">
                      {plan.id === "pay_later"
                        ? "Free"
                        : formatInr(plan.amountInr).replace("₹", "₹")}
                    </span>
                    {plan.id !== "pay_later" && (
                      <span className="pb-1 text-base text-gray-400">
                        /{plan.id === "yearly" ? "year" : "month"}
                      </span>
                    )}
                    {plan.id === "pay_later" && (
                      <span className="pb-1 text-base text-gray-400">
                        for now
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-3 text-lg ${
                      isDark ? "text-gray-300" : "text-slate-600"
                    }`}
                  >
                    {plan.description}
                  </p>
                  <ul className="mt-5 space-y-1.5 text-base">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <span className="text-brand-500">✓</span>
                        <span
                          className={
                            isDark ? "text-gray-200" : "text-slate-700"
                          }
                        >
                          {perk}
                        </span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="mx-auto mt-8 max-w-4xl space-y-3">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isProcessing}
              className="btn-primary w-full py-5 text-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing
                ? "Processing..."
                : selectedPlan === "pay_later"
                  ? "Continue with Limited Access"
                  : `Pay ${formatInr(selectedPlanDetails.amountInr)} with Razorpay ->`}
            </button>
            {selectedPlan !== "pay_later" && (
              <button
                type="button"
                onClick={handlePayLater}
                disabled={isProcessing}
                className={`w-full rounded-xl border py-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDark
                    ? "border-dark-border text-gray-200 hover:bg-dark-surface"
                    : "border-light-border text-light-text hover:bg-gray-100"
                }`}
              >
                Pay Later (Limited Access)
              </button>
            )}
            <p className="text-center text-sm text-gray-500">
              Secure payment via Razorpay. Activate now to unlock scores, draws,
              and full dashboard access.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
