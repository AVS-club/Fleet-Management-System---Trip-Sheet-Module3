// Indian-specific validation utilities

// Indian License Format: MH12 20080001234
// First 2 letters: State code, Next 2 digits: RTO code
// Next 4 digits: Year of issue, Last 7 digits: Unique number
const INDIAN_LICENSE_PATTERN = /^[A-Z]{2}[0-9]{2}\s?[0-9]{4}[0-9]{7}$/;

// Indian Mobile: Must start with 6-9 and have 10 digits total
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

// Aadhar: Exactly 12 digits
const AADHAR_PATTERN = /^\d{12}$/;

// PAN Card: 5 letters, 4 digits, 1 letter
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Vehicle Registration: MH12AB1234 or MH12A1234
const VEHICLE_REG_PATTERN = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;

// RTO State Codes
export const RTO_STATE_CODES: Record<string, string> = {
  'AN': 'Andaman and Nicobar Islands',
  'AP': 'Andhra Pradesh',
  'AR': 'Arunachal Pradesh',
  'AS': 'Assam',
  'BR': 'Bihar',
  'CH': 'Chandigarh',
  'CG': 'Chhattisgarh',
  'DD': 'Daman and Diu',
  'DL': 'Delhi',
  'GA': 'Goa',
  'GJ': 'Gujarat',
  'HR': 'Haryana',
  'HP': 'Himachal Pradesh',
  'JK': 'Jammu and Kashmir',
  'JH': 'Jharkhand',
  'KA': 'Karnataka',
  'KL': 'Kerala',
  'LD': 'Lakshadweep',
  'MP': 'Madhya Pradesh',
  'MH': 'Maharashtra',
  'MN': 'Manipur',
  'ML': 'Meghalaya',
  'MZ': 'Mizoram',
  'NL': 'Nagaland',
  'OD': 'Odisha',
  'PY': 'Puducherry',
  'PB': 'Punjab',
  'RJ': 'Rajasthan',
  'SK': 'Sikkim',
  'TN': 'Tamil Nadu',
  'TS': 'Telangana',
  'TR': 'Tripura',
  'UP': 'Uttar Pradesh',
  'UK': 'Uttarakhand',
  'WB': 'West Bengal'
};

// Vehicle Type Authorization Matrix
export const VEHICLE_AUTHORIZATION: Record<string, string[]> = {
  truck: ['HMV', 'HGMV', 'HTV'], // Heavy Motor Vehicle required
  tempo: ['LMV', 'HMV'],         // Light or Heavy Motor Vehicle
  trailer: ['HTV', 'HGMV'],      // Heavy Transport Vehicle required
  tanker: ['HTV', 'HGMV', 'TRANS'], // Special transport license
  bus: ['HPMV', 'PSV'],          // Passenger vehicle license
  car: ['LMV'],                  // Light Motor Vehicle
  auto: ['LMV', 'TRANS'],        // Auto rickshaw license
};

// License Types and Descriptions
export const LICENSE_TYPES: Record<string, string> = {
  'MCWG': 'Motorcycle Without Gear',
  'MCW/G': 'Motorcycle With Gear',
  'LMV': 'Light Motor Vehicle',
  'HMV': 'Heavy Motor Vehicle',
  'HGMV': 'Heavy Goods Motor Vehicle',
  'HTV': 'Heavy Transport Vehicle',
  'HPMV': 'Heavy Passenger Motor Vehicle',
  'PSV': 'Public Service Vehicle',
  'TRANS': 'Transport Vehicle'
};

// Validation Functions
export const validateIndianLicense = (license: string): boolean => {
  if (!license) return false;
  const normalized = license.replace(/\s/g, '').toUpperCase();
  return INDIAN_LICENSE_PATTERN.test(normalized);
};

export const validateIndianMobile = (mobile: string): boolean => {
  if (!mobile) return false;
  const cleaned = mobile.replace(/[\s-]/g, '').replace(/^(\+91|91)/, '');
  return INDIAN_MOBILE_PATTERN.test(cleaned);
};

export const validateAadhar = (aadhar: string): boolean => {
  if (!aadhar) return false;
  const cleaned = aadhar.replace(/\s/g, '');
  return AADHAR_PATTERN.test(cleaned);
};

export const validatePAN = (pan: string): boolean => {
  if (!pan) return false;
  return PAN_PATTERN.test(pan.toUpperCase());
};

export const validateVehicleRegistration = (regNumber: string): boolean => {
  if (!regNumber) return false;
  const cleaned = regNumber.replace(/[\s-]/g, '').toUpperCase();
  return VEHICLE_REG_PATTERN.test(cleaned);
};

// Parse License Number
export const parseLicenseNumber = (license: string) => {
  if (!validateIndianLicense(license)) {
    return null;
  }
  
  const cleaned = license.replace(/\s/g, '').toUpperCase();
  const stateCode = cleaned.substring(0, 2);
  const rtoCode = cleaned.substring(2, 4);
  const year = cleaned.substring(4, 8);
  const uniqueNumber = cleaned.substring(8);
  
  return {
    stateCode,
    rtoCode: `${stateCode}${rtoCode}`,
    year,
    uniqueNumber,
    state: RTO_STATE_CODES[stateCode] || 'Unknown'
  };
};

// Parse Vehicle Registration
export const parseVehicleRegistration = (regNumber: string) => {
  if (!validateVehicleRegistration(regNumber)) {
    return null;
  }
  
  const cleaned = regNumber.replace(/[\s-]/g, '').toUpperCase();
  const stateCode = cleaned.substring(0, 2);
  const rtoCode = cleaned.substring(2, 4);
  const series = cleaned.match(/[A-Z]{1,2}/g)?.[1] || '';
  const number = cleaned.match(/[0-9]{4}$/)?.[0] || '';
  
  return {
    stateCode,
    rtoCode: `${stateCode}${rtoCode}`,
    series,
    number,
    state: RTO_STATE_CODES[stateCode] || 'Unknown',
    formatted: `${stateCode}${rtoCode} ${series}${number}`
  };
};

// Check if driver can drive vehicle type
export const canDriveVehicleType = (
  driverLicenses: string[], 
  vehicleType: string
): { authorized: boolean; missingLicenses: string[]; message: string } => {
  const requiredLicenses = VEHICLE_AUTHORIZATION[vehicleType.toLowerCase()] || [];
  
  if (requiredLicenses.length === 0) {
    return {
      authorized: true,
      missingLicenses: [],
      message: 'No specific license required'
    };
  }
  
  const hasLicense = requiredLicenses.some(lic => 
    driverLicenses.some(dl => dl.toUpperCase().includes(lic))
  );
  
  const missingLicenses = requiredLicenses.filter(lic => 
    !driverLicenses.some(dl => dl.toUpperCase().includes(lic))
  );
  
  return {
    authorized: hasLicense,
    missingLicenses,
    message: hasLicense 
      ? 'Driver is authorized for this vehicle type'
      : `Driver needs ${requiredLicenses.join(' or ')} license for ${vehicleType}`
  };
};

// Format phone number for display
export const formatIndianMobile = (mobile: string): string => {
  const cleaned = mobile.replace(/[\s-]/g, '').replace(/^(\+91|91)/, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  }
  return mobile;
};

// Format Aadhar for display (XXXX XXXX XXXX)
export const formatAadhar = (aadhar: string): string => {
  const cleaned = aadhar.replace(/\s/g, '');
  if (cleaned.length === 12) {
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 8)} ${cleaned.substring(8)}`;
  }
  return aadhar;
};