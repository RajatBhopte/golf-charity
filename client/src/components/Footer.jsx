import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Footer() {
  const { isDark } = useTheme();

  const footerLinks = {
    Platform: [
      { name: 'How it Works', href: '/#how-it-works' },
      { name: 'Impact Report', href: '#' },
      { name: 'Member Jackpots', href: '/#prizes' },
      { name: 'Membership Terms', href: '#' },
    ],
    Company: [
      { name: 'Partner with Us', href: '#' },
      { name: 'Our Story', href: '#' },
      { name: 'Privacy Policy', href: '#' },
      { name: 'Media Kit', href: '#' },
    ],
    Support: [
      { name: 'Contact Support', href: '#' },
      { name: 'Help Center', href: '#' },
      { name: 'Responsible Gaming', href: '#' },
      { name: 'Technical Status', href: '#' },
    ],
  };

  return (
    <footer className={`border-t pt-20 pb-10 transition-colors duration-300 ${
      isDark
        ? 'bg-dark-bg border-dark-border'
        : 'bg-white border-black/5'
    }`}>
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-on-surface'}`}>
              SwingSave
            </Link>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-on-surface-variant'}`}>
              Elevating the game of golf into a platform for global good. Precision metrics meets purposeful philanthropy.
            </p>
            <div className="flex gap-4">
              {['public', 'thumb_up', 'photo_camera'].map(icon => (
                <a 
                  key={icon}
                  href="#" 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isDark 
                      ? 'bg-dark-card text-gray-400 hover:bg-brand-500 hover:text-white' 
                      : 'bg-surface-container text-on-surface hover:bg-brand-500 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className={`font-bold uppercase tracking-widest text-xs mb-6 ${isDark ? 'text-gray-300' : 'text-on-surface'}`}>
                {title}
              </h4>
              <ul className="space-y-4">
                {links.map(link => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className={`text-sm transition-colors ${
                        isDark ? 'text-gray-500 hover:text-brand-500' : 'text-on-surface-variant hover:text-brand-500'
                      }`}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-6 ${
          isDark ? 'border-dark-border' : 'border-black/5'
        }`}>
          <p className={`text-xs uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-on-surface-variant'}`}>
            © 2024 SwingSave. Professional Golf Philanthropy.
          </p>
          <div className="flex gap-8">
            <span className={`text-[10px] font-bold tracking-tight ${isDark ? 'text-gray-600' : 'text-on-surface-variant'}`}>GST IN: 27AABC1234F1Z1</span>
            <span className={`text-[10px] font-bold tracking-tight ${isDark ? 'text-gray-600' : 'text-on-surface-variant'}`}>BUREAU VERITAS CERTIFIED</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
