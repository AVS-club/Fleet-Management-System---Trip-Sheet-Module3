import React, { useState, useEffect } from 'react';
import LoginForm from '../components/auth/LoginForm';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/themeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Eye, EyeOff, Truck, Lock } from 'lucide-react';

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
  }, []);

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
        `}</style>
        
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-md relative z-10">
          {/* Logo and Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl mb-5 shadow-xl shadow-emerald-600/40">
              <Truck className="w-11 h-11 text-white" strokeWidth={2.5} fill="white" />
            </div>
            
            {/* Static Brand Name - Only in English */}
            <h1 className="text-3xl font-bold tracking-tight mb-1.5">
              <span className="text-gray-900">Auto Vital</span>
              <span className="text-emerald-600"> Solution</span>
            </h1>
            
            {/* Divider Line */}
            <div className="flex items-center justify-center mb-2">
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-600 to-transparent"></div>
            </div>
            
            {/* Static Tagline - No Language Changes */}
            <p className="text-sm text-gray-600 font-medium">
              Smarter Fleet. Less Stress.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-gray-300/60 p-8 border border-gray-100 transform hover:shadow-3xl hover:shadow-gray-400/50 transition-all duration-300" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 10px 20px -8px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
            {/* Animated Welcome Message - Fixed Height */}
            <div className="mb-6">
              <div className="h-11 flex items-center justify-center overflow-visible px-2">
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
              <p className="text-sm text-gray-500 mt-2">
                Sign in to manage your fleet like a pro
              </p>
            </div>

            <LoginForm showPassword={showPassword} setShowPassword={setShowPassword} />

            {/* Links */}
            <div className="mt-6 text-center text-sm space-y-2">
              <Link
                to="/reset-password"
                className="block text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Forgot password?
              </Link>
              <p className="text-gray-500 hover:text-gray-700 font-medium transition-colors">
                Don't have an account?{' '}
                <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  Register your organization
                </Link>
              </p>
            </div>

            {/* Security Badge */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Your credentials are encrypted and secure
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} Auto Vital Solution. All rights reserved. • Built with ❤️
          </p>
          
          {/* Decorative Clickable Truck Icon */}
          <button
            onClick={() => console.log('Truck icon clicked - add your custom action here')}
            className="fixed bottom-8 right-8 group cursor-pointer"
            aria-label="Fleet icon"
          >
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-110 transition-all duration-300 border border-emerald-400/20">
              <Truck className="w-7 h-7 text-white" strokeWidth={2.5} fill="white" />
            </div>
            <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Fleet Manager</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default LoginPage;