import React from 'react';
import AuthForm from '../components/auth/AuthForm';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/themeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Truck } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="mb-6 text-center animate-fade-in">
        <div className="flex justify-center mb-3">
          <Truck className="h-14 w-14 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Auto Vital Solution</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Smarter Fleet. Less Stress.</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md animate-slide-up">
        <div className="mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Create an Account</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Join us to manage your fleet efficiently</p>
        </div>
        
        <AuthForm mode="register" />
        
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