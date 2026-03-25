/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../utils/api";
import { buildApiUrl } from "../utils/apiBase";
import {
  User,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Heart,
} from "lucide-react";
import Navbar from "../components/Navbar";

export default function Signup() {
  const { loginWithGoogle, login, session, user, loading, refreshUserData } =
    useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [charities, setCharities] = useState([]);
  const [charitiesLoading, setCharitiesLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    charityId: "",
    charityPercentage: 10,
  });

  const {
    register,
    formState: { errors },
    trigger,
  } = useForm();

  const isGoogleOnboarding =
    new URLSearchParams(location.search).get("oauth") === "google";
  const shouldResumeOAuthOnboarding =
    Boolean(session?.user) && !user?.charity_id;

  const baseInputStyles = `block w-full pl-10 pr-3 py-3 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none ${
    isDark
      ? "bg-dark-surface border-dark-border text-white focus:border-brand-500"
      : "bg-white border-light-border text-light-text focus:border-brand-500"
  }`;

  useEffect(() => {
    const fetchCharities = async () => {
      try {
        const response = await fetch(buildApiUrl("/charities"));
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load charities");
        }

        const charityList = Array.isArray(data?.charities)
          ? data.charities
          : [];
        setCharities(charityList);
        setFormData((current) => ({
          ...current,
          charityId: current.charityId || charityList[0]?.id || "",
        }));
      } catch (err) {
        setError(err.message || "Unable to load charities right now.");
      } finally {
        setCharitiesLoading(false);
      }
    };

    fetchCharities();
  }, []);

  useEffect(() => {
    if (loading) return;

    // Existing subscribed users should never be sent through signup/payment again.
    if (session?.user && user?.subscription_status === "active") {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Existing non-active users who already completed profile setup
    // should go straight to the single subscription page.
    if (session?.user && user?.charity_id && !isGoogleOnboarding) {
      navigate("/subscribe", { replace: true });
      return;
    }

    if (
      !session?.user ||
      (!isGoogleOnboarding && !shouldResumeOAuthOnboarding)
    ) {
      return;
    }

    setFormData((current) => ({
      ...current,
      fullName:
        current.fullName ||
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        "",
      email: current.email || session.user.email || "",
    }));

    // Google onboarding should always land on charity selection first.
    setStep(2);
    setError(null);
  }, [
    loading,
    navigate,
    isGoogleOnboarding,
    shouldResumeOAuthOnboarding,
    session?.user,
    user?.charity_id,
    user?.subscription_status,
  ]);

  const handleNextStep = async () => {
    const isValid = await trigger();
    if (isValid) {
      setStep((prev) => prev + 1);
      setError(null);
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => prev - 1);
    setError(null);
  };

  const handleGoogleSignup = async () => {
    try {
      const { error: authError } = await loginWithGoogle(
        "/signup?oauth=google",
      );
      if (authError) throw authError;
    } catch (err) {
      setError(err.message || "Failed to sign up with Google");
    }
  };

  const handleFinalSubmit = async () => {
    if (!formData.charityId) {
      setError("Please choose a charity before creating your account.");
      return;
    }

    const normalizedPlan = "monthly";

    setIsLoading(true);
    setError(null);

    try {
      if (
        (isGoogleOnboarding || shouldResumeOAuthOnboarding) &&
        session?.user?.id
      ) {
        await api.post("/auth/sync", {
          id: session.user.id,
          full_name:
            formData.fullName ||
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split("@")[0] ||
            "Player",
          plan: normalizedPlan,
          charity_id: formData.charityId,
          charity_percentage: Number(formData.charityPercentage),
        });
        await refreshUserData?.();
      } else {
        await api.post("/auth/register", {
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          plan: normalizedPlan,
          charity_id: formData.charityId,
          charity_percentage: Number(formData.charityPercentage),
        });

        const { error: loginError } = await login(
          formData.email,
          formData.password,
        );
        if (loginError) throw loginError;
      }

      navigate("/subscribe", { replace: true });
    } catch (err) {
      setError(err.message || "An error occurred during signup");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col overflow-x-hidden ${isDark ? "bg-dark-bg" : "bg-light-bg"}`}
    >
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 pt-24">
        {step < 3 && (
          <div className="w-full max-w-lg mb-8">
            <div className="flex justify-between items-center mb-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full mx-1 transition-colors duration-300 ${
                    i <= step
                      ? "bg-brand-500"
                      : isDark
                        ? "bg-dark-surface border border-dark-border"
                        : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <div
              className={`text-center text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Step {step} of 2
            </div>
          </div>
        )}

        <div className="w-full max-w-lg p-8 sm:p-10 rounded-3xl glass-card relative overflow-hidden">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500"
              >
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <h1
                    className={`text-3xl font-bold mb-2 tracking-tight ${isDark ? "text-white" : "text-light-text"}`}
                  >
                    Create your <span className="gradient-text">Account</span>
                  </h1>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-light-subtext"}`}
                  >
                    Start turning your golf scores into charity donations and
                    prizes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  className={`w-full flex items-center justify-center gap-3 px-4 py-3.5 mb-6 rounded-xl border font-medium transition-all hover:-translate-y-0.5 ${
                    isDark
                      ? "bg-dark-surface border-dark-border text-white hover:bg-dark-hover shadow-lg shadow-black/20"
                      : "bg-white border-light-border text-light-text hover:bg-light-hover shadow-sm"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div
                      className={`w-full border-t ${isDark ? "border-dark-border" : "border-gray-200"}`}
                    />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span
                      className={`px-4 ${isDark ? "bg-dark-card text-gray-500" : "bg-white text-gray-500"}`}
                    >
                      Or continue with email
                    </span>
                  </div>
                </div>

                <form
                  className="space-y-5"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-light-text"}`}
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User
                          size={18}
                          className={isDark ? "text-gray-500" : "text-gray-400"}
                        />
                      </div>
                      <input
                        type="text"
                        {...register("fullName", {
                          required: "Name is required",
                        })}
                        value={formData.fullName}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            fullName: event.target.value,
                          }))
                        }
                        className={baseInputStyles}
                        placeholder="John Doe"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-light-text"}`}
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail
                          size={18}
                          className={isDark ? "text-gray-500" : "text-gray-400"}
                        />
                      </div>
                      <input
                        type="email"
                        {...register("email", {
                          required: "Email is required",
                          pattern: {
                            value: /^\S+@\S+\.\S+$/,
                            message: "Invalid email",
                          },
                        })}
                        value={formData.email}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        className={baseInputStyles}
                        placeholder="you@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-light-text"}`}
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock
                          size={18}
                          className={isDark ? "text-gray-500" : "text-gray-400"}
                        />
                      </div>
                      <input
                        type="password"
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters",
                          },
                        })}
                        value={formData.password}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        className={baseInputStyles}
                        placeholder="Password"
                      />
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full btn-primary flex justify-center py-3.5 mt-4 items-center gap-2"
                  >
                    Continue to Charity <ArrowRight size={18} />
                  </button>
                </form>

                <p
                  className={`mt-6 text-center text-sm ${isDark ? "text-gray-400" : "text-light-subtext"}`}
                >
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-brand-500 hover:text-brand-400 transition-colors"
                  >
                    Log in
                  </Link>
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <h1
                    className={`text-2xl font-bold mb-2 tracking-tight ${isDark ? "text-white" : "text-light-text"}`}
                  >
                    Choose Your <span className="gradient-text">Impact</span>
                  </h1>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-light-subtext"}`}
                  >
                    Select the charity you want to support.
                  </p>
                </div>

                <div
                  className={`mb-6 rounded-3xl border p-4 sm:p-5 ${isDark ? "border-brand-500/30 bg-[#0d1937]" : "border-brand-200 bg-brand-50/40"}`}
                >
                  <div className="space-y-4">
                    {charitiesLoading && (
                      <div
                        className={`rounded-xl border px-4 py-5 text-sm ${isDark ? "border-dark-border bg-dark-surface text-gray-400" : "border-light-border bg-gray-50 text-gray-500"}`}
                      >
                        Loading charities...
                      </div>
                    )}

                    {!charitiesLoading &&
                      charities.map((charity) => (
                        <div
                          key={charity.id}
                          onClick={() =>
                            setFormData((current) => ({
                              ...current,
                              charityId: charity.id,
                            }))
                          }
                          className={`relative flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] ${
                            formData.charityId === charity.id
                              ? `border-green-500 ${isDark ? "bg-green-500/10 shadow-[0_0_25px_rgba(34,197,94,0.22)]" : "bg-green-50/70 shadow-[0_0_20px_rgba(34,197,94,0.18)]"}`
                              : isDark
                                ? "border-dark-border bg-dark-surface hover:border-green-500/40 hover:shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                                : "border-gray-200 bg-white hover:border-green-400/60 hover:shadow-[0_12px_24px_rgba(16,185,129,0.1)]"
                          }`}
                        >
                          {formData.charityId === charity.id && (
                            <div className="absolute right-4 top-4">
                              <CheckCircle
                                size={18}
                                className="text-green-500"
                              />
                            </div>
                          )}

                          <div
                            className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center border shrink-0 ${isDark ? "border-dark-border bg-dark-bg" : "border-light-border bg-gray-50"}`}
                          >
                            {charity.logo_url ? (
                              <img
                                src={charity.logo_url}
                                alt={charity.name}
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <Heart size={18} className="text-brand-500" />
                            )}
                          </div>

                          <h4
                            className={`font-extrabold text-2xl leading-tight tracking-tight ${isDark ? "text-white" : "text-light-text"}`}
                          >
                            {charity.name}
                          </h4>
                        </div>
                      ))}

                    {!charitiesLoading && charities.length === 0 && (
                      <div
                        className={`rounded-xl border px-4 py-5 text-sm ${isDark ? "border-dark-border bg-dark-surface text-gray-400" : "border-light-border bg-gray-50 text-gray-500"}`}
                      >
                        No charities are available yet. Ask an admin to add one
                        before signing up.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <label
                      className={`block text-sm font-semibold flex items-center gap-1.5 ${isDark ? "text-white" : "text-light-text"}`}
                    >
                      <Heart size={16} className="text-brand-500" />{" "}
                      Contribution Percentage
                    </label>
                    <span className="font-bold text-brand-500">
                      {formData.charityPercentage}%
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-light-subtext"}`}
                  >
                    Minimum 10% of your subscription goes to charity. You can
                    increase this if you wish.
                  </p>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={formData.charityPercentage}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        charityPercentage: event.target.value,
                      }))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500 dark:bg-dark-border"
                  />
                  <div
                    className={`flex justify-between text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                  >
                    <span>10%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isLoading}
                    className={`flex-1 flex justify-center items-center py-3.5 rounded-xl font-medium transition-colors border ${
                      isDark
                        ? "border-dark-border text-white hover:bg-dark-surface"
                        : "border-light-border text-light-text hover:bg-gray-100"
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={
                      isLoading || charitiesLoading || !charities.length
                    }
                    className={`flex-[2] btn-primary flex justify-center py-3.5 items-center gap-2 ${
                      isLoading || charitiesLoading || !charities.length
                        ? "opacity-80 cursor-wait"
                        : ""
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Continue to Subscription"
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
