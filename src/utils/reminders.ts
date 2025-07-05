import { supabase } from './supabaseClient';
import { differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { Vehicle, Driver } from '../types';
import { MaintenanceTask } from '../types/maintenance';
import { Trip } from '../types';

// Define the reminder status types
type ReminderStatus = 'critical' | 'warning' | 'normal';

// Define the reminder item interface
export interface ReminderItem {
  id: string;
  title: string;
  entityId: string;
  entityName: string;
  dueDate?: string;
  daysLeft?: number;
  status: ReminderStatus;
  link: string;
  type: string;
  module: ReminderModule;
}

// Define the module types
type ReminderModule = 'vehicles' | 'drivers' | 'maintenance' | 'trips';

/**
 * Get reminders for a specific module
 * @param module The module to get reminders for
 * @returns A promise that resolves to an array of reminder items
 */
const getRemindersFor = async (module: ReminderModule): Promise<ReminderItem[]> => {
  switch (module) {
    case 'vehicles':
      return getRemindersForVehicles();
    case 'drivers':
      return getRemindersForDrivers();
    case 'maintenance':
      return getRemindersForMaintenance();
    case 'trips':
      return getRemindersForTrips();
    default:
      return [];
  }
};

/**
 * Get combined reminders from all modules
 * @returns A promise that resolves to an array of reminder items from all modules
 */
export const getRemindersForAll = async (): Promise<ReminderItem[]> => {
  try {
    const [vehicleReminders, driverReminders, maintenanceReminders, tripReminders] = await Promise.all([
      getRemindersForVehicles(),
      getRemindersForDrivers(),
      getRemindersForMaintenance(),
      getRemindersForTrips()
    ]);
    
    // Combine all reminders and sort by dueDate first, then by daysLeft
    return [...vehicleReminders, ...driverReminders, ...maintenanceReminders, ...tripReminders]
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return (a.daysLeft || Infinity) - (b.daysLeft || Infinity);
      });
  } catch (error) {
    console.error('Error in getRemindersForAll:', error);
    return [];
  }
};

/**
 * Get vehicle reminders
 * @returns A promise that resolves to an array of vehicle reminder items
 */
const getRemindersForVehicles = async (): Promise<ReminderItem[]> => {
  try {
    // Fetch vehicles from Supabase
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .not('status', 'eq', 'archived');

    if (error) {
      console.error('Error fetching vehicles for reminders:', error);
      return [];
    }

    if (!vehicles || vehicles.length === 0) {
      return [];
    }

    const reminders: ReminderItem[] = [];
    const today = new Date();

    // Process each vehicle for reminders
    vehicles.forEach((vehicle: Vehicle) => {
      // Check RC expiry
      if (vehicle.rc_expiry_date) {
        const expiryDate = new Date(vehicle.rc_expiry_date);
        if (isAfter(expiryDate, today)) {
          const daysLeft = differenceInDays(expiryDate, today);
          if (daysLeft <= 30) {
            reminders.push({
              id: `rc-${vehicle.id}-${vehicle.rc_expiry_date}`,
              title: `RC Expiring in ${daysLeft} days`,
              entityId: vehicle.id,
              entityName: vehicle.registration_number,
              dueDate: vehicle.rc_expiry_date,
              daysLeft,
              status: getStatusFromDays(daysLeft),
              link: `/vehicles/${vehicle.id}`,
              type: 'rc_expiry',
              module: 'vehicles'
            });
          }
        } else {
          // Already expired
          reminders.push({
            id: `rc-${vehicle.id}-${vehicle.rc_expiry_date}`,
            title: 'RC Expired',
            entityId: vehicle.id,
            entityName: vehicle.registration_number,
            dueDate: vehicle.rc_expiry_date,
            daysLeft: 0,
            status: 'critical',
            link: `/vehicles/${vehicle.id}`,
            type: 'rc_expiry',
            module: 'vehicles'
          });
        }
      }

      // Check Insurance expiry
      if (vehicle.insurance_expiry_date) {
        const expiryDate = new Date(vehicle.insurance_expiry_date);
        if (isAfter(expiryDate, today)) {
          const daysLeft = differenceInDays(expiryDate, today);
          if (daysLeft <= 30) {
            reminders.push({
              id: `insurance-${vehicle.id}-${vehicle.insurance_expiry_date}`,
              title: `Insurance Expiring in ${daysLeft} days`,
              entityId: vehicle.id,
              entityName: vehicle.registration_number,
              dueDate: vehicle.insurance_expiry_date,
              daysLeft,
              status: getStatusFromDays(daysLeft),
              link: `/vehicles/${vehicle.id}`,
              type: 'insurance_expiry',
              module: 'vehicles'
            });
          }
        } else {
          // Already expired
          reminders.push({
            id: `insurance-${vehicle.id}-${vehicle.insurance_expiry_date}`,
            title: 'Insurance Expired',
            entityId: vehicle.id,
            entityName: vehicle.registration_number,
            dueDate: vehicle.insurance_expiry_date,
            daysLeft: 0,
            status: 'critical',
            link: `/vehicles/${vehicle.id}`,
            type: 'insurance_expiry',
            module: 'vehicles'
          });
        }
      }

      // Check PUC expiry
      if (vehicle.puc_expiry_date) {
        const expiryDate = new Date(vehicle.puc_expiry_date);
        if (isAfter(expiryDate, today)) {
          const daysLeft = differenceInDays(expiryDate, today);
          if (daysLeft <= 15) { // PUC has a shorter threshold (15 days)
            reminders.push({
              id: `puc-${vehicle.id}-${vehicle.puc_expiry_date}`,
              title: `PUC Expiring in ${daysLeft} days`,
              entityId: vehicle.id,
              entityName: vehicle.registration_number,
              dueDate: vehicle.puc_expiry_date,
              daysLeft,
              status: getStatusFromDays(daysLeft),
              link: `/vehicles/${vehicle.id}`,
              type: 'puc_expiry',
              module: 'vehicles'
            });
          }
        } else {
          // Already expired
          reminders.push({
            id: `puc-${vehicle.id}-${vehicle.puc_expiry_date}`,
            title: 'PUC Expired',
            entityId: vehicle.id,
            entityName: vehicle.registration_number,
            dueDate: vehicle.puc_expiry_date,
            daysLeft: 0,
            status: 'critical',
            link: `/vehicles/${vehicle.id}`,
            type: 'puc_expiry',
            module: 'vehicles'
          });
        }
      }

      // Check Fitness expiry
      if (vehicle.fitness_expiry_date) {
        const expiryDate = new Date(vehicle.fitness_expiry_date);
        if (isAfter(expiryDate, today)) {
          const daysLeft = differenceInDays(expiryDate, today);
          if (daysLeft <= 30) {
            reminders.push({
              id: `fitness-${vehicle.id}-${vehicle.fitness_expiry_date}`,
              title: `Fitness Certificate Expiring in ${daysLeft} days`,
              entityId: vehicle.id,
              entityName: vehicle.registration_number,
              dueDate: vehicle.fitness_expiry_date,
              daysLeft,
              status: getStatusFromDays(daysLeft),
              link: `/vehicles/${vehicle.id}`,
              type: 'fitness_expiry',
              module: 'vehicles'
            });
          }
        } else {
          // Already expired
          reminders.push({
            id: `fitness-${vehicle.id}-${vehicle.fitness_expiry_date}`,
            title: 'Fitness Certificate Expired',
            entityId: vehicle.id,
            entityName: vehicle.registration_number,
            dueDate: vehicle.fitness_expiry_date,
            daysLeft: 0,
            status: 'critical',
            link: `/vehicles/${vehicle.id}`,
            type: 'fitness_expiry',
            module: 'vehicles'
          });
        }
      }

      // Check Permit expiry
      if (vehicle.permit_expiry_date) {
        const expiryDate = new Date(vehicle.permit_expiry_date);
        if (isAfter(expiryDate, today)) {
          const daysLeft = differenceInDays(expiryDate, today);
          if (daysLeft <= 30) {
            reminders.push({
              id: `permit-${vehicle.id}-${vehicle.permit_expiry_date}`,
              title: `Permit Expiring in ${daysLeft} days`,
              entityId: vehicle.id,
              entityName: vehicle.registration_number,
              dueDate: vehicle.permit_expiry_date,
              daysLeft,
              status: getStatusFromDays(daysLeft),
              link: `/vehicles/${vehicle.id}`,
              type: 'permit_expiry',
              module: 'vehicles'
            });
          }
        } else {
          // Already expired
          reminders.push({
            id: `permit-${vehicle.id}-${vehicle.permit_expiry_date}`,
            title: 'Permit Expired',
            entityId: vehicle.id,
            entityName: vehicle.registration_number,
            dueDate: vehicle.permit_expiry_date,
            daysLeft: 0,
            status: 'critical',
            link: `/vehicles/${vehicle.id}`,
            type: 'permit_expiry',
            module: 'vehicles'
          });
        }
      }

      // Check for missing documents
      const missingDocs = [];
      if (!vehicle.rc_document_url) missingDocs.push('RC');
      if (!vehicle.insurance_document_url) missingDocs.push('Insurance');
      if (!vehicle.fitness_document_url) missingDocs.push('Fitness');
      if (!vehicle.permit_document_url) missingDocs.push('Permit');
      if (!vehicle.puc_document_url) missingDocs.push('PUC');

      if (missingDocs.length > 0) {
        reminders.push({
          id: `missing-docs-${vehicle.id}-${Date.now()}`,
          title: `Missing Documents: ${missingDocs.join(', ')}`,
          entityId: vehicle.id,
          entityName: vehicle.registration_number,
          status: 'warning',
          link: `/vehicles/${vehicle.id}`,
          type: 'missing_documents',
          module: 'vehicles'
        });
      }
    });

    // Sort reminders by dueDate first, then by daysLeft
    return reminders.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return (a.daysLeft || Infinity) - (b.daysLeft || Infinity);
    });
  } catch (error) {
    console.error('Error in getRemindersForVehicles:', error);
    return [];
  }
};

/**
 * Get driver reminders
 * @returns A promise that resolves to an array of driver reminder items
 */
const getRemindersForDrivers = async (): Promise<ReminderItem[]> => {
  try {
    // Fetch drivers from Supabase
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('*')
      .not('status', 'eq', 'blacklisted');

    if (error) {
      console.error('Error fetching drivers for reminders:', error);
      return [];
    }

    if (!drivers || drivers.length === 0) {
      return [];
    }

    const reminders: ReminderItem[] = [];
    const today = new Date();

    // Process each driver for reminders
    drivers.forEach((driver: Driver) => {
      // Check License expiry
      if (driver.license_expiry_date) {
        const expiryDate = new Date(driver.license_expiry_date);
        if (isAfter(expiryDate, today)) {
          const daysLeft = differenceInDays(expiryDate, today);
          if (daysLeft <= 30) {
            reminders.push({
              id: `license-${driver.id}-${driver.license_expiry_date}`,
              title: `License Expiring in ${daysLeft} days`,
              entityId: driver.id,
              entityName: driver.name,
              dueDate: driver.license_expiry_date,
              daysLeft,
              status: getStatusFromDays(daysLeft),
              link: `/drivers/${driver.id}`,
              type: 'license_expiry',
              module: 'drivers'
            });
          }
        } else {
          // Already expired
          reminders.push({
            id: `license-${driver.id}-${driver.license_expiry_date}`,
            title: 'License Expired',
            entityId: driver.id,
            entityName: driver.name,
            dueDate: driver.license_expiry_date,
            daysLeft: 0,
            status: 'critical',
            link: `/drivers/${driver.id}`,
            type: 'license_expiry',
            module: 'drivers'
          });
        }
      }

      // Check for missing documents
      if (!driver.license_document) {
        reminders.push({
          id: `missing-license-${driver.id}-${Date.now()}`,
          title: 'Missing License Document',
          entityId: driver.id,
          entityName: driver.name,
          status: 'warning',
          link: `/drivers/${driver.id}`,
          type: 'missing_documents',
          module: 'drivers'
        });
      }

      // Check for inactive drivers
      if (driver.status === 'inactive' || driver.status === 'suspended') {
        reminders.push({
          id: `inactive-${driver.id}-${Date.now()}`,
          title: `Driver is ${driver.status}`,
          entityId: driver.id,
          entityName: driver.name,
          status: 'warning',
          link: `/drivers/${driver.id}`,
          type: 'inactive_driver',
          module: 'drivers'
        });
      }
    });

    // Sort reminders by dueDate first, then by daysLeft
    return reminders.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return (a.daysLeft || Infinity) - (b.daysLeft || Infinity);
    });
  } catch (error) {
    console.error('Error in getRemindersForDrivers:', error);
    return [];
  }
};

/**
 * Get maintenance reminders
 * @returns A promise that resolves to an array of maintenance reminder items
 */
const getRemindersForMaintenance = async (): Promise<ReminderItem[]> => {
  try {
    // Fetch maintenance tasks and vehicles from Supabase
    const [{ data: tasks, error: tasksError }, { data: vehicles, error: vehiclesError }] = await Promise.all([
      supabase
        .from('maintenance_tasks')
        .select('*')
        .or('status.eq.open,status.eq.in_progress,status.eq.escalated'),
      
      supabase
        .from('vehicles')
        .select('*')
        .not('status', 'eq', 'archived')
    ]);

    if (tasksError) {
      console.error('Error fetching maintenance tasks for reminders:', tasksError);
      return [];
    }

    if (vehiclesError) {
      console.error('Error fetching vehicles for maintenance reminders:', vehiclesError);
      return [];
    }

    if (!tasks || tasks.length === 0 || !vehicles || vehicles.length === 0) {
      return [];
    }

    const reminders: ReminderItem[] = [];
    const today = new Date();
    const ninetyDaysAgo = addDays(today, -90);

    // Create a map of vehicles for quick lookup
    const vehicleMap = new Map<string, Vehicle>();
    vehicles.forEach(vehicle => {
      vehicleMap.set(vehicle.id, vehicle);
    });

    // Process each maintenance task for reminders
    tasks.forEach((task: MaintenanceTask) => {
      const vehicle = vehicleMap.get(task.vehicle_id);
      if (!vehicle) return; // Skip if vehicle not found

      // Check for tasks with next service due
      if (task.next_service_due) {
        // Check if next service is due by date
        if (task.next_service_due.date) {
          const dueDate = new Date(task.next_service_due.date);
          if (isAfter(dueDate, today)) {
            const daysLeft = differenceInDays(dueDate, today);
            if (daysLeft <= 30) {
              reminders.push({
                id: `service-date-${task.id}-${task.next_service_due.date}`,
                title: `Service Due in ${daysLeft} days`,
                entityId: task.id,
                entityName: vehicle.registration_number,
                dueDate: task.next_service_due.date,
                daysLeft,
                status: getStatusFromDays(daysLeft),
                link: `/maintenance/${task.id}`,
                type: 'service_due_date',
                module: 'maintenance'
              });
            }
          } else {
            // Already overdue
            reminders.push({
              id: `service-date-${task.id}-${task.next_service_due.date}`,
              title: 'Service Overdue',
              entityId: task.id,
              entityName: vehicle.registration_number,
              dueDate: task.next_service_due.date,
              daysLeft: 0,
              status: 'critical',
              link: `/maintenance/${task.id}`,
              type: 'service_due_date',
              module: 'maintenance'
            });
          }
        }

        // Check if next service is due by odometer
        if (task.next_service_due.odometer && vehicle.current_odometer) {
          const kmLeft = task.next_service_due.odometer - vehicle.current_odometer;
          if (kmLeft <= 1000 && kmLeft > 0) {
            reminders.push({
              id: `service-km-${task.id}-${task.next_service_due.odometer}`,
              title: `Service Due in ${kmLeft} km`,
              entityId: task.id,
              entityName: vehicle.registration_number,
              status: kmLeft <= 300 ? 'critical' : kmLeft <= 600 ? 'warning' : 'normal',
              link: `/maintenance/${task.id}`,
              type: 'service_due_km',
              module: 'maintenance'
            });
          } else if (kmLeft <= 0) {
            // Already overdue by km
            reminders.push({
              id: `service-km-${task.id}-${task.next_service_due.odometer}`,
              title: 'Service Overdue by Odometer',
              entityId: task.id,
              entityName: vehicle.registration_number,
              status: 'critical',
              link: `/maintenance/${task.id}`,
              type: 'service_due_km',
              module: 'maintenance'
            });
          }
        }
      }

      // Check for tasks that have been open for too long
      if (task.status === 'open' || task.status === 'in_progress') {
        const startDate = new Date(task.start_date);
        const daysOpen = differenceInDays(today, startDate);
        if (daysOpen > 7) {
          reminders.push({
            id: `open-task-${task.id}-${task.start_date}`,
            title: `Task Open for ${daysOpen} days`,
            entityId: task.id,
            entityName: vehicle.registration_number,
            status: daysOpen > 14 ? 'critical' : 'warning',
            link: `/maintenance/${task.id}`,
            type: 'task_open_too_long',
            module: 'maintenance'
          });
        }
      }

      // Check for vehicles that haven't had maintenance in 90+ days
      const startDate = new Date(task.start_date);
      if (isBefore(startDate, ninetyDaysAgo)) {
        // Find if there are any newer maintenance tasks for this vehicle
        const hasNewerTask = tasks.some((otherTask: MaintenanceTask) => 
          otherTask.vehicle_id === task.vehicle_id && 
          new Date(otherTask.start_date) > startDate
        );

        if (!hasNewerTask) {
          reminders.push({
            id: `no-recent-maintenance-${vehicle.id}-${startDate.toISOString()}`,
            title: 'No Maintenance in 90+ Days',
            entityId: vehicle.id,
            entityName: vehicle.registration_number,
            status: 'warning',
            link: `/vehicles/${vehicle.id}`,
            type: 'no_recent_maintenance',
            module: 'maintenance'
          });
        }
      }
    });

    // Sort reminders by dueDate first, then by daysLeft
    return reminders.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return (a.daysLeft || Infinity) - (b.daysLeft || Infinity);
    });
  } catch (error) {
    console.error('Error in getRemindersForMaintenance:', error);
    return [];
  }
};

/**
 * Get trip reminders
 * @returns A promise that resolves to an array of trip reminder items
 */
const getRemindersForTrips = async (): Promise<ReminderItem[]> => {
  try {
    // Fetch trips from Supabase
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*, vehicles!inner(registration_number)')
      .order('trip_end_date', { ascending: false })
      .limit(100); // Limit to recent trips for performance

    if (error) {
      console.error('Error fetching trips for reminders:', error);
      return [];
    }

    if (!trips || trips.length === 0) {
      return [];
    }

    const reminders: ReminderItem[] = [];
    const today = new Date();
    const threeDaysAgo = addDays(today, -3);

    // Process each trip for reminders
    trips.forEach((trip: Trip & { vehicles: { registration_number: string } }) => {
      // Check for missing fuel bill
      if (trip.refueling_done && !trip.fuel_bill_url) {
        const tripEndDate = new Date(trip.trip_end_date);
        if (isBefore(tripEndDate, threeDaysAgo)) {
          reminders.push({
            id: `missing-fuel-bill-${trip.id}-${trip.trip_end_date}`,
            title: 'Missing Fuel Bill',
            entityId: trip.id,
            entityName: trip.trip_serial_number,
            dueDate: trip.trip_end_date,
            status: 'warning',
            link: `/trips/${trip.id}`,
            type: 'missing_fuel_bill',
            module: 'trips'
          });
        }
      }

      // Check for missing end km
      if (!trip.end_km && trip.start_km) {
        reminders.push({
          id: `missing-end-km-${trip.id}-${trip.trip_start_date}`,
          title: 'Missing End KM',
          entityId: trip.id,
          entityName: trip.trip_serial_number,
          dueDate: trip.trip_start_date,
          status: 'warning',
          link: `/trips/${trip.id}`,
          type: 'missing_end_km',
          module: 'trips'
        });
      }

      // Check for missing fuel data when refueling is marked as done
      if (trip.refueling_done && (!trip.fuel_quantity || !trip.fuel_cost)) {
        reminders.push({
          id: `missing-fuel-data-${trip.id}-${trip.trip_end_date}`,
          title: 'Missing Fuel Data',
          entityId: trip.id,
          entityName: trip.trip_serial_number,
          dueDate: trip.trip_end_date,
          status: 'warning',
          link: `/trips/${trip.id}`,
          type: 'missing_fuel_data',
          module: 'trips'
        });
      }

      // Check for high route deviation
      if (trip.route_deviation && trip.route_deviation > 20) {
        reminders.push({
          id: `high-deviation-${trip.id}-${trip.trip_end_date}`,
          title: `High Route Deviation: ${trip.route_deviation.toFixed(1)}%`,
          entityId: trip.id,
          entityName: trip.trip_serial_number,
          dueDate: trip.trip_end_date,
          status: trip.route_deviation > 35 ? 'critical' : 'warning',
          link: `/trips/${trip.id}`,
          type: 'high_route_deviation',
          module: 'trips'
        });
      }
    });

    // Sort reminders by dueDate first, then by status
    return reminders.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      // If no dueDate, sort by status
      const statusOrder = { critical: 0, warning: 1, normal: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  } catch (error) {
    console.error('Error in getRemindersForTrips:', error);
    return [];
  }
};

/**
 * Get the status based on days left
 * @param daysLeft The number of days left
 * @returns The status (critical, warning, or normal)
 */
const getStatusFromDays = (daysLeft: number): ReminderStatus => {
  if (daysLeft < 7) return 'critical';
  if (daysLeft < 15) return 'warning';
  return 'normal';
};

