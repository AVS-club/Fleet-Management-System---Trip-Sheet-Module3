import React, { useState } from 'react';
import RegisterForm from '../components/auth/RegisterForm';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/themeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import AuroraBackground from '../components/ui/AuroraBackground';
import { Truck } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Aurora Background */}
      <AuroraBackground />

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="mb-6 text-center animate-fade-in">
        <div className="flex justify-center mb-3">
          <Truck className="h-14 w-14 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Auto Vital Solution</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Smarter Fleet. Less Stress.</p>
      </div>

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-2xl shadow-gray-300/60 dark:shadow-gray-900/60 border border-gray-100 dark:border-gray-700 w-full max-w-md animate-slide-up relative z-10">
        <div className="mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Create an Account</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Join us to manage your fleet efficiently</p>
        </div>

        <RegisterForm showPassword={showPassword} setShowPassword={setShowPassword} />

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            By signing up, you agree to our{' '}
            <Link to="/terms-and-conditions" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline">
              Terms and Conditions
            </Link>
            {' '}and{' '}
            <Link to="/terms-and-conditions" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline">
              Privacy Policy
            </Link>
            . You will be required to accept these terms upon first login.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
            Sign in here
          </Link>
        </p>

        <div className="mt-6 text-center">
          <p className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            <span className="mr-1">🔒</span>
            Your information is encrypted and secure
          </p>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Auto Vital Solution. All rights reserved. • Built with ❤️
      </p>
    </div>
  );
};

export default RegisterPage;
