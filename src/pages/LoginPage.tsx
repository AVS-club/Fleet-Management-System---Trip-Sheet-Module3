import React, { useState, useEffect } from 'react';
import LoginForm from '../components/auth/LoginForm';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/themeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Eye, EyeOff, Truck, Lock } from 'lucide-react';
import { createLogger } from '../utils/logger';

const logger = createLogger('LoginPage');

const LoginPage: React.FC = () => {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  
  const welcomeMessages = [
    { text: "Welcome back!", color: "from-emerald-600 to-teal-600", font: "'Great Vibes', 'Satisfy', 'Dancing Script', cursive", scale: 1.2544 },
    { text: "वापसी पर स्वागत है!", color: "from-orange-500 to-pink-600", font: "'Pacifico', cursive", scale: 1 },
    { text: "மீண்டும் வரவேற்கிறோம்!", color: "from-purple-600 to-blue-600", font: "'Pacifico', cursive", scale: 0.85 },
    { text: "फेर से स्वागत बा!", color: "from-rose-600 to-orange-600", font: "'Pacifico', cursive", scale: 1 },
    { text: "পুনরায় স্বাগতম!", color: "from-blue-600 to-indigo-600", font: "'Pacifico', cursive", scale: 1 },
    { text: "తిరిగి స్వాగతం!", color: "from-violet-600 to-purple-600", font: "'Pacifico', cursive", scale: 1 },
    { text: "पुन्हा स्वागत आहे!", color: "from-amber-600 to-orange-600", font: "'Pacifico', cursive", scale: 1 },
    { text: "ફરી સ્વાગત છે!", color: "from-teal-600 to-cyan-600", font: "'Pacifico', cursive", scale: 1 },
    { text: "خوش آمدید دوبارہ!", color: "from-cyan-600 to-emerald-600", font: "'Pacifico', cursive", scale: 1 }
  ];
  
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentMessage((prev) => (prev + 1) % welcomeMessages.length);
        setIsAnimating(false);
      }, 400);
    }, 3500);
    
    return () => clearInterval(interval);
  }, [welcomeMessages.length]);

  return (
    <>
      {/* Aurora Background - Simple and Direct */}
      <div className="aurora-background" />
      
      {/* Main Content with Higher Z-Index */}
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Satisfy&family=Dancing+Script:wght@600;700&family=Pacifico&display=swap');
          
          .welcome-text {
            background: linear-gradient(135deg, var(--tw-gradient-stops));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.2;
            display: inline-block;
            white-space: nowrap;
          }
          
          .fade-slide-up {
            animation: fadeSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          }
          
          .fade-slide-down {
            animation: fadeSlideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          }
          
          @keyframes fadeSlideUp {
            0% {
              opacity: 0;
              transform: translateY(15px) scale(0.96) rotate(-1deg);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1) rotate(0deg);
            }
          }
          
          @keyframes fadeSlideDown {
            0% {
              opacity: 1;
              transform: translateY(0) scale(1) rotate(0deg);
            }
            100% {
              opacity: 0;
              transform: translateY(-15px) scale(0.96) rotate(1deg);
            }
          }
          
          .sparkle {
            animation: sparkle 0.6s ease-out;
          }
          
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1); }
          }
        .brand-logo-frame {
          width: 5.4rem;
          height: 5.4rem;
          padding: 0.55rem;
          border-radius: 1.5rem;
          position: relative;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(236, 253, 245, 0.94));
          box-shadow: 0 18px 38px -18px rgba(16, 185, 129, 0.52), 0 0 0 3px rgba(134, 239, 172, 0.45);
          border: 1px solid rgba(209, 250, 229, 0.82);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }

        .brand-logo-frame::before {
          content: '';
          position: absolute;
          inset: -12%;
          border-radius: inherit;
          background: radial-gradient(circle, rgba(167, 243, 208, 0.45) 0%, rgba(16, 185, 129, 0.22) 55%, transparent 78%);
          z-index: 0;
          filter: blur(12px);
          opacity: 0.85;
          transition: opacity 0.4s ease, transform 0.4s ease;
        }

        .brand-logo-frame:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 22px 46px -18px rgba(16, 185, 129, 0.65), 0 0 0 4px rgba(74, 222, 128, 0.35);
        }

        .brand-logo-frame:hover::before {
          opacity: 1;
          transform: scale(1.04);
        }

        .brand-logo-surface {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          border-radius: 1.35rem;
          background: linear-gradient(135deg, #ffffff 15%, #f0fdf4 100%);
          padding: 0.05rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 4px 14px rgba(16, 185, 129, 0.08), inset 0 -2px 6px rgba(45, 212, 191, 0.08);
          transition: box-shadow 0.4s ease;
        }

        .brand-logo-frame:hover .brand-logo-surface {
          box-shadow: inset 0 6px 18px rgba(16, 185, 129, 0.12), inset 0 -3px 8px rgba(45, 212, 191, 0.12);
        }

        .brand-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .brand-logo-frame:hover .brand-logo {
          transform: scale(1.01);
        }

        @media (max-width: 640px) {
          .brand-logo-frame {
            width: 4.8rem;
            height: 4.8rem;
            padding: 0.48rem;
          }

          .brand-logo-surface {
            border-radius: 1.1rem;
            padding: 0.22rem;
          }

          .brand-logo {
            width: 88%;
            height: 88%;
          }

          .welcome-text {
            font-size: clamp(1.4rem, 7vw, 1.75rem);
          }
        }

        @media (max-width: 420px) {
          .brand-logo-frame {
            width: 4.2rem;
            height: 4.2rem;
            padding: 0.38rem;
          }

          .brand-logo-surface {
            border-radius: 0.95rem;
            padding: 0.05rem;
          }

          .brand-logo {
            width: 90%;
            height: 90%;
          }
        }



        `}</style>
        
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-md relative z-10">
          {/* Logo and Brand */}
          <div className="text-center mb-6 sm:mb-8">
            {/* Brand Logo */}
            <div className="brand-logo-frame mx-auto mb-5">
              <div className="brand-logo-surface">
                <img
                  src="/assets/avs-logo.png"
                  alt="Auto Vital Solution logo"
                  className="brand-logo"
                />
              </div>
            </div>

            {/* Static Brand Name */}
            <h1 className="font-bold tracking-tight mb-1.5 text-[1.85rem] sm:text-[2.06rem]">
              <span className="text-gray-900 dark:text-gray-100">Auto Vital</span>
              <span className="text-emerald-600 dark:text-emerald-400"> Solution</span>
            </h1>

            {/* Divider Line */}
            <div className="flex items-center justify-center mb-2">
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-600 dark:via-emerald-400 to-transparent"></div>
            </div>

            {/* Static Tagline - No Language Changes */}
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Smarter Fleet. Less Stress.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-gray-300/60 dark:shadow-gray-900/60 p-6 sm:p-8 border border-gray-100 dark:border-gray-700 transform hover:shadow-3xl hover:shadow-gray-400/50 dark:hover:shadow-gray-900/50 transition-all duration-300">
            {/* Animated Welcome Message - Fixed Height */}
            <div className="mb-6">
              <div className="min-h-[3.65rem] sm:min-h-[4rem] flex items-start justify-center overflow-visible px-3 pt-1">
                <h2 
                  key={`welcome-${currentMessage}`}
                  className={`welcome-text text-3xl ${welcomeMessages[currentMessage].color} ${!isAnimating ? 'fade-slide-up' : 'fade-slide-down'} text-center`}
                  style={{ 
                    fontFamily: welcomeMessages[currentMessage].font,
                    fontWeight: 600,
                    fontSize: `${1.875 * welcomeMessages[currentMessage].scale}rem`
                  }}
                >
                  {welcomeMessages[currentMessage].text}
                </h2>
                {!isAnimating && (
                  <span className="ml-2 inline-block flex-shrink-0">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 sparkle" />
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-center gap-1">
                <span className="h-[2px] w-4 rounded-full bg-gradient-to-r from-transparent via-emerald-300/50 to-emerald-500/70" />
                <div
                  className={`h-0.5 w-20 sm:w-24 bg-gradient-to-r opacity-80 transition-all duration-500 ${welcomeMessages[currentMessage].color}`}
                />
                <span className="h-[2px] w-4 rounded-full bg-gradient-to-r from-emerald-500/70 via-emerald-300/50 to-transparent" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Sign in to manage your fleet like a pro
              </p>
            </div>

            <LoginForm showPassword={showPassword} setShowPassword={setShowPassword} />

            {/* Links */}
            <div className="mt-6 text-center text-sm space-y-2">
              <Link
                to="/reset-password"
                className="block text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                Forgot password?
              </Link>
              <p className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors">
                Don't have an account?{' '}
                <Link to="/register" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors">
                  Register your organization
                </Link>
              </p>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  By signing in, you agree to our{' '}
                  <Link to="/terms-and-conditions" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline">
                    Terms and Conditions
                  </Link>
                  {' '}and{' '}
                  <Link to="/terms-and-conditions" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Your credentials are encrypted and secure
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
            &copy; {new Date().getFullYear()} Auto Vital Solution. All rights reserved. &bull; Built with &#10084;&#65039;
          </p>
          
          {/* Decorative Clickable Truck Icon */}
          <button
            onClick={() => logger.debug('Truck icon clicked - add your custom action here')}
            className="fixed bottom-8 right-8 group cursor-pointer"
            aria-label="Fleet icon"
          >
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4 rounded-2xl shadow-lg shadow-emerald-500/30 dark:shadow-emerald-600/30 hover:shadow-emerald-500/50 dark:hover:shadow-emerald-600/50 hover:scale-110 transition-all duration-300 border border-emerald-400/20 dark:border-emerald-500/20">
              <Truck className="w-7 h-7 text-white" strokeWidth={2.5} fill="white" />
            </div>
            <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Fleet Manager</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default LoginPage;

