import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import ReminderManager from '../../components/admin/reminders/ReminderManager';
import { ChevronLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useTranslation } from '../../utils/translationUtils';

const RemindersPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Translate UI text
  const title = useTranslation('Reminders');
  const subtitle = useTranslation('Configure reminder contacts and timing rules');
  const backToAdminText = useTranslation('Back to Admin');

  return (
    <Layout
      title={title}
      subtitle={subtitle}
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/admin')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          {backToAdminText}
        </Button>
      }
    >
      <ReminderManager />
    </Layout>
  );
};

export default RemindersPage;