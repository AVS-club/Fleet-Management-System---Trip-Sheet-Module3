const [showFilters, setShowFilters] = useState(false);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Handle cloned trip data from location state
  const [clonedTripData, setClonedTripData] = useState<Partial<TripFormData> | null>(null);