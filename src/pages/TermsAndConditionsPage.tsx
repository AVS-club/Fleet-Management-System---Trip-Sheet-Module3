import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const TermsAndConditionsPage: React.FC = () => {
  const navigate = useNavigate();

  // TNC content - This will be replaced with the actual content from the user
  const tncContent = `
    <h1>Auto Vital Solution – Terms and Conditions</h1>
    
    <h2>Acceptance of Terms</h2>
    <p>The Terms and Conditions (the "Terms" or "Agreement") govern your access to and use of the Auto Vital Solution platform (the "Platform"), whether as a free user or a paid subscriber. By creating an account, accessing, or using the Platform, you agree to be bound by these Terms.</p>
    
    <h2>Account and Eligibility</h2>
    <p>You are responsible for ensuring that any information you provide to create an account is accurate and up-to-date. You must safeguard your login credentials and not share them with anyone else. You agree to notify us immediately of any unauthorized use of your account.</p>
    
    <h2>Paid Subscriptions and Billing</h2>
    <p>The Platform offers paid subscription plans that grant access to additional features and services. The following terms apply to paid subscribers:</p>
    <ul>
      <li><strong>Monthly Term & Prepayment:</strong> All subscriptions are provided on a monthly, prepaid basis. Each subscription period ("Subscription Term") is one month in length, beginning on the date we successfully receive your payment.</li>
      <li><strong>Auto-Renewal & Cancellation:</strong> Paid subscriptions auto-renew at the end of each monthly term by charging the payment method on file for the next month's fee, unless you cancel beforehand. You may cancel your subscription at any time through your account settings.</li>
      <li><strong>No Refunds:</strong> All subscription fees and charges are prepaid and non-refundable. Auto Vital Solution does not offer refunds under any circumstances, whether for unused time, downgrades, or otherwise except as required by law.</li>
      <li><strong>Subscription Records and Features:</strong> We maintain internal records of your subscription status to manage your access rights. These records include data in your user profile and related subscription entries.</li>
      <li><strong>Payment and Taxes:</strong> You agree to provide a valid payment method and authorize AVS to charge it for all subscription fees due. All fees are exclusive of any taxes, levies, or duties imposed by taxing authorities.</li>
    </ul>
    
    <h2>Acceptable Use and Prohibited Activities</h2>
    <p>We expect all users to use Auto Vital Solution in a lawful and respectful manner. You agree not to misuse the Platform. The following is a non-exhaustive list of prohibited activities that constitute misuse:</p>
    <ul>
      <li><strong>Unauthorized Account Sharing or Access:</strong> You must not share your login credentials with others or otherwise allow any unauthorized person or entity to access the Platform through your account.</li>
      <li><strong>Automated Scraping or Data Harvesting:</strong> You shall not use bots, spiders, scripts, or any automated methods to scrape or extract data or content from the Platform.</li>
      <li><strong>Reverse Engineering and Security Attacks:</strong> You must not reverse engineer, decompile, disassemble, or attempt to derive the source code or underlying ideas or algorithms of any portion of the Platform.</li>
      <li><strong>Improper Use of Platform and Legal Compliance:</strong> You agree not to use the Platform for any purpose that is unlawful or beyond the scope of its intended use.</li>
    </ul>
    
    <h2>Account Data and Monitoring</h2>
    <p>Auto Vital Solution takes compliance seriously. You acknowledge and agree that we may monitor and record activity on the Platform to enforce these Terms and ensure the integrity of our service.</p>
    
    <h2>Intellectual Property Rights</h2>
    <p>All content, software, technology, and data on or underlying the Platform (except content provided by users) are the intellectual property of Auto Vital Solution or its licensors.</p>
    
    <h2>Termination of Account and Service</h2>
    <p>This Agreement remains in effect until terminated by either you or us. We reserve the right to suspend or terminate your account immediately if you violate any of these Terms.</p>
    
    <h2>Disclaimer of Warranties</h2>
    <p>Use at Your Own Risk: The Auto Vital Solution Platform is provided on an "AS IS" and "AS AVAILABLE" basis. To the fullest extent permitted by law, AVS disclaims all warranties of any kind.</p>
    
    <h2>Limitation of Liability</h2>
    <p>To the maximum extent permitted by applicable law, Auto Vital Solution and its owners, officers, employees, agents, partners, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</p>
    
    <h2>Indemnification</h2>
    <p>You agree to indemnify, defend, and hold harmless Auto Vital Solution, its parent company, affiliates, officers, directors, employees, agents, and partners from and against any claims, damages, obligations, losses, liabilities, costs, or debt.</p>
    
    <h2>Governing Law and Dispute Resolution</h2>
    <p>This Agreement and any dispute arising out of or in connection with it or the use of the Platform shall be governed by and construed in accordance with the laws of India.</p>
    
    <h2>Miscellaneous Provisions</h2>
    <p>We reserve the right to modify, suspend, or discontinue any part of the Platform at any time, with or without notice.</p>
    
    <h2>Contact Information</h2>
    <p>If you have any questions, concerns, or require assistance regarding these Terms or the Platform, please contact Auto Vital Solution at: support@autovitalsolution.com</p>
    
    <p>By using the Auto Vital Solution Platform, you affirm that you have read these Terms and agree to abide by them. Thank you for using Auto Vital Solution.</p>
  `;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="font-sans text-sm sm:text-base">Back</span>
              </button>
            </div>
            <div className="flex items-start space-x-3">
              <FileText className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <div>
                <h1 className="text-2xl font-display font-bold tracking-tight-plus text-gray-900 dark:text-gray-100">
                  Terms and Conditions
                </h1>
                <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-1">
                  Auto Vital Solution Platform Terms and Conditions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TNC Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          <div 
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
            style={{
              color: 'inherit'
            }}
          >
            <div 
              dangerouslySetInnerHTML={{ __html: tncContent }}
              className="[&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6 [&>h1]:text-gray-900 [&>h1]:dark:text-gray-100 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mb-3 [&>h2]:mt-5 [&>h2]:text-gray-800 [&>h2]:dark:text-gray-200 [&>p]:mb-4 [&>p]:text-gray-700 [&>p]:dark:text-gray-300 [&>p]:leading-relaxed [&>ul]:mb-4 [&>ul]:ml-6 [&>ul]:list-disc [&>ul]:space-y-2 [&>li]:text-gray-700 [&>li]:dark:text-gray-300 [&>li>strong]:font-semibold [&>li>strong]:text-gray-900 [&>li>strong]:dark:text-gray-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;

