import React from 'react';
import LoginForm from '../components/auth/LoginForm';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/themeContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Truck } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <Truck className="h-12 w-12 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Auto Vital Solution</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">Intelligent Fleet Management</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-gray-900 dark:text-white">Login</h2>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 dark:text-primary-400 hover:underline">
            Register here
          </Link>
        </p>
      </div>
      
      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Auto Vital Solution. All rights reserved. • Built with <a href="https://bolt.new" className="text-primary-600 dark:text-primary-400 hover:underline">Bolt.new</a>
      </p>
    </div>
  );
};

export default LoginPage;