// Bolt Prompt: Generate and insert 200 realistic trip records for vehicle MH12AV1001
// - Vehicle: Tata 1109 (6-wheeler), Diesel, avg mileage: ~7.5 kmpl
// - Period: From 2024-05-05 to today (leave 4-5 random multi-day gaps per month for maintenance)
// - Refueling: Every 4 to 6 trips
// - Warehouses: Nagpur Central, Raipur Depot, Durg Logistics, Bhilai Dispatch Yard, Bilaspur Hub
// - Destinations: Only within ~600 km range (e.g., Raipur, Indore, Mumbai, Hyderabad, Nashik)
// - Use city load labels like: Paint Drums, Powder Bags, Plastic Buckets
// - Add minor variation to KM, weight, expense, and fuel amount
// - Use realistic odometer growth (start around 143,500 km and end accordingly)

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const warehouses = [
  "Nagpur Central",
  "Raipur Depot",
  "Durg Logistics",
  "Bhilai Dispatch Yard",
  "Bilaspur Hub"
];

const destinations = [
  "Raipur",
  "Mumbai",
  "Hyderabad",
  "Indore",
  "Nashik"
];

const materials = ["Paint Drums", "Powder Bags", "Plastic Buckets"];

const startOdometer = 143500;
const totalTrips = 200;
const trips = [];
let currentKm = startOdometer;
const today = new Date();
const tripStartDate = new Date("2024-05-05");

for (let i = 0; i < totalTrips; i++) {
  // Skip 4-5 random blocks for maintenance
  if (i % 40 === 0) {
    tripStartDate.setDate(tripStartDate.getDate() + 3); // Maintenance window
  }

  const tripDays = Math.floor(Math.random() * 2) + 1; // 1-2 day trips
  const startDate = new Date(tripStartDate);
  const endDate = new Date(tripStartDate);
  endDate.setDate(startDate.getDate() + tripDays);

  const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
  const destination = destinations[Math.floor(Math.random() * destinations.length)];
  const material = materials[Math.floor(Math.random() * materials.length)];
  const loadWeight = Math.floor(Math.random() * 800) + 2000; // 2000–2800 kg
  const distance = Math.floor(Math.random() * 150) + 400; // 400–550 km
  const fuelUsed = distance / (7 + Math.random());
  const refuelingTrip = i % Math.floor(Math.random() * 3 + 4) === 0;

  const trip = {
    vehicle_number: "MH12AV1001",
    driver_name: "Ravi Yadav",
    origin: warehouse,
    destinations: [destination],
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    start_km: currentKm,
    end_km: currentKm + distance,
    gross_weight_kg: loadWeight,
    luggage_type: material,
    city_load: destination,
    remarks: "Routine trip",
    refueling_trip: refuelingTrip,
    refueled_liters: refuelingTrip ? Number((fuelUsed + Math.random() * 5).toFixed(2)) : 0,
    fuel_amount: refuelingTrip ? Number((fuelUsed * 96 + Math.random() * 100).toFixed(2)) : 0,
    expenses: {
      unloading: Math.floor(Math.random() * 300) + 300,
      driver_bata: Math.floor(Math.random() * 200) + 400,
      rto: Math.random() > 0.85 ? 250 : 0,
      breakdown: Math.random() > 0.95 ? 500 : 0
    }
  };

  currentKm += distance;
  tripStartDate.setDate(tripStartDate.getDate() + tripDays + 1);
  trips.push(trip);
}

async function seedTrips() {
  for (const trip of trips) {
    const { error } = await supabase.from("trips").insert([trip]);
    if (error) console.error("Trip insert error:", error);
  }
  console.log("✅ 200 Trips seeded for MH12AV1001");
}

seedTrips();
