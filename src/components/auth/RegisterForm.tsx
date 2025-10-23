import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface RegisterFormProps {
  showPassword?: boolean;
  setShowPassword?: (show: boolean) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  showPassword = false,
  setShowPassword = () => {}
}) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      setSuccess("Registration successful! Please check your email to confirm. Redirecting to login...");
      // Optionally, redirect or clear form
      setTimeout(() => {
        navigate('/login');
      }, 3000); // Redirect after 3 seconds
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        // @ts-expect-error -- Supabase error object may not match Error
        setError((error as any).error_description || (error as Error).message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-5">
      {error && <p className="text-error-500 dark:text-error-400 text-xs sm:text-sm bg-error-50 dark:bg-error-900/30 p-3 sm:p-4 rounded-xl">{error}</p>}
      {success && <p className="text-success-500 dark:text-success-400 text-xs sm:text-sm bg-success-50 dark:bg-success-900/30 p-3 sm:p-4 rounded-xl">{success}</p>}
      <div>
        <Input
          id="email"
          type="email"
          label="Email"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
          className="rounded-xl bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:shadow-md transition-all"
        />
      </div>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          label="Password"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Create a password"
          className="rounded-xl bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:shadow-md transition-all"
        />
        <button
          type="button"
          className="absolute right-3 top-9 text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <div className="relative">
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          label="Confirm Password"
          icon={<Lock className="h-4 w-4" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Confirm your password"
          className="rounded-xl bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:shadow-md transition-all"
        />
      </div>
      <Button
        type="submit"
        disabled={loading}
        fullWidth
        isLoading={loading}
        inputSize="md"
        className="py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md transition-all"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  );
};

export default RegisterForm;
