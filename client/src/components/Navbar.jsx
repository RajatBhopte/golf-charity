import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ variant = "public" }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { session, logout } = useAuth();

  // Links for the public landing page
  const publicLinks = [
    { name: "How It Works", href: "/#how-it-works" },
    { name: "Prizes", href: "/#prizes" },
    { name: "Charities", href: "/charities" },
  ];

  // Links for the authenticated dashboard
  const { user } = useAuth();

  const dashboardLinks = [
    { name: "Overview", href: "/dashboard" },
    { name: "My Impact", href: "#" },
    { name: "Settings", href: "#" },
  ];

  if (user?.role === "admin") {
    dashboardLinks.push({ name: "Admin Panel", href: "/admin" });
  }

  const navLinks = variant === "dashboard" ? dashboardLinks : publicLinks;
  const showDashboardActions = variant === "dashboard" && session;
  const showPublicActions = variant === "public";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b transition-colors duration-300 ${
        isDark
          ? "bg-dark-bg/80 border-dark-border"
          : "bg-light-bg/80 border-light-border"
      }`}
    >
      <div className="container-max px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span
              className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-light-text"}`}
            >
              Swing<span className="gradient-text">Save</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              variant === "dashboard" ? (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isDark
                      ? "text-gray-400 hover:text-white"
                      : "text-light-subtext hover:text-light-text"
                  }`}
                >
                  {link.name}
                </Link>
              ) : (
                <a
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isDark
                      ? "text-gray-400 hover:text-white"
                      : "text-light-subtext hover:text-light-text"
                  }`}
                >
                  {link.name}
                </a>
              ),
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition-all duration-300 ${
                isDark
                  ? "bg-dark-card hover:bg-dark-hover text-gray-400 hover:text-yellow-400"
                  : "bg-light-hover hover:bg-gray-200 text-light-subtext hover:text-amber-500"
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {showDashboardActions ? (
              <>
                <Link
                  to="/dashboard"
                  className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                    isDark
                      ? "text-gray-300 hover:text-white hover:bg-dark-card"
                      : "text-light-subtext hover:text-light-text hover:bg-light-hover"
                  }`}
                >
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await logout();
                    window.location.href = "/login"; // Optional based on standard practice for your app
                  }}
                  className="btn-primary !bg-red-500 hover:!bg-red-600 !border-red-500 !px-6 !py-2.5 text-sm"
                >
                  Log Out
                </button>
              </>
            ) : showPublicActions ? (
              <>
                <Link
                  to="/login"
                  className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                    isDark
                      ? "text-gray-300 hover:text-white hover:bg-dark-card"
                      : "text-light-subtext hover:text-light-text hover:bg-light-hover"
                  }`}
                >
                  Log In
                </Link>
                <Link
                  to="/get-started"
                  className="btn-primary !px-6 !py-2.5 text-sm"
                >
                  Get Started
                </Link>
              </>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-300 ${
                isDark
                  ? "bg-dark-card text-gray-400 hover:text-yellow-400"
                  : "bg-light-hover text-light-subtext hover:text-amber-500"
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isDark
                  ? "text-gray-400 hover:text-white"
                  : "text-light-subtext hover:text-light-text"
              }`}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            isOpen ? "max-h-80 pb-6" : "max-h-0"
          }`}
        >
          <div
            className={`flex flex-col gap-1 pt-2 border-t ${
              isDark ? "border-dark-border" : "border-light-border"
            }`}
          >
            {navLinks.map((link) =>
              variant === "dashboard" ? (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isDark
                      ? "text-gray-400 hover:text-white hover:bg-dark-card"
                      : "text-light-subtext hover:text-light-text hover:bg-light-hover"
                  }`}
                >
                  {link.name}
                </Link>
              ) : (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isDark
                      ? "text-gray-400 hover:text-white hover:bg-dark-card"
                      : "text-light-subtext hover:text-light-text hover:bg-light-hover"
                  }`}
                >
                  {link.name}
                </a>
              ),
            )}
            <div
              className={`mt-2 pt-3 border-t flex flex-col gap-2 ${isDark ? "border-dark-border" : "border-light-border"}`}
            >
              {showDashboardActions ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium text-center transition-colors ${
                      isDark
                        ? "text-gray-300 hover:bg-dark-card"
                        : "text-light-subtext hover:bg-light-hover"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      setIsOpen(false);
                      await logout();
                      window.location.href = "/login";
                    }}
                    className="btn-primary !bg-red-500 hover:!bg-red-600 !border-red-500 text-center !py-3 text-sm"
                  >
                    Log Out
                  </button>
                </>
              ) : showPublicActions ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium text-center transition-colors ${
                      isDark
                        ? "text-gray-300 hover:bg-dark-card"
                        : "text-light-subtext hover:bg-light-hover"
                    }`}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/get-started"
                    onClick={() => setIsOpen(false)}
                    className="btn-primary text-center !py-3 text-sm"
                  >
                    Start Playing & Giving
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
