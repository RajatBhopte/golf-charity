import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Heart } from 'lucide-react';

export default function Footer() {
  const { isDark } = useTheme();

  const footerLinks = {
    Platform: [
      { name: 'How It Works', href: '#how-it-works' },
      { name: 'Prize Tiers', href: '#prizes' },
      { name: 'Charities', href: '#charities' },
    ],
    Account: [
      { name: 'Sign Up', href: '/signup' },
      { name: 'Log In', href: '/login' },
      { name: 'Dashboard', href: '/dashboard' },
    ],
    Legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Cookie Policy', href: '#' },
    ],
  };

  return (
    <footer className={`border-t transition-colors duration-300 ${
      isDark ? 'bg-dark-bg border-dark-border' : 'bg-light-bg border-light-border'
    }`}>
      <div className="container-max px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <span className="text-white font-bold">G</span>
              </div>
              <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-light-text'}`}>
                Golf<span className="gradient-text">Charity</span>
              </span>
            </Link>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-500' : 'text-light-subtext'}`}>
              Play golf, win prizes, and make a difference. Every subscription supports a charity you believe in.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-light-text'}`}>
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.name}>
                    {link.href.startsWith('/') ? (
                      <Link
                        to={link.href}
                        className={`text-sm transition-colors ${
                          isDark ? 'text-gray-500 hover:text-brand-400' : 'text-light-subtext hover:text-brand-600'
                        }`}
                      >
                        {link.name}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className={`text-sm transition-colors ${
                          isDark ? 'text-gray-500 hover:text-brand-400' : 'text-light-subtext hover:text-brand-600'
                        }`}
                      >
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className={`mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDark ? 'border-dark-border' : 'border-light-border'
        }`}>
          <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-light-subtext'}`}>
            © 2026 GolfCharity. All rights reserved.
          </p>
          <p className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-600' : 'text-light-subtext'}`}>
            Made with <Heart size={14} className="text-brand-500 fill-brand-500" /> for golfers who give back
          </p>
        </div>
      </div>
    </footer>
  );
}
