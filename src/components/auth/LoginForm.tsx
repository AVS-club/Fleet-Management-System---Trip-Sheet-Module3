import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithOrganization } from "../../utils/auth";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";

interface LoginFormProps {
  showPassword?: boolean;
  setShowPassword?: (show: boolean) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  showPassword = false, 
  setShowPassword = () => {} 
}) => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    organizationUsername: "cfaraipur19@gmail.com",
    password: "password123"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for input elements to prevent focus issues
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Optimized input handlers to prevent character sticking
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCredentials(prev => ({
      ...prev,
      organizationUsername: value
    }));
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCredentials(prev => ({
      ...prev,
      password: value
    }));
  }, []);

  // Prevent any interference with normal input behavior
  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Ensure the input is properly focused and ready for typing
    e.target.select?.();
  }, []);

  const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Normal blur behavior - no interference
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const result = await loginWithOrganization(credentials);
      
      toast.success(`Welcome back, ${result.organization.name}!`);
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="login-form space-y-3.5">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">
            {error}
          </p>
        </div>
      )}

      {/* Email Field */}
      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
          Email or Username
        </label>
        <input
          ref={emailInputRef}
          type="text"
          value={credentials.organizationUsername}
          onChange={handleEmailChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent"
          placeholder="Enter email or username (we'll add @gmail.com)"
          required
          autoComplete="username"
          spellCheck={false}
        />
      </div>

      {/* Password Field */}
      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
          Password
        </label>
        <div className="relative">
          <input
            ref={passwordInputRef}
            type={showPassword ? "text" : "password"}
            value={credentials.password}
            onChange={handlePasswordChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent pr-12"
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Sign In Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 dark:from-emerald-500 dark:to-emerald-600 dark:hover:from-emerald-600 dark:hover:to-emerald-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 dark:shadow-emerald-500/30 hover:shadow-emerald-600/50 dark:hover:shadow-emerald-500/50 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
};

export default LoginForm;