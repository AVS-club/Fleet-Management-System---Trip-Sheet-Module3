import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { ChevronLeft, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';

const AdminDocumentRulesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout
      title="Document Rules"
      subtitle="Configure document requirements and validation rules"
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
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Document Settings</h2>
          </div>
          <p className="text-gray-500 mb-4">
            Configure document requirements, validation rules, and notification settings for vehicle and driver documents.
          </p>
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

export default AdminDocumentRulesPage;