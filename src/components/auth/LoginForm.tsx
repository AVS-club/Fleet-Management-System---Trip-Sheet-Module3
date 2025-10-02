import React, { useState } from "react";
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
    <form onSubmit={handleLogin} className="space-y-3.5">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-sm font-medium">
            {error}
          </p>
        </div>
      )}
      
      {/* Email Field */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Email or Username
        </label>
        <input
          type="text"
          value={credentials.organizationUsername}
          onChange={(e) => setCredentials({
            ...credentials,
            organizationUsername: e.target.value
          })}
          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          placeholder="Enter email or username (we'll add @gmail.com)"
          required
        />
      </div>

      {/* Password Field */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={credentials.password}
            onChange={(e) => setCredentials({
              ...credentials,
              password: e.target.value
            })}
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all pr-12"
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 active:scale-[0.98] mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
};

export default LoginForm;