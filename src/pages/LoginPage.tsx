import React, { useState } from 'react';
import LoginForm from '../components/auth/LoginForm';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/themeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Truck } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Welcome back!</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sign in to manage your fleet like a pro.</p>
        </div>
        
        <LoginForm showPassword={showPassword} setShowPassword={setShowPassword} />
        
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between text-center sm:text-left text-sm">
          <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline mb-2 sm:mb-0">
            Forgot password?
          </a>
          <p className="text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 hover:underline">
              Register here
            </Link>
          </p>
        </div>
        
        <div className="mt-6 text-center">
          <p className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            <span className="mr-1">🔒</span>
            Your credentials are encrypted and secure
          </p>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Auto Vital Solution. All rights reserved. • Built with <a href="https://bolt.new" className="text-primary-600 dark:text-primary-400 hover:underline">Bolt.new</a>
      </p>
    </div>
  );
};

export default LoginPage;