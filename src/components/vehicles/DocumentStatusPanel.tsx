import React from 'react';
import { Vehicle } from '../../types';
import { FileText, Eye, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format, isValid, isBefore, isAfter, addDays } from 'date-fns';
import CollapsibleSection from '../ui/CollapsibleSection';

interface DocumentStatusPanelProps {
  vehicle: Vehicle;
}

const DocumentStatusPanel: React.FC<DocumentStatusPanelProps> = ({ vehicle }) => {
  // Helper function to determine document status
  const getDocumentStatus = (docUrl?: string, expiryDate?: string) => {
    if (!docUrl) return { status: 'missing', label: 'Missing', color: 'bg-gray-100 text-gray-800' };
    
    if (expiryDate) {
      const today = new Date();
      const expiry = new Date(expiryDate);
      
      if (!isValid(expiry)) return { status: 'invalid', label: 'Invalid Date', color: 'bg-warning-100 text-warning-800' };
      
      if (isBefore(expiry, today)) {
        return { status: 'expired', label: 'Expired', color: 'bg-error-100 text-error-800' };
      }
      
      // Check if expiring soon (within 30 days)
      const thirtyDaysFromNow = addDays(today, 30);
      
      if (isBefore(expiry, thirtyDaysFromNow)) {
        return { status: 'expiring', label: 'Expiring Soon', color: 'bg-warning-100 text-warning-800' };
      }
    }
    
    return { status: 'valid', label: 'Valid', color: 'bg-success-100 text-success-800' };
  };
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return isValid(date) ? format(date, 'dd MMM yyyy') : 'Invalid Date';
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Calculate document statuses
  const rcStatus = getDocumentStatus(vehicle.rc_document_url, vehicle.rc_expiry_date);
  const insuranceStatus = getDocumentStatus(vehicle.insurance_document_url, vehicle.insurance_expiry_date);
  const fitnessStatus = getDocumentStatus(vehicle.fitness_document_url, vehicle.fitness_expiry_date);
  const permitStatus = getDocumentStatus(vehicle.permit_document_url, vehicle.permit_expiry_date);
  const pucStatus = getDocumentStatus(vehicle.puc_document_url, vehicle.puc_expiry_date);
  const taxStatus = getDocumentStatus(vehicle.tax_document_url, vehicle.tax_paid_upto);

  // Count documents by status
  const documentStatuses = [rcStatus, insuranceStatus, fitnessStatus, permitStatus, pucStatus, taxStatus];
  const validCount = documentStatuses.filter(doc => doc.status === 'valid').length;
  const expiringCount = documentStatuses.filter(doc => doc.status === 'expiring').length;
  const expiredCount = documentStatuses.filter(doc => doc.status === 'expired').length;
  const missingCount = documentStatuses.filter(doc => doc.status === 'missing').length;
  const totalDocuments = documentStatuses.length;

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'expiring':
        return <AlertTriangle className="h-4 w-4 text-warning-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-error-500" />;
      case 'missing':
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <CollapsibleSection 
      title="Document Status" 
      icon={<FileText className="h-5 w-5" />}
      iconColor="text-blue-600"
      defaultExpanded={true}
    >
      <div className="space-y-4">
        {/* Document Status Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-success-600">{validCount}</div>
            <div className="text-xs text-gray-500">Valid</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-warning-600">{expiringCount}</div>
            <div className="text-xs text-gray-500">Expiring Soon</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-error-600">{expiredCount}</div>
            <div className="text-xs text-gray-500">Expired</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-600">{missingCount}</div>
            <div className="text-xs text-gray-500">Missing</div>
          </div>
        </div>

        {/* Document List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Document Details</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {/* RC Document */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(rcStatus.status)}
                <span className="ml-2 text-sm font-medium">RC Document</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${rcStatus.color}`}>
                  {rcStatus.label}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500">
                  {rcStatus.status !== 'missing' ? `Expires: ${formatDate(vehicle.rc_expiry_date)}` : ''}
                </span>
                {vehicle.rc_document_url && (
                  <a 
                    href={vehicle.rc_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Insurance Document */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(insuranceStatus.status)}
                <span className="ml-2 text-sm font-medium">Insurance</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${insuranceStatus.color}`}>
                  {insuranceStatus.label}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500">
                  {insuranceStatus.status !== 'missing' ? `Expires: ${formatDate(vehicle.insurance_expiry_date)}` : ''}
                </span>
                {vehicle.insurance_document_url && (
                  <a 
                    href={vehicle.insurance_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Fitness Document */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(fitnessStatus.status)}
                <span className="ml-2 text-sm font-medium">Fitness Certificate</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${fitnessStatus.color}`}>
                  {fitnessStatus.label}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500">
                  {fitnessStatus.status !== 'missing' ? `Expires: ${formatDate(vehicle.fitness_expiry_date)}` : ''}
                </span>
                {vehicle.fitness_document_url && (
                  <a 
                    href={vehicle.fitness_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Permit Document */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(permitStatus.status)}
                <span className="ml-2 text-sm font-medium">Permit</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${permitStatus.color}`}>
                  {permitStatus.label}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500">
                  {permitStatus.status !== 'missing' ? `Expires: ${formatDate(vehicle.permit_expiry_date)}` : ''}
                </span>
                {vehicle.permit_document_url && (
                  <a 
                    href={vehicle.permit_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* PUC Document */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(pucStatus.status)}
                <span className="ml-2 text-sm font-medium">PUC Certificate</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${pucStatus.color}`}>
                  {pucStatus.label}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500">
                  {pucStatus.status !== 'missing' ? `Expires: ${formatDate(vehicle.puc_expiry_date)}` : ''}
                </span>
                {vehicle.puc_document_url && (
                  <a 
                    href={vehicle.puc_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Tax Document */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(taxStatus.status)}
                <span className="ml-2 text-sm font-medium">Tax Receipt</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${taxStatus.color}`}>
                  {taxStatus.label}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500">
                  {taxStatus.status !== 'missing' ? `Paid Until: ${formatDate(vehicle.tax_paid_upto)}` : ''}
                </span>
                {vehicle.tax_document_url && (
                  <a 
                    href={vehicle.tax_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Other Documents */}
        {vehicle.other_documents && Array.isArray(vehicle.other_documents) && vehicle.other_documents.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Other Documents</h3>
            </div>
            
            <div className="divide-y divide-gray-100">
              {vehicle.other_documents.map((doc, index) => (
                <div key={index} className="p-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="ml-2 text-sm font-medium">{doc.name || `Document ${index + 1}`}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {doc.expiry_date && (
                      <span className="text-xs text-gray-500">
                        Expires: {formatDate(doc.expiry_date)}
                      </span>
                    )}
                    {doc.file && typeof doc.file === 'string' && (
                      <a 
                        href={doc.file} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};

export default DocumentStatusPanel;