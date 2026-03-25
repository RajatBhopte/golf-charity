import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const PLAN_OPTIONS = [
  { id: 'monthly', label: 'Monthly', amountInr: 1500, description: 'Flexible plan billed every month.' },
  { id: 'yearly', label: 'Yearly', amountInr: 15000, description: 'Save with annual billing.' },
];

const formatInr = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value);

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export default function Subscribe() {
  const navigate = useNavigate();
  const { user, refreshUserData } = useAuth();
  const { isDark } = useTheme();

  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const selectedPlanDetails = useMemo(
    () => PLAN_OPTIONS.find((option) => option.id === selectedPlan) || PLAN_OPTIONS[0],
    [selectedPlan]
  );

  const handleCheckout = async () => {
    setError('');
    setIsProcessing(true);

    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay checkout. Please try again.');
      }

      const orderResponse = await api.post('/payments/razorpay/order', {
        plan: selectedPlan,
      });

      const orderData = orderResponse.data;

      const razorpayInstance = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Golf Charity Platform',
        description: `${selectedPlanDetails.label} Subscription`,
        order_id: orderData.order_id,
        prefill: {
          name: orderData.prefill?.name || user?.full_name || '',
          email: orderData.prefill?.email || user?.email || '',
        },
        notes: {
          plan: selectedPlan,
        },
        theme: {
          color: '#ec4899',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        handler: async (paymentResponse) => {
          try {
            await api.post('/payments/razorpay/verify', {
              ...paymentResponse,
              plan: selectedPlan,
            });

            await refreshUserData();
            navigate('/dashboard', { replace: true });
          } catch (verificationError) {
            const verificationMessage =
              verificationError?.response?.data?.error || 'Payment captured but verification failed. Please contact support.';
            setError(verificationMessage);
          } finally {
            setIsProcessing(false);
          }
        },
      });

      razorpayInstance.on('payment.failed', (paymentError) => {
        const failureMessage = paymentError?.error?.description || 'Payment was not completed.';
        setError(failureMessage);
        setIsProcessing(false);
      });

      razorpayInstance.open();
    } catch (checkoutError) {
      const message = checkoutError?.response?.data?.error || checkoutError.message || 'Unable to start checkout.';
      setError(message);
      setIsProcessing(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-light-text'}`}>
      <Navbar />
      <main className="p-6 pt-24 max-w-xl mx-auto">
        <div className="glass-card rounded-3xl p-8 sm:p-10">
          <h1 className="text-3xl font-bold mb-3">
            Activate your <span className="gradient-text">subscription</span>
          </h1>
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
            Choose a plan and complete payment through Razorpay to unlock your dashboard.
          </p>

          <div className="space-y-3 mb-8">
            {PLAN_OPTIONS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full text-left rounded-2xl border px-5 py-4 transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10'
                      : isDark
                        ? 'border-dark-border hover:border-brand-500/40'
                        : 'border-light-border hover:border-brand-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-lg">{plan.label}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>{plan.description}</p>
                    </div>
                    <p className="font-bold text-xl">{formatInr(plan.amountInr)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isProcessing}
            className="btn-primary w-full py-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isProcessing
              ? 'Processing...'
              : `Pay ${formatInr(selectedPlanDetails.amountInr)} with Razorpay`}
          </button>
        </div>
      </main>
    </div>
  );
}
