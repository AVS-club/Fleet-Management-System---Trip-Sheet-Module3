export const vehicleColors = {
  status: {
    active: 'bg-green-100 text-green-700 border-green-200',
    maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    inactive: 'bg-gray-100 text-gray-700 border-gray-200',
    breakdown: 'bg-red-100 text-red-700 border-red-200'
  },
  
  documents: {
    valid: 'bg-green-50 border-green-200',
    expiringSoon: 'bg-yellow-50 border-yellow-200',
    expired: 'bg-red-50 border-red-200',
    missing: 'bg-gray-50 border-gray-200'
  },
  
  mileage: {
    excellent: 'text-green-600 bg-green-50',
    good: 'text-blue-600 bg-blue-50',
    average: 'text-yellow-600 bg-yellow-50',
    poor: 'text-red-600 bg-red-50'
  },
  
  icons: {
    vehicle: 'text-primary-500',
    driver: 'text-blue-500',
    fuel: 'text-green-500',
    route: 'text-purple-500',
    maintenance: 'text-orange-500',
    document: 'text-indigo-500'
  },

  cards: {
    registration: 'bg-blue-50 border-blue-100',
    vehicle: 'bg-purple-50 border-purple-100',
    fuel: 'bg-green-50 border-green-100',
    owner: 'bg-orange-50 border-orange-100',
    technical: 'bg-gray-50 border-gray-100'
  },

  tripHeaders: {
    recent: 'from-green-400 to-green-500',
    second: 'from-blue-400 to-blue-500',
    third: 'from-purple-400 to-purple-500',
    default: 'from-gray-400 to-gray-500'
  }
};

export const getMileageColor = (mileage: number, avg: number) => {
  if (!mileage) return 'gray';
  const percentage = (mileage / avg) * 100;
  if (percentage >= 110) return 'excellent';
  if (percentage >= 90) return 'good';
  if (percentage >= 70) return 'average';
  return 'poor';
};

export const getMileageBadge = (mileage: number, avg: number) => {
  const color = getMileageColor(mileage, avg);
  const colorClasses = {
    excellent: 'bg-green-100 text-green-700 border-green-200',
    good: 'bg-blue-100 text-blue-700 border-blue-200',
    average: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    poor: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200'
  };
  
  return colorClasses[color] || colorClasses.gray;
};
