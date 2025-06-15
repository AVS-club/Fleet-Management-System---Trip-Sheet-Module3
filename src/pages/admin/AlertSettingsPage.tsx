import React from 'react';
import Layout from '../../components/layout/Layout';
import AlertSettings from '../../components/alerts/AlertSettings';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { useTranslation } from '../../utils/translationUtils';

const AlertSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Translate UI text
  const title = useTranslation('Alert Settings');
  const subtitle = useTranslation('Configure system-wide alert preferences');
  const backToAdminText = useTranslation('Back to Admin');

  return (
    <Layout
      title={title}
      subtitle={subtitle}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          {backToAdminText}
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto">
        <AlertSettings />
      </div>
    </Layout>
  );
};

export default AlertSettingsPage;