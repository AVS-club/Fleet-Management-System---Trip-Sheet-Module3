import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/themeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import AuroraBackground from '../components/ui/AuroraBackground';
import { Truck, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';

const ResetPasswordPage: React.FC = () => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Implement actual password reset logic
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Aurora Background */}
        <AuroraBackground />
        
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-gray-300/60 p-8 border border-gray-100">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl mb-6 shadow-xl shadow-emerald-600/40">
                <Mail className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button 
                    onClick={() => setEmailSent(false)}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    try again
                  </button>
                </p>
                
                <Link 
                  to="/login"
                  className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
          
          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} Auto Vital Solution. All rights reserved. • Built with ❤️
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Aurora Background */}
      <AuroraBackground />
      
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl mb-5 shadow-xl shadow-emerald-600/40">
            <Truck className="w-11 h-11 text-white" strokeWidth={2.5} fill="white" />
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight mb-1.5">
            <span className="text-gray-900">Auto Vital</span>
            <span className="text-emerald-600"> Solution</span>
          </h1>
          
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-600 to-transparent"></div>
          </div>
          
          <p className="text-sm text-gray-600 font-medium">
            Smarter Fleet. Less Stress.
          </p>
        </div>

        {/* Reset Password Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-gray-300/60 p-8 border border-gray-100">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-500">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Enter your email address"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Mail className="w-4 h-4" />
              <span className="text-xs font-medium">
                We'll send you a secure reset link
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Auto Vital Solution. All rights reserved. • Built with ❤️
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
