// Complete list of 15 high-impact fleet parts with business metrics
export const FLEET_PARTS_DEFINITIONS = [
  // CRITICAL SAFETY PARTS
  {
    id: 'tyres_front',
    name: 'Front Tyres',
    icon: '🛞',
    category: 'Safety Critical',
    standardLifeKm: 60000,
    standardLifeDays: 730,
    criticalThreshold: 10000,
    avgCost: 7000,
    downTimeHours: 4,
    businessImpact: 'Steering control, Fuel economy -10%',
    complianceRisk: 'Insurance void if worn',
    revenueLossPerDay: 5000
  },
  {
    id: 'tyres_rear',
    name: 'Rear Tyres',
    icon: '🛞',
    category: 'Safety Critical',
    standardLifeKm: 60000,
    standardLifeDays: 730,
    criticalThreshold: 10000,
    avgCost: 7000,
    downTimeHours: 4,
    businessImpact: 'Load bearing, Blowout risk',
    complianceRisk: 'Overloading penalties',
    revenueLossPerDay: 5000
  },
  {
    id: 'brake_pads',
    name: 'Brake Pads',
    icon: '🛑',
    category: 'Safety Critical',
    standardLifeKm: 40000,
    standardLifeDays: 365,
    criticalThreshold: 5000,
    avgCost: 3000,
    downTimeHours: 3,
    businessImpact: 'Stopping distance +40%',
    complianceRisk: 'Safety audit failure',
    revenueLossPerDay: 5000
  },
  {
    id: 'brake_discs',
    name: 'Brake Discs/Drums',
    icon: '🔘',
    category: 'Safety Critical',
    standardLifeKm: 80000,
    standardLifeDays: 730,
    criticalThreshold: 10000,
    avgCost: 6000,
    downTimeHours: 6,
    businessImpact: 'Complete brake failure risk',
    complianceRisk: 'Vehicle fitness rejection',
    revenueLossPerDay: 5000
  },

  // POWERTRAIN
  {
    id: 'clutch_plate',
    name: 'Clutch Plate',
    icon: '⚙️',
    category: 'Powertrain',
    standardLifeKm: 80000,
    standardLifeDays: 1095,
    criticalThreshold: 10000,
    avgCost: 15000,
    downTimeHours: 24,
    businessImpact: 'Vehicle immobilized',
    complianceRisk: 'Route permit violations',
    revenueLossPerDay: 8000
  },
  {
    id: 'air_filter',
    name: 'Air Filter',
    icon: '💨',
    category: 'Engine',
    standardLifeKm: 20000,
    standardLifeDays: 180,
    criticalThreshold: 3000,
    avgCost: 750,
    downTimeHours: 1,
    businessImpact: 'Fuel efficiency -15%, Power -20%',
    complianceRisk: 'Emission norms violation',
    revenueLossPerDay: 1500
  },
  {
    id: 'fuel_injectors',
    name: 'Fuel Injectors',
    icon: '⛽',
    category: 'Engine',
    standardLifeKm: 100000,
    standardLifeDays: 1460,
    criticalThreshold: 15000,
    avgCost: 4000,
    downTimeHours: 8,
    businessImpact: 'Fuel waste ₹500/day',
    complianceRisk: 'BS-VI compliance',
    revenueLossPerDay: 3000
  },

  // ELECTRICAL
  {
    id: 'battery',
    name: 'Battery',
    icon: '🔋',
    category: 'Electrical',
    standardLifeKm: 0,
    standardLifeDays: 1095,
    criticalThreshold: 180,
    avgCost: 6500,
    downTimeHours: 2,
    businessImpact: 'No-start, Stranded vehicle',
    complianceRisk: 'GPS/FASTag failure',
    revenueLossPerDay: 5000
  },
  {
    id: 'alternator',
    name: 'Alternator',
    icon: '⚡',
    category: 'Electrical',
    standardLifeKm: 120000,
    standardLifeDays: 1825,
    criticalThreshold: 15000,
    avgCost: 10000,
    downTimeHours: 6,
    businessImpact: 'Complete electrical failure',
    complianceRisk: 'Night driving prohibited',
    revenueLossPerDay: 5000
  },

  // SUSPENSION
  {
    id: 'leaf_springs',
    name: 'Leaf Springs',
    icon: '🔩',
    category: 'Suspension',
    standardLifeKm: 120000,
    standardLifeDays: 1460,
    criticalThreshold: 20000,
    avgCost: 12000,
    downTimeHours: 12,
    businessImpact: 'Load capacity -30%',
    complianceRisk: 'Overloading risk',
    revenueLossPerDay: 6000
  },
  {
    id: 'shock_absorbers',
    name: 'Shock Absorbers',
    icon: '🌊',
    category: 'Suspension',
    standardLifeKm: 80000,
    standardLifeDays: 1095,
    criticalThreshold: 10000,
    avgCost: 7000,
    downTimeHours: 6,
    businessImpact: 'Cargo damage, Driver fatigue',
    complianceRisk: 'Cargo insurance claims',
    revenueLossPerDay: 4000
  },

  // COOLING
  {
    id: 'radiator',
    name: 'Radiator',
    icon: '🌡️',
    category: 'Cooling',
    standardLifeKm: 150000,
    standardLifeDays: 1825,
    criticalThreshold: 20000,
    avgCost: 10000,
    downTimeHours: 8,
    businessImpact: 'Engine seizure risk',
    complianceRisk: 'Major repair costs',
    revenueLossPerDay: 5000
  },

  // DRIVETRAIN
  {
    id: 'wheel_bearings',
    name: 'Wheel Bearings',
    icon: '⭕',
    category: 'Drivetrain',
    standardLifeKm: 80000,
    standardLifeDays: 1095,
    criticalThreshold: 10000,
    avgCost: 4000,
    downTimeHours: 5,
    businessImpact: 'Wheel lock, Accident risk',
    complianceRisk: 'Safety audit failure',
    revenueLossPerDay: 5000
  },
  {
    id: 'propeller_shaft',
    name: 'Propeller Shaft',
    icon: '🔧',
    category: 'Drivetrain',
    standardLifeKm: 100000,
    standardLifeDays: 1460,
    criticalThreshold: 15000,
    avgCost: 6500,
    downTimeHours: 10,
    businessImpact: 'Power transmission failure',
    complianceRisk: 'Vehicle breakdown',
    revenueLossPerDay: 6000
  },

  // EMISSION
  {
    id: 'dpf_filter',
    name: 'DPF/Catalytic Converter',
    icon: '💨',
    category: 'Emission',
    standardLifeKm: 200000,
    standardLifeDays: 2190,
    criticalThreshold: 30000,
    avgCost: 25000,
    downTimeHours: 12,
    businessImpact: 'Engine derate, Power loss',
    complianceRisk: 'BS-VI violation ₹10,000 fine',
    revenueLossPerDay: 7000
  }
];

// Helper function to get part by ID
export const getPartById = (id: string) => {
  return FLEET_PARTS_DEFINITIONS.find(part => part.id === id);
};

// Helper function to get parts by category
export const getPartsByCategory = (category: string) => {
  return FLEET_PARTS_DEFINITIONS.filter(part => part.category === category);
};

// Helper function to get all categories
export const getAllCategories = () => {
  return [...new Set(FLEET_PARTS_DEFINITIONS.map(part => part.category))];
};
