/**
 * Comprehensive vehicle label formatter for Indian market
 * Handles all major Indian vehicle manufacturers and their complex naming patterns
 */

// Common corporate suffixes and redundant terms in Indian vehicle names
const CORPORATE_SUFFIXES = [
  // English terms
  'Limited', 'Ltd', 'Ltd.', 'LTD',
  'Private', 'Pvt', 'Pvt.', 'PVT',
  'LLP', 'LLC', 'Inc', 'Inc.', 
  'Corporation', 'Corp', 'Corp.',
  'Industries', 'Motors', 'Motor',
  'Commercial', 'Unit', 'Company', 'Co.',
  
  // Indian specific
  'India', 'Bharat', 'Hindustan',
  'Udyog', 'Automobiles', 'Automotive',
  'Vehicles', 'Transport', 'Carriers'
];

// Indian vehicle manufacturer name mappings
const MANUFACTURER_MAPPINGS: Record<string, string> = {
  // Ashok Leyland variations
  'Ashok Leyland Limited': 'Ashok Leyland',
  'Ashok Leyland Ltd': 'Ashok Leyland',
  'ASHOK LEYLAND LIMITED': 'Ashok Leyland',
  'Ashok Leyland Limited Indra': 'Ashok Leyland Indra',
  
  // Tata variations
  'Tata Motors Limited': 'Tata Motors',
  'TATA MOTORS LIMITED': 'Tata Motors',
  'Tata Motors Commercial Vehicles': 'Tata',
  
  // Mahindra variations
  'Mahindra & Mahindra Ltd': 'Mahindra',
  'Mahindra and Mahindra Limited': 'Mahindra',
  'M&M Limited': 'Mahindra',
  
  // Eicher variations
  'VE Commercial Vehicles Limited': 'Eicher',
  'Eicher Motors Limited': 'Eicher',
  'Volvo Eicher Commercial Vehicles': 'Eicher',
  
  // Force variations
  'Force Motors Limited': 'Force Motors',
  'Force Motors Ltd': 'Force',
  
  // Bharat Benz
  'Daimler India Commercial Vehicles': 'BharatBenz',
  'BharatBenz Daimler': 'BharatBenz',
  
  // Maruti variations
  'Maruti Suzuki India Limited': 'Maruti Suzuki',
  'Maruti Udyog Limited': 'Maruti',
};

// Model-specific redundant words to remove
const REDUNDANT_MODEL_WORDS = [
  'Gold', 'Silver', 'Platinum', 'Diamond',
  'Plus', 'Pro', 'Max', 'Ultra', 'Super',
  'Edition', 'Special', 'Limited',
  'New', 'Latest', 'Advanced',
  'Commercial', 'Cargo', 'Carrier'
];

/**
 * Format vehicle label for display
 * @param registration Vehicle registration number
 * @param makeModel Full make and model string from database
 * @returns Formatted compact label
 */
export const formatVehicleLabel = (
  registration: string, 
  makeModel?: string
): string => {
  if (!makeModel) return registration;
  
  // Check if it's a known manufacturer mapping
  for (const [fullName, shortName] of Object.entries(MANUFACTURER_MAPPINGS)) {
    if (makeModel.includes(fullName)) {
      makeModel = makeModel.replace(fullName, shortName);
      break;
    }
  }
  
  // Remove corporate suffixes
  let cleaned = makeModel;
  CORPORATE_SUFFIXES.forEach(suffix => {
    const regex = new RegExp(`\\b${suffix}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  // Split into words and process
  let words = cleaned.split(/\s+/).filter(word => word.length > 0);
  
  // Remove redundant model words from the end
  words = words.filter(word => 
    !REDUNDANT_MODEL_WORDS.includes(word) || 
    words.indexOf(word) < 2 // Keep if it's in the first 2 words
  );
  
  // Limit to first 3 meaningful words
  words = words.slice(0, 3);
  
  // Remove duplicate adjacent words
  words = words.filter((word, index) => 
    index === 0 || word.toLowerCase() !== words[index - 1].toLowerCase()
  );
  
  const shortMake = words.join(' ').trim();
  
  return `${registration} — ${shortMake}`;
};

/**
 * Get smart vendor suggestions based on task and location
 */
interface VendorSuggestion {
  vendorId: string;
  name: string;
  location: string;
  specialization?: string[];
  distance?: number;
  recentlyUsed?: boolean;
  avgCost?: number;
  rating?: number;
}

export const getSmartVendorSuggestions = (
  taskIds: string[],
  allVendors: any[],
  recentHistory: Map<string, { vendorId: string; count: number }[]>,
  userLocation: string = 'Raipur'
): VendorSuggestion[] => {
  // Priority cities for central India
  const priorityLocations = {
    'Raipur': 0,      // Primary
    'Bilaspur': 50,   // 50km away
    'Sambalpur': 100, // 100km away
    'Bhilai': 30,     // 30km away
    'Durg': 35,       // 35km away
    'Korba': 150,     // 150km away
  };
  
  // Task category mappings for specialization
  const taskCategories: Record<string, string[]> = {
    'tyres': ['tyre', 'wheel', 'alignment', 'balancing'],
    'battery': ['battery', 'electrical', 'alternator'],
    'engine': ['engine', 'oil', 'filter', 'service'],
    'brakes': ['brake', 'disc', 'pad', 'drum'],
    'body': ['denting', 'painting', 'body', 'accident'],
  };
  
  // Determine task categories from selected tasks
  const selectedCategories = new Set<string>();
  taskIds.forEach(taskId => {
    Object.entries(taskCategories).forEach(([category, keywords]) => {
      if (keywords.some(keyword => taskId.toLowerCase().includes(keyword))) {
        selectedCategories.add(category);
      }
    });
  });
  
  // Score each vendor
  const scoredVendors = allVendors.map(vendor => {
    let score = 0;
    const suggestion: VendorSuggestion = {
      vendorId: vendor.id,
      name: vendor.name,
      location: vendor.address || 'Unknown',
      specialization: vendor.specialization || [],
    };
    
    // Location scoring (highest priority)
    const vendorLocation = vendor.address?.toLowerCase() || '';
    Object.entries(priorityLocations).forEach(([city, distance]) => {
      if (vendorLocation.includes(city.toLowerCase())) {
        score += 1000 - (distance * 5); // Closer = higher score
        suggestion.distance = distance;
      }
    });
    
    // Recent usage scoring
    taskIds.forEach(taskId => {
      const history = recentHistory.get(taskId) || [];
      const vendorHistory = history.find(h => h.vendorId === vendor.id);
      if (vendorHistory) {
        score += 500 * vendorHistory.count; // More usage = higher score
        suggestion.recentlyUsed = true;
      }
    });
    
    // Specialization scoring
    if (vendor.specialization && Array.isArray(vendor.specialization)) {
      selectedCategories.forEach(category => {
        if (vendor.specialization.includes(category)) {
          score += 300;
        }
      });
    }
    
    // Rating scoring
    if (vendor.rating) {
      score += vendor.rating * 50;
      suggestion.rating = vendor.rating;
    }
    
    // Average cost (prefer mid-range, not cheapest or most expensive)
    if (vendor.avgCost) {
      suggestion.avgCost = vendor.avgCost;
    }
    
    // Active vendor bonus
    if (vendor.active !== false) {
      score += 100;
    }
    
    return { ...suggestion, score };
  });
  
  // Sort by score and return top 3
  return scoredVendors
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, ...vendor }) => vendor);
};

/**
 * Format Indian currency with proper grouping
 */
export const formatIndianCurrency = (amount: number): string => {
  if (!amount || amount === 0) return '₹0';
  
  // Indian number system: ##,##,###
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(amount);
};

/**
 * Parse Indian currency string to number
 */
export const parseIndianCurrency = (value: string): number => {
  // Remove all non-numeric characters except decimal point
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
};

/**
 * Get estimated cost for maintenance tasks
 */
export const getEstimatedCost = (taskIds: string[]): number => {
  const taskCosts: Record<string, number> = {
    // Engine & Oil
    'engine_oil_change': 3000,
    'engine_filter': 800,
    'air_filter': 500,
    
    // Brakes
    'brake_pad_front': 2500,
    'brake_pad_rear': 2000,
    'brake_disc': 4500,
    
    // Tyres
    'tyre_rotation': 500,
    'tyre_replacement': 8000,
    'wheel_alignment': 1200,
    'wheel_balancing': 800,
    
    // Battery
    'battery_replacement': 6000,
    'battery_water': 100,
    
    // Body & Paint
    'denting': 3000,
    'painting': 5000,
    'full_body_polish': 2000,
    
    // General
    'general_service': 5000,
    'major_service': 12000,
  };
  
  return taskIds.reduce((total, taskId) => {
    return total + (taskCosts[taskId] || 2000); // Default 2000 if not found
  }, 0);
};
