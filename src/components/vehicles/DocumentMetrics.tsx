import React from 'react';
import { Vehicle } from '../../types';
import { FileText, IndianRupee, AlertTriangle } from 'lucide-react';
import { isAfter, isBefore, addDays } from 'date-fns';
import StatCard from '../dashboard/StatCard';

interface DocumentMetricsProps {
  vehicles: Vehicle[];
  dateRange: { start: Date; end: Date };
  previousDateRange: { start: Date; end: Date };
}

const DocumentMetrics: React.FC<DocumentMetricsProps> = ({ 
  vehicles, 
  dateRange,
  previousDateRange
}) => {
  // Calculate metrics for the current period
  const calculateMetrics = (vehicleList: Vehicle[], range: { start: Date; end: Date }) => {
    let totalSpent = 0;
    let docsUploaded = 0;
    let docsExpiredMissing = 0;

    vehicleList.forEach(vehicle => {
      // Count document costs
      if (vehicle.insurance_premium_amount) totalSpent += vehicle.insurance_premium_amount;
      if (vehicle.fitness_cost) totalSpent += vehicle.fitness_cost;
      if (vehicle.permit_cost) totalSpent += vehicle.permit_cost;
      if (vehicle.puc_cost) totalSpent += vehicle.puc_cost;
      if (vehicle.tax_amount) totalSpent += vehicle.tax_amount;

      // Count uploaded documents
      if (vehicle.rc_document_url) docsUploaded++;
      if (vehicle.insurance_document_url) docsUploaded++;
      if (vehicle.fitness_document_url) docsUploaded++;
      if (vehicle.permit_document_url) docsUploaded++;
      if (vehicle.puc_document_url) docsUploaded++;
      if (vehicle.tax_document_url) docsUploaded++;

      // Count other documents
      if (vehicle.other_documents && Array.isArray(vehicle.other_documents)) {
        docsUploaded += vehicle.other_documents.length;
      }

      // Count expired or missing documents
      const today = new Date();
      
      // RC
      if (!vehicle.rc_document_url) {
        docsExpiredMissing++;
      } else if (vehicle.rc_expiry_date && isBefore(new Date(vehicle.rc_expiry_date), today)) {
        docsExpiredMissing++;
      }
      
      // Insurance
      if (!vehicle.insurance_document_url) {
        docsExpiredMissing++;
      } else if (vehicle.insurance_expiry_date && isBefore(new Date(vehicle.insurance_expiry_date), today)) {
        docsExpiredMissing++;
      }
      
      // Fitness
      if (!vehicle.fitness_document_url) {
        docsExpiredMissing++;
      } else if (vehicle.fitness_expiry_date && isBefore(new Date(vehicle.fitness_expiry_date), today)) {
        docsExpiredMissing++;
      }
      
      // Permit
      if (!vehicle.permit_document_url) {
        docsExpiredMissing++;
      } else if (vehicle.permit_expiry_date && isBefore(new Date(vehicle.permit_expiry_date), today)) {
        docsExpiredMissing++;
      }
      
      // PUC
      if (!vehicle.puc_document_url) {
        docsExpiredMissing++;
      } else if (vehicle.puc_expiry_date && isBefore(new Date(vehicle.puc_expiry_date), today)) {
        docsExpiredMissing++;
      }
      
      // Tax
      if (!vehicle.tax_document_url) {
        docsExpiredMissing++;
      } else if (vehicle.tax_paid_upto && isBefore(new Date(vehicle.tax_paid_upto), today)) {
        docsExpiredMissing++;
      }
    });

    return {
      totalSpent,
      docsUploaded,
      docsExpiredMissing
    };
  };

  // Calculate metrics for current and previous periods
  const currentMetrics = calculateMetrics(vehicles, dateRange);
  
  // Filter vehicles for previous period
  const previousVehicles = vehicles.filter(vehicle => {
    const createdAt = vehicle.created_at ? new Date(vehicle.created_at) : null;
    return !createdAt || isBefore(createdAt, previousDateRange.end);
  });
  
  const previousMetrics = calculateMetrics(previousVehicles, previousDateRange);

  // Calculate percentage changes
  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const spentChange = calculatePercentChange(currentMetrics.totalSpent, previousMetrics.totalSpent);
  const uploadedChange = calculatePercentChange(currentMetrics.docsUploaded, previousMetrics.docsUploaded);
  const expiredMissingChange = calculatePercentChange(currentMetrics.docsExpiredMissing, previousMetrics.docsExpiredMissing);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Documentation Expenses"
        value={`₹${Math.round(currentMetrics.totalSpent).toLocaleString()}`}
        icon={<IndianRupee className="h-5 w-5 text-primary-600" />}
        trend={spentChange !== 0 ? {
          value: Math.abs(Math.round(spentChange)),
          label: "vs previous period",
          isPositive: spentChange < 0 // Lower expenses is positive
        } : undefined}
      />
      
      <StatCard
        title="Documents Uploaded"
        value={currentMetrics.docsUploaded}
        icon={<FileText className="h-5 w-5 text-primary-600" />}
        trend={uploadedChange !== 0 ? {
          value: Math.abs(Math.round(uploadedChange)),
          label: "vs previous period",
          isPositive: uploadedChange > 0 // More uploads is positive
        } : undefined}
      />
      
      <StatCard
        title="Expired/Missing Docs"
        value={currentMetrics.docsExpiredMissing}
        icon={<AlertTriangle className="h-5 w-5 text-warning-600" />}
        trend={expiredMissingChange !== 0 ? {
          value: Math.abs(Math.round(expiredMissingChange)),
          label: "vs previous period",
          isPositive: expiredMissingChange < 0 // Fewer expired/missing is positive
        } : undefined}
        warning={currentMetrics.docsExpiredMissing > 0}
      />
    </div>
  );
};

export default DocumentMetrics;