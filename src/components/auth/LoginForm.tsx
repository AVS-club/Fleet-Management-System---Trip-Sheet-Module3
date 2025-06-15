import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Mail, Lock, AlertCircle } from 'lucide-react';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please set up your environment variables.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/'); // Navigate to dashboard
    } catch (error: any) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-md">
          <AlertCircle className="h-5 w-5" />
          <div>
            <h3 className="font-medium">Supabase Configuration Required</h3>
            <p className="text-sm mt-1">
              Please configure your Supabase credentials in the environment variables to enable authentication.
            </p>
            <div className="text-xs mt-2 space-y-1">
              <p>1. Set up your <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">VITE_SUPABASE_URL</code></p>
              <p>2. Set up your <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">VITE_SUPABASE_ANON_KEY</code></p>
              <p>3. Click "Connect to Supabase" in the top right if available</p>
            </div>
          </div>
        </div>
        <Button type="button" disabled fullWidth>
          Login (Configuration Required)
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && <p className="text-error-500 dark:text-error-400 text-sm bg-error-50 dark:bg-error-900/30 p-3 rounded-md">{error}</p>}
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
        />
      </div>
      <div>
        <Input
          id="password"
          type="password"
          label="Password"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
        />
      </div>
      <Button type="submit" disabled={loading} fullWidth isLoading={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
};

export default LoginForm;