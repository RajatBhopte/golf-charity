import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { buildApiUrl } from "../utils/apiBase";
import {
  LayoutDashboard,
  Heart,
  Bell,
  Ticket,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  PlusCircle,
  History,
} from "lucide-react";

export default function UserSidebar({
  activeTab,
  setActiveTab,
  unreadNotifications = 0,
}) {
  const { isDark, toggleTheme } = useTheme();
  const { logout, user, session, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] =
    useState(false);
  const [subscriptionMsg, setSubscriptionMsg] = useState("");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleCancelSubscription = async () => {
    if (!session?.access_token || isCancellingSubscription) {
      return;
    }

    if (!window.confirm("Cancel your subscription now?")) {
      return;
    }

    setIsCancellingSubscription(true);
    setSubscriptionMsg("");

    try {
      const response = await fetch(buildApiUrl("/payments/cancel"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to cancel subscription");
      }

      setSubscriptionMsg("Subscription cancelled. Premium features revoked.");
      await refreshUserData();
    } catch (error) {
      setSubscriptionMsg(error.message || "Cancel failed");
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  const navItems = [
    { id: "overview", name: "Overview", icon: LayoutDashboard },
    { id: "scores", name: "My Scores", icon: Ticket },
    { id: "impact", name: "My Impact", icon: Heart },
    {
      id: "notifications",
      name: "Notifications",
      icon: Bell,
      badge: unreadNotifications,
    },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div
        className={`lg:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 border-b backdrop-blur-md transition-colors duration-300 ${
          isDark
            ? "bg-dark-bg/80 border-dark-border text-white"
            : "bg-white/80 border-light-border text-light-text"
        }`}
      >
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="font-bold tracking-tight">
            Golf<span className="gradient-text">Charity</span>
          </span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-2 rounded-lg ${isDark ? "hover:bg-dark-card" : "hover:bg-light-hover"}`}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } border-r flex flex-col ${
          isDark
            ? "bg-dark-bg border-dark-border text-white"
            : "bg-white border-light-border text-light-text shadow-xl lg:shadow-none"
        }`}
      >
        {/* Logo Section */}
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight tracking-tight font-sans">
                Golf<span className="gradient-text">Charity</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                Player Terminal
              </p>
            </div>
          </Link>
        </div>

        {/* User Info Quick View */}
        <div className="px-6 mb-6">
          {(() => {
            const isYearly = user?.subscription_plan === "yearly";
            const planBorder = isYearly
              ? isDark
                ? "border-amber-400/50"
                : "border-amber-500/70"
              : "border-brand-500/40";
            const planBg = isYearly
              ? isDark
                ? "bg-amber-500/10"
                : "bg-amber-50"
              : isDark
                ? "bg-brand-500/10"
                : "bg-brand-50";
            const avatarBg = isYearly
              ? isDark
                ? "bg-amber-400/20 text-amber-400"
                : "bg-amber-100 text-amber-700"
              : "bg-brand-500/20 text-brand-500";
            const supporterColor = isYearly
              ? isDark
                ? "text-amber-400"
                : "text-amber-700"
              : "text-brand-400";
            const supporterLabel = isYearly
              ? "Yearly Supporter"
              : "Monthly Supporter";
            const planBadgeBg = isYearly
              ? isDark
                ? "bg-amber-400/15 text-amber-400"
                : "bg-amber-100 text-amber-700"
              : "bg-brand-500/15 text-brand-400";

            return (
              <div className={`p-4 rounded-2xl border ${planBg} ${planBorder}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${avatarBg}`}
                  >
                    {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">
                      {user?.full_name || "Golfer"}
                    </p>
                    <p
                      className={`text-[10px] truncate uppercase tracking-tighter font-semibold ${supporterColor}`}
                    >
                      {supporterLabel}
                    </p>
                  </div>
                  <div
                    className={`ml-auto shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${planBadgeBg}`}
                  >
                    {isYearly ? "Yearly" : "Monthly"}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-gray-500">Subscription</span>
                  <span
                    className={
                      user?.subscription_status === "active"
                        ? "text-green-500"
                        : "text-yellow-500"
                    }
                  >
                    {user?.subscription_status || "Inactive"}
                  </span>
                </div>

                {user?.subscription_status === "active" && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isCancellingSubscription}
                    className={`mt-3 w-full rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      isDark
                        ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 disabled:opacity-50"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-60"
                    }`}
                  >
                    {isCancellingSubscription
                      ? "Cancelling..."
                      : "Cancel Subscription"}
                  </button>
                )}

                {subscriptionMsg && (
                  <p
                    className={`mt-2 text-[10px] font-semibold ${subscriptionMsg.toLowerCase().includes("failed") || subscriptionMsg.toLowerCase().includes("cancel failed") ? "text-red-500" : "text-green-500"}`}
                  >
                    {subscriptionMsg}
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Navigation Section */}
        <nav className="flex-grow px-4 pb-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 group ${
                  isActive
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]"
                    : isDark
                      ? "text-gray-400 hover:text-white hover:bg-dark-hover"
                      : "text-light-subtext hover:text-light-text hover:bg-light-hover"
                }`}
              >
                <div
                  className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"} relative`}
                >
                  <Icon size={20} />
                  {item.badge > 0 && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-dark-bg transition-opacity" />
                  )}
                </div>
                <span>{item.name}</span>
                {item.badge > 0 && isActive && (
                  <span className="ml-auto bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px]">
                    {item.badge}
                  </span>
                )}
                {isActive && !item.badge && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions Section */}
        <div
          className={`p-4 mt-auto border-t space-y-2 ${isDark ? "border-dark-border" : "border-light-border"}`}
        >
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              isDark
                ? "text-gray-400 hover:text-yellow-400 hover:bg-dark-hover"
                : "text-light-subtext hover:text-amber-500 hover:bg-light-hover"
            }`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 transition-all ${
              isDark
                ? "hover:bg-red-500/10"
                : "hover:bg-red-50 border border-transparent hover:border-red-100"
            }`}
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
