import React from 'react';

interface TripFormProps {
  onSubmit?: (data: any) => void;
  isSubmitting?: boolean;
  trips?: any[];
  initialData?: any;
}

const TripForm: React.FC<TripFormProps> = ({ 
  onSubmit, 
  isSubmitting, 
  trips, 
  initialData 
}) => {
  return (
    <div>
      <h2>Trip Form</h2>
      <p>Trip form component will be implemented here.</p>
    </div>
  );
};

export default TripForm;