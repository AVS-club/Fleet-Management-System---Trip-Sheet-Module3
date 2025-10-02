import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import EnhancedMaintenanceForm from '../components/maintenance/EnhancedMaintenanceForm';
import EnhancedMaintenanceTaskForm from '../components/maintenance/EnhancedMaintenanceTaskForm';
import { Vehicle } from '@/types';
import { MaintenanceTask } from '@/types/maintenance';
import { toast } from 'react-toastify';
import { Button } from 'lucide-react';

const EnhancedMaintenanceDemo: React.FC = () => {
  const [vehicles] = useState<Vehicle[]>([
    {
      id: '1',
      registration_number: 'MH12AB1234',
      make: 'Tata',
      model: 'Ace',
      year: 2020,
      vehicle_type: 'commercial',
      fuel_type: 'diesel',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      registration_number: 'MH12CD5678',
      make: 'Mahindra',
      model: 'Bolero',
      year: 2021,
      vehicle_type: 'commercial',
      fuel_type: 'diesel',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Partial<MaintenanceTask>) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Form submitted with data:', data);
      toast.success('Maintenance task created successfully!');
      
      // Reset form or navigate
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to create maintenance task');
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Enhanced Maintenance Form Demo
            </h1>
            <p className="text-gray-600">
              Experience the new file upload system with individual progress indicators and success states.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <EnhancedMaintenanceForm
              onSubmit={handleSubmit}
              vehicles={vehicles}
              isSubmitting={isSubmitting}
            />
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">
              🎯 Features Demonstrated
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h3 className="font-semibold mb-2">File Upload Features:</h3>
                <ul className="space-y-1">
                  <li>✅ Individual progress bars for each file</li>
                  <li>✅ Success checkmarks when files are ready</li>
                  <li>✅ Auto image compression with progress</li>
                  <li>✅ File size validation and error handling</li>
                  <li>✅ Remove individual files capability</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Form Features:</h3>
                <ul className="space-y-1">
                  <li>✅ Overall upload progress during submission</li>
                  <li>✅ Crash-proof submission handling</li>
                  <li>✅ Real-time validation feedback</li>
                  <li>✅ Success/error state management</li>
                  <li>✅ Responsive design for mobile</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-4">
              🧪 Test Scenarios
            </h2>
            <div className="text-sm text-green-800 space-y-2">
              <p><strong>1. Single File Upload (Odometer Photo):</strong> Try uploading a large image (>2MB) to see compression in action.</p>
              <p><strong>2. Multiple Files Upload (Documents):</strong> Select 2-3 files to see individual progress tracking.</p>
              <p><strong>3. Form Submission:</strong> Fill the form and submit to see overall progress bar.</p>
              <p><strong>4. Error Handling:</strong> Try uploading files that are too large or invalid formats.</p>
              <p><strong>5. Rapid Clicks:</strong> Click submit multiple times quickly to test crash prevention.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EnhancedMaintenanceDemo;
