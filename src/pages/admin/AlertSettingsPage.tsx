import React from 'react';
import Layout from '../../components/layout/Layout';
import AlertSettings from '../../components/alerts/AlertSettings';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';

const AlertSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout
      title="Alert Settings"
      subtitle="Configure system-wide alert preferences"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to Admin
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