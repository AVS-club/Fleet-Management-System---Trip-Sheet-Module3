import React from 'react';
import Layout from '../../components/layout/Layout';
import AlertSettings from '../../components/alerts/AlertSettings'; 
import { ChevronLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';

const AlertSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Bell className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Alert Settings</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Configure system-wide alert preferences</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            inputSize="sm"
            onClick={() => navigate('/admin')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Admin
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <AlertSettings />
      </div>
    </Layout>
  );
};

export default AlertSettingsPage;