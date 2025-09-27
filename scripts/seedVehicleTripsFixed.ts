// scripts/seedVehicleTripsFixed.ts
import { supabase } from '../src/utils/supabaseClient';

const seedVehicleTrips = async () => {
  try {
    console.log('🌱 Starting trip data seeding with correct table structure...');
    
    // Get a vehicle to add trips to
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number')
      .limit(1);
    
    if (!vehicles || vehicles.length === 0) {
      console.error('❌ No vehicles found. Please create a vehicle first.');
      return;
    }

    const vehicle = vehicles[0];
    console.log('🚛 Adding trips for vehicle:', vehicle.registration_number);

    // Get drivers
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id, name')
      .limit(3);

    // Get warehouses
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id, name')
      .limit(2);

    if (!drivers?.length || !warehouses?.length) {
      console.error('❌ Need drivers and warehouses to create trips. Please create them first.');
      return;
    }

    console.log('👥 Found drivers:', drivers.map(d => d.name));
    console.log('🏢 Found warehouses:', warehouses.map(w => w.name));

    // Sample destinations
    const destinations = [
      'Bhilai Steel Plant',
      'Raipur Railway Station',
      'Bilaspur Depot',
      'Durg Industrial Area',
      'Rajnandgaon Warehouse',
      'Korba Power Plant',
      'Ambikapur Market',
      'Jagdalpur Depot'
    ];

    // Create 10 sample trips
    const trips = [];
    let currentOdometer = 50000; // Starting odometer

    for (let i = 0; i < 10; i++) {
      const tripDate = new Date();
      tripDate.setDate(tripDate.getDate() - (i * 3)); // Each trip 3 days apart
      
      const distance = Math.floor(Math.random() * 300) + 100; // 100-400 km
      const fuelUsed = distance / (15 + Math.random() * 10); // 15-25 KMPL
      const fuelCost = Math.round(fuelUsed * 95); // ₹95 per liter
      const revenue = Math.floor(Math.random() * 10000) + 5000; // ₹5000-15000
      const expenses = Math.floor(Math.random() * 3000) + 2000; // ₹2000-5000
      const profit = revenue - expenses - fuelCost;
      
      // Select random destinations
      const numDestinations = Math.floor(Math.random() * 2) + 1; // 1-2 destinations
      const selectedDestinations = [];
      for (let j = 0; j < numDestinations; j++) {
        const dest = destinations[Math.floor(Math.random() * destinations.length)];
        if (!selectedDestinations.includes(dest)) {
          selectedDestinations.push(dest);
        }
      }
      
      const trip = {
        trip_serial_number: `TRIP-${Date.now()}-${i}`,
        vehicle_id: vehicle.id,
        driver_id: drivers[i % drivers.length].id,
        warehouse_id: warehouses[i % warehouses.length].id,
        destinations: selectedDestinations.map((_, idx) => `dest-${idx + 1}`), // Simple destination IDs
        destination_names: selectedDestinations,
        trip_start_date: tripDate.toISOString().split('T')[0],
        trip_end_date: tripDate.toISOString().split('T')[0],
        trip_duration: Math.floor(Math.random() * 12) + 8, // 8-20 hours
        start_km: currentOdometer,
        end_km: currentOdometer + distance,
        gross_weight: Math.floor(Math.random() * 5000) + 1000, // 1000-6000 kg
        fuel_quantity: parseFloat(fuelUsed.toFixed(2)),
        fuel_cost: fuelCost,
        calculated_kmpl: parseFloat((distance / fuelUsed).toFixed(2)),
        income_amount: revenue,
        total_expense: expenses,
        net_profit: profit,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };
      
      trips.push(trip);
      currentOdometer += distance;
    }

    console.log('📝 Creating trips...');

    // Insert trips
    const { data: insertedTrips, error: tripError } = await supabase
      .from('trips')
      .insert(trips)
      .select();

    if (tripError) {
      console.error('❌ Error inserting trips:', tripError);
      return;
    }

    console.log(`✅ Created ${insertedTrips.length} trips`);

    console.log('🎉 Successfully seeded trip data!');
    console.log('📊 Summary:');
    console.log(`   - Vehicle: ${vehicle.registration_number}`);
    console.log(`   - Trips created: ${insertedTrips.length}`);
    console.log(`   - Destinations: ${destinations.length} unique locations`);
    console.log(`   - Date range: ${trips[trips.length - 1].trip_start_date} to ${trips[0].trip_start_date}`);
    console.log(`   - Total distance: ${trips.reduce((sum, t) => sum + (t.end_km - t.start_km), 0)} km`);
    console.log(`   - Total revenue: ₹${trips.reduce((sum, t) => sum + t.income_amount, 0).toLocaleString()}`);
    console.log(`   - Total profit: ₹${trips.reduce((sum, t) => sum + t.net_profit, 0).toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
};

// Run the seed script
seedVehicleTrips();
