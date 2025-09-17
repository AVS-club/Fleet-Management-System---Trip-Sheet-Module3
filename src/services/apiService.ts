import { supabase } from '../utils/supabaseClient';
import { Trip, Vehicle, Driver, MaintenanceTask } from '../types';

// Base API service class with common functionality
class BaseApiService {
  protected supabase = supabase;

  // Generic error handler
  protected handleError(error: any, operation: string) {
    console.error(`Error in ${operation}:`, error);
    throw new Error(`Failed to ${operation}: ${error.message || 'Unknown error'}`);
  }

  // Generic retry mechanism
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) break;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }
}

// Vehicle API Service
export class VehicleApiService extends BaseApiService {
  async getAll(): Promise<Vehicle[]> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    });
  }

  async getById(id: string): Promise<Vehicle | null> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async create(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('vehicles')
        .insert(vehicle)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async update(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async delete(id: string): Promise<void> {
    return this.withRetry(async () => {
      const { error } = await this.supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    });
  }
}

// Trip API Service
export class TripApiService extends BaseApiService {
  async getAll(): Promise<Trip[]> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    });
  }

  async getById(id: string): Promise<Trip | null> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async create(trip: Omit<Trip, 'id'>): Promise<Trip> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('trips')
        .insert(trip)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async update(id: string, updates: Partial<Trip>): Promise<Trip> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('trips')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async delete(id: string): Promise<void> {
    return this.withRetry(async () => {
      const { error } = await this.supabase
        .from('trips')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    });
  }
}

// Driver API Service
export class DriverApiService extends BaseApiService {
  async getAll(): Promise<Driver[]> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    });
  }

  async getById(id: string): Promise<Driver | null> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async create(driver: Omit<Driver, 'id'>): Promise<Driver> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('drivers')
        .insert(driver)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async update(id: string, updates: Partial<Driver>): Promise<Driver> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async delete(id: string): Promise<void> {
    return this.withRetry(async () => {
      const { error } = await this.supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    });
  }
}

// Maintenance API Service
export class MaintenanceApiService extends BaseApiService {
  async getAll(): Promise<MaintenanceTask[]> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('maintenance_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    });
  }

  async getById(id: string): Promise<MaintenanceTask | null> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async create(task: Omit<MaintenanceTask, 'id'>): Promise<MaintenanceTask> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('maintenance_tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async update(id: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask> {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('maintenance_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
  }

  async delete(id: string): Promise<void> {
    return this.withRetry(async () => {
      const { error } = await this.supabase
        .from('maintenance_tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    });
  }
}

// Export singleton instances
export const vehicleApiService = new VehicleApiService();
export const tripApiService = new TripApiService();
export const driverApiService = new DriverApiService();
export const maintenanceApiService = new MaintenanceApiService();
