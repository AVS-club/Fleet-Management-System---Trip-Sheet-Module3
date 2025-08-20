import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout'; 
import { ChevronLeft, MessageSquare, Mail, Phone } from 'lucide-react';
import Button from '../../components/ui/Button';

const MessageTemplatesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <MessageSquare className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Message Templates</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Manage message templates for SMS and email notifications</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Admin
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <MessageSquare className="h-5 w-5 text-primary-600 mr-2" /> 
            <h2 className="text-lg font-medium text-gray-900">Notification Templates</h2>
          </div>
          <p className="text-gray-500 mb-4">
            Configure message templates for different types of notifications sent to drivers, vehicle owners, and maintenance staff.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Mail className="h-4 w-4 text-primary-600 mr-2" />
                <h3 className="font-medium">Email Templates</h3>
              </div>
              <ul className="list-disc list-inside text-gray-600 text-sm">
                <li>Document Expiry Reminder</li>
                <li>Maintenance Due Notification</li>
                <li>Trip Assignment</li>
                <li>Monthly Performance Report</li>
              </ul>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Phone className="h-4 w-4 text-primary-600 mr-2" />
                <h3 className="font-medium">SMS Templates</h3>
              </div>
              <ul className="list-disc list-inside text-gray-600 text-sm">
                <li>Trip Confirmation</li>
                <li>Urgent Document Reminder</li>
                <li>Trip Delay Notification</li>
                <li>Emergency Alert</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-700">
              This feature is coming soon. Check back later for updates.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MessageTemplatesPage;