import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import ReminderManager from '../../components/admin/reminders/ReminderManager';
import { ChevronLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

const RemindersPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout
      title="Reminders"
      subtitle="Configure reminder contacts and timing rules"
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/admin')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to Admin
        </Button>
      }
    >
      <ReminderManager />
    </Layout>
  );
};

export default RemindersPage;