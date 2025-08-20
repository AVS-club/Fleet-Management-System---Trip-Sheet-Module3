import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout'; 
import ReminderManager from '../../components/admin/reminders/ReminderManager';
import { ChevronLeft, Calendar } from 'lucide-react';
import Button from '../../components/ui/Button';

const RemindersPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Calendar className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Reminders</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Configure reminder contacts and timing rules</p>
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

      <ReminderManager />
    </Layout>
  );
};

export default RemindersPage;