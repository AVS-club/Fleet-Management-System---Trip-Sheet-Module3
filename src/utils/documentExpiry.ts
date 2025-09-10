import { differenceInDays, addDays, format, parseISO, isValid } from 'date-fns';

export type DocumentStatus = 'expired' | 'expiring_soon' | 'expiring' | 'valid';
export type SeverityLevel = 'critical' | 'warning' | 'info' | 'ok';

interface ExpiryStatus {
  status: DocumentStatus;
  severity: SeverityLevel;
  daysRemaining: number;
  message: string;
  canOperate: boolean;
  action?: string;
  reminderDate?: Date;
}

interface DocumentExpiryCheck {
  documentType: string;
  expiryDate: string | null;
  entityName: string;
  entityId: string;
}

// Check single document expiry status
export const getDocumentExpiryStatus = (
  expiryDate: string | null,
  documentType: string
): ExpiryStatus => {
  if (!expiryDate) {
    return {
      status: 'expired',
      severity: 'critical',
      daysRemaining: -1,
      message: `${documentType} expiry date not set`,
      canOperate: false,
      action: 'UPDATE_EXPIRY_DATE'
    };
  }

  const expiry = parseISO(expiryDate);
  if (!isValid(expiry)) {
    return {
      status: 'expired',
      severity: 'critical',
      daysRemaining: -1,
      message: `Invalid ${documentType} expiry date`,
      canOperate: false,
      action: 'UPDATE_EXPIRY_DATE'
    };
  }

  const today = new Date();
  const daysRemaining = differenceInDays(expiry, today);

  if (daysRemaining < 0) {
    return {
      status: 'expired',
      severity: 'critical',
      daysRemaining,
      message: `${documentType} expired ${Math.abs(daysRemaining)} days ago`,
      canOperate: false,
      action: 'IMMEDIATE_RENEWAL_REQUIRED'
    };
  } else if (daysRemaining <= 7) {
    return {
      status: 'expiring_soon',
      severity: 'warning',
      daysRemaining,
      message: `${documentType} expires in ${daysRemaining} days`,
      canOperate: true,
      action: 'URGENT_RENEWAL',
      reminderDate: addDays(today, 1)
    };
  } else if (daysRemaining <= 30) {
    return {
      status: 'expiring',
      severity: 'warning',
      daysRemaining,
      message: `${documentType} expires in ${daysRemaining} days`,
      canOperate: true,
      action: 'SCHEDULE_RENEWAL',
      reminderDate: addDays(today, 7)
    };
  } else if (daysRemaining <= 90) {
    return {
      status: 'expiring',
      severity: 'info',
      daysRemaining,
      message: `${documentType} expires in ${daysRemaining} days`,
      canOperate: true,
      action: 'PLAN_RENEWAL',
      reminderDate: addDays(today, 30)
    };
  }

  return {
    status: 'valid',
    severity: 'ok',
    daysRemaining,
    message: `${documentType} valid for ${daysRemaining} days`,
    canOperate: true
  };
};

// Check driver license expiry
export const checkDriverLicenseExpiry = (licenseExpiry: string | null) => {
  return getDocumentExpiryStatus(licenseExpiry, 'Driving License');
};

// Check vehicle document expiries
export const checkVehicleDocuments = (vehicle: {
  insurance_expiry?: string | null;
  fitness_expiry?: string | null;
  permit_expiry?: string | null;
  puc_expiry?: string | null;
  tax_expiry?: string | null;
}) => {
  const documents = {
    insurance: getDocumentExpiryStatus(vehicle.insurance_expiry || null, 'Insurance'),
    fitness: getDocumentExpiryStatus(vehicle.fitness_expiry || null, 'Fitness Certificate'),
    permit: getDocumentExpiryStatus(vehicle.permit_expiry || null, 'Permit'),
    puc: getDocumentExpiryStatus(vehicle.puc_expiry || null, 'PUC'),
    tax: getDocumentExpiryStatus(vehicle.tax_expiry || null, 'Road Tax')
  };

  // Overall vehicle status
  const criticalCount = Object.values(documents).filter(d => d.severity === 'critical').length;
  const warningCount = Object.values(documents).filter(d => d.severity === 'warning').length;
  
  const canOperate = Object.values(documents).every(d => d.canOperate);
  const overallSeverity: SeverityLevel = 
    criticalCount > 0 ? 'critical' : 
    warningCount > 0 ? 'warning' : 'ok';

  return {
    documents,
    canOperate,
    overallSeverity,
    criticalCount,
    warningCount,
    summary: {
      expired: Object.entries(documents)
        .filter(([_, status]) => status.status === 'expired')
        .map(([type]) => type),
      expiringSoon: Object.entries(documents)
        .filter(([_, status]) => status.status === 'expiring_soon')
        .map(([type]) => type),
      expiring: Object.entries(documents)
        .filter(([_, status]) => status.status === 'expiring')
        .map(([type]) => type)
    }
  };
};

// Batch check all expiries in the system
export const checkAllExpiries = (
  drivers: Array<{ id: string; name: string; license_expiry: string | null }>,
  vehicles: Array<{
    id: string;
    registration_number: string;
    insurance_expiry?: string | null;
    fitness_expiry?: string | null;
    permit_expiry?: string | null;
    puc_expiry?: string | null;
    tax_expiry?: string | null;
  }>
) => {
  const expiryReport = {
    critical: [] as Array<{ type: string; entity: string; message: string; daysOverdue: number }>,
    warning: [] as Array<{ type: string; entity: string; message: string; daysRemaining: number }>,
    upcoming: [] as Array<{ type: string; entity: string; message: string; daysRemaining: number }>,
    valid: [] as Array<{ type: string; entity: string; message: string }>
  };

  // Check driver licenses
  drivers.forEach(driver => {
    const status = checkDriverLicenseExpiry(driver.license_expiry);
    const entry = {
      type: 'Driver License',
      entity: driver.name,
      message: status.message,
      daysRemaining: status.daysRemaining,
      daysOverdue: Math.abs(status.daysRemaining)
    };

    if (status.severity === 'critical') {
      expiryReport.critical.push(entry);
    } else if (status.severity === 'warning') {
      expiryReport.warning.push(entry);
    } else if (status.severity === 'info') {
      expiryReport.upcoming.push(entry);
    } else {
      expiryReport.valid.push(entry);
    }
  });

  // Check vehicle documents
  vehicles.forEach(vehicle => {
    const vehicleStatus = checkVehicleDocuments(vehicle);
    
    Object.entries(vehicleStatus.documents).forEach(([docType, status]) => {
      const entry = {
        type: `Vehicle ${docType}`,
        entity: vehicle.registration_number,
        message: status.message,
        daysRemaining: status.daysRemaining,
        daysOverdue: Math.abs(status.daysRemaining)
      };

      if (status.severity === 'critical') {
        expiryReport.critical.push(entry);
      } else if (status.severity === 'warning') {
        expiryReport.warning.push(entry);
      } else if (status.severity === 'info') {
        expiryReport.upcoming.push(entry);
      } else {
        expiryReport.valid.push(entry);
      }
    });
  });

  // Sort by urgency
  expiryReport.critical.sort((a, b) => b.daysOverdue - a.daysOverdue);
  expiryReport.warning.sort((a, b) => a.daysRemaining - b.daysRemaining);
  expiryReport.upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    ...expiryReport,
    totalIssues: expiryReport.critical.length + expiryReport.warning.length,
    requiresAction: expiryReport.critical.length > 0 || expiryReport.warning.length > 0,
    dashboardBadge: expiryReport.critical.length + expiryReport.warning.length
  };
};

// Get status color classes for UI
export const getExpiryStatusColor = (severity: SeverityLevel): string => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 border-red-500 text-red-700';
    case 'warning':
      return 'bg-yellow-100 border-yellow-500 text-yellow-700';
    case 'info':
      return 'bg-blue-100 border-blue-500 text-blue-700';
    case 'ok':
      return 'bg-green-100 border-green-500 text-green-700';
    default:
      return 'bg-gray-100 border-gray-500 text-gray-700';
  }
};

// Get status icon name
export const getExpiryStatusIcon = (severity: SeverityLevel): string => {
  switch (severity) {
    case 'critical':
      return 'AlertTriangle';
    case 'warning':
      return 'AlertCircle';
    case 'info':
      return 'Info';
    case 'ok':
      return 'CheckCircle';
    default:
      return 'Circle';
  }
};