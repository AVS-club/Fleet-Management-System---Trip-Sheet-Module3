import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { ChevronLeft, Award, TrendingUp, AlertTriangle, Fuel, Clock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const DriverRankingSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout
      title="Driver Ranking Settings"
      subtitle="Configure metrics and weights for driver performance calculation"
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
            <Award className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Performance Metrics Weights</h2>
          </div>
          <p className="text-gray-500 mb-4">
            Configure the relative importance of different metrics in calculating driver performance scores.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Input
                label="Mileage Weight (%)"
                type="number"
                value="25"
                min="0"
                max="100"
                icon={<Fuel className="h-4 w-4" />}
                disabled={true}
              />
              <p className="text-xs text-gray-500 mt-1">How much importance to give to fuel efficiency</p>
            </div>
            
            <div>
              <Input
                label="Trip Completion Weight (%)"
                type="number"
                value="25"
                min="0" 
                max="100"
                icon={<TrendingUp className="h-4 w-4" />}
                disabled={true}
              />
              <p className="text-xs text-gray-500 mt-1">How much importance to give to successful trip completions</p>
            </div>
            
            <div>
              <Input
                label="KM Driven Weight (%)"
                type="number"
                value="20"
                min="0"
                max="100"
                icon={<TrendingUp className="h-4 w-4" />}
                disabled={true}
              />
              <p className="text-xs text-gray-500 mt-1">How much importance to give to distance covered</p>
            </div>
            
            <div>
              <Input
                label="Complaints Weight (%)"
                type="number"
                value="15"
                min="0"
                max="100"
                icon={<AlertTriangle className="h-4 w-4" />}
                disabled={true}
              />
              <p className="text-xs text-gray-500 mt-1">How much importance to give to customer complaints</p>
            </div>
            
            <div>
              <Input
                label="Breakdowns Weight (%)"
                type="number"
                value="15"
                min="0"
                max="100"
                icon={<Clock className="h-4 w-4" />}
                disabled={true}
              />
              <p className="text-xs text-gray-500 mt-1">How much importance to give to vehicle breakdowns</p>
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

export default DriverRankingSettingsPage;