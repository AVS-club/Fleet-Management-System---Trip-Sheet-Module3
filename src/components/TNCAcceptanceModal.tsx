import React, { useState } from 'react';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { createLogger } from '../utils/logger';

const logger = createLogger('TNCAcceptanceModal');

interface TNCAcceptanceModalProps {
  userId: string;
  organizationId?: string | null;
  onAccept: () => void;
}

const TNCAcceptanceModal: React.FC<TNCAcceptanceModalProps> = ({
  userId,
  organizationId,
  onAccept
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get user IP and user agent for metadata
      const metadata = {
        ip_address: await fetch('https://api.ipify.org?format=json')
          .then(res => res.json())
          .then(data => data.ip)
          .catch(() => null),
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        browser: navigator.userAgentData?.brands?.[0]?.brand || 'Unknown',
        platform: navigator.platform,
      };

      // Insert TNC acceptance record
      const { error: insertError } = await supabase
        .from('tnc_acceptances')
        .insert([{
          user_id: userId,
          organization_id: organizationId || null,
          accepted_at: new Date().toISOString(),
          ip_address: metadata.ip_address,
          user_agent: metadata.user_agent,
          tnc_version: '1.0',
          metadata: metadata
        }]);

      if (insertError) {
        logger.error('Error saving TNC acceptance:', insertError);
        throw insertError;
      }

      // Cache locally to prevent future flashes before server check
      const cacheKey = `tnc_accept_v1_${userId}`;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(cacheKey, 'true');
      }

      logger.info('TNC acceptance saved successfully');
      onAccept();
    } catch (err: any) {
      logger.error('Error accepting TNC:', err);
      setError(err.message || 'Failed to save acceptance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Modal cannot be closed - no close button */}
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Terms and Conditions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please read and accept to continue
              </p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                    Important Notice
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    By signing up or paying for our services, you are directly agreeing to these Terms and Conditions. 
                    You must accept these terms to use the Auto Vital Solution platform.
                  </p>
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Auto Vital Solution – Terms and Conditions
            </h1>
            
            <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-200">
              Acceptance of Terms
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              The Terms and Conditions (the "Terms" or "Agreement") govern your access to and use of the Auto Vital Solution platform (the "Platform"), whether as a free user or a paid subscriber. By creating an account, accessing, or using the Platform, you agree to be bound by these Terms.
            </p>
            
            <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-200">
              Account and Eligibility
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              You are responsible for ensuring that any information you provide to create an account is accurate and up-to-date. You must safeguard your login credentials and not share them with anyone else. You agree to notify us immediately of any unauthorized use of your account.
            </p>
            
            <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-200">
              Paid Subscriptions and Billing
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              The Platform offers paid subscription plans that grant access to additional features and services. The following terms apply to paid subscribers:
            </p>
            <ul className="mb-4 ml-6 list-disc space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong className="font-semibold text-gray-900 dark:text-gray-100">Monthly Term & Prepayment:</strong> All subscriptions are provided on a monthly, prepaid basis. Each subscription period ("Subscription Term") is one month in length, beginning on the date we successfully receive your payment.</li>
              <li><strong className="font-semibold text-gray-900 dark:text-gray-100">Auto-Renewal & Cancellation:</strong> Paid subscriptions auto-renew at the end of each monthly term by charging the payment method on file for the next month's fee, unless you cancel beforehand. You may cancel your subscription at any time through your account settings.</li>
              <li><strong className="font-semibold text-gray-900 dark:text-gray-100">No Refunds:</strong> All subscription fees and charges are prepaid and non-refundable. Auto Vital Solution does not offer refunds under any circumstances, whether for unused time, downgrades, or otherwise except as required by law.</li>
              <li><strong className="font-semibold text-gray-900 dark:text-gray-100">Payment and Taxes:</strong> You agree to provide a valid payment method and authorize AVS to charge it for all subscription fees due. All fees are exclusive of any taxes, levies, or duties imposed by taxing authorities.</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-200">
              Acceptable Use and Prohibited Activities
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              We expect all users to use Auto Vital Solution in a lawful and respectful manner. You agree not to misuse the Platform. Prohibited activities include unauthorized account sharing, automated scraping, reverse engineering, and any unlawful use of the Platform.
            </p>
            
            <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-200">
              Intellectual Property Rights
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              All content, software, technology, and data on or underlying the Platform (except content provided by users) are the intellectual property of Auto Vital Solution or its licensors.
            </p>
            
            <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-200">
              Limitation of Liability
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              To the maximum extent permitted by applicable law, Auto Vital Solution and its owners, officers, employees, agents, partners, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
            </p>
            
            <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-200">
              Governing Law
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              This Agreement and any dispute arising out of or in connection with it or the use of the Platform shall be governed by and construed in accordance with the laws of India.
            </p>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                For the complete Terms and Conditions, please visit:{' '}
                <Link 
                  to="/terms-and-conditions" 
                  target="_blank"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Full Terms and Conditions
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer with Accept Button */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You must accept these terms to continue using the platform.
            </p>
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold rounded-lg shadow-lg shadow-emerald-600/30 dark:shadow-emerald-500/30 hover:shadow-emerald-600/50 dark:hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  I Agree
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TNCAcceptanceModal;

