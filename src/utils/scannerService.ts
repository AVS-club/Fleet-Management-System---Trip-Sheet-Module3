import { supabase } from './supabaseClient';

export interface ScannerResult {
  type: 'trips' | 'fuel' | 'mileage' | 'expiry' | 'maintenance' | 'help' | 'error';
  vehicleReg?: string;
  period?: string;
  content: string;
  exportable?: boolean;
  data?: any;
}

export class ScannerService {
  // Helper to parse time periods
  private async getPeriodRange(period: string): Promise<{ from: string; to: string }> {
    const now = new Date();
    let from: Date;
    let to: Date = new Date();

    switch (period.toLowerCase()) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'yesterday':
        from = new Date(now.setDate(now.getDate() - 1));
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last week':
        from = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'this week':
        from = new Date(now.setDate(now.getDate() - now.getDay()));
        break;
      case 'last month':
        from = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'this month':
        from = new Date(now.setDate(1));
        break;
      case 'this year':
        from = new Date(now.setMonth(0, 1));
        break;
      default:
        // Default to last 30 days
        from = new Date(now.setDate(now.getDate() - 30));
    }

    return {
      from: from.toISOString(),
      to: to.toISOString()
    };
  }

  // Extract vehicle registration from query
  private extractVehicleReg(query: string): string | null {
    // Indian vehicle registration pattern: XX##XX####
    const patterns = [
      /([A-Z]{2}\d{2}[A-Z]{1,2}\d{4})/gi,  // Standard format
      /([A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4})/gi,  // With spaces
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        // Remove spaces and convert to uppercase
        return match[0].replace(/\s/g, '').toUpperCase();
      }
    }
    return null;
  }

  // Main query processor
  async processQuery(query: string): Promise<ScannerResult> {
    const lowerQuery = query.toLowerCase();
    const vehicleReg = this.extractVehicleReg(query);

    // Detect time period
    let period = 'this month'; // default
    const periodKeywords = [
      'today', 'yesterday', 'last week', 'this week', 
      'last month', 'this month', 'this year'
    ];
    
    for (const keyword of periodKeywords) {
      if (lowerQuery.includes(keyword)) {
        period = keyword;
        break;
      }
    }

    // Intent recognition
    if (this.isTripsQuery(lowerQuery)) {
      return await this.getTripsCount(vehicleReg, period);
    }
    
    if (this.isFuelQuery(lowerQuery)) {
      return await this.getFuelSummary(vehicleReg, period);
    }
    
    if (this.isMileageQuery(lowerQuery)) {
      return await this.getMileageStats(vehicleReg, period);
    }
    
    if (this.isExpiryQuery(lowerQuery)) {
      return await this.getDocumentExpiries(vehicleReg);
    }
    
    if (this.isMaintenanceQuery(lowerQuery)) {
      return await this.getMaintenanceStatus(vehicleReg);
    }

    // Default help response
    return {
      type: 'help',
      content: this.getHelpMessage()
    };
  }

  // Intent detection helpers
  private isTripsQuery(query: string): boolean {
    const keywords = ['trip', 'trips', 'how many trips', 'count trips', 'journey'];
    return keywords.some(k => query.includes(k));
  }

  private isFuelQuery(query: string): boolean {
    const keywords = ['fuel', 'diesel', 'petrol', 'expense', 'cost', 'liters', 'litres'];
    return keywords.some(k => query.includes(k));
  }

  private isMileageQuery(query: string): boolean {
    const keywords = ['mileage', 'km', 'kilometer', 'distance', 'average mileage', 'fuel efficiency'];
    return keywords.some(k => query.includes(k));
  }

  private isExpiryQuery(query: string): boolean {
    const keywords = ['expir', 'document', 'insurance', 'puc', 'permit', 'fitness', 'rc', 'registration'];
    return keywords.some(k => query.includes(k));
  }

  private isMaintenanceQuery(query: string): boolean {
    const keywords = ['maintenance', 'service', 'repair', 'pending', 'overdue'];
    return keywords.some(k => query.includes(k));
  }

  // Query implementations
  async getTripsCount(vehicleReg: string | null, period: string): Promise<ScannerResult> {
    if (!vehicleReg) {
      return {
        type: 'error',
        content: '❌ Please specify a vehicle registration number (e.g., MH12AB1234)'
      };
    }

    try {
      const { from, to } = await this.getPeriodRange(period);
      
      // Try RPC first if available
      const { data, error } = await supabase
        .rpc('rpc_trips_count', {
          reg_no: vehicleReg,
          date_from: from.split('T')[0],
          date_to: to.split('T')[0]
        });

      if (error) {
        // Fallback to direct table query
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('registration_number', vehicleReg)
          .single();

        if (!vehicle) {
          return {
            type: 'error',
            content: `❌ Vehicle ${vehicleReg} not found in database`
          };
        }

        const { count, error: countError } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('vehicle_id', vehicle.id)
          .gte('start_date', from)
          .lte('start_date', to);

        return {
          type: 'trips',
          vehicleReg,
          period,
          count: count || 0,
          content: `📊 **Trip Summary**

🚗 Vehicle: ${vehicleReg}
📅 Period: ${period}
✅ Total Trips: ${count || 0}

${count === 0 ? '_No trips found for this period_' : ''}`,
          exportable: true
        };
      }

      return {
        type: 'trips',
        vehicleReg,
        period,
        count: data || 0,
        content: `📊 **Trip Summary**

🚗 Vehicle: ${vehicleReg}
📅 Period: ${period}
✅ Total Trips: ${data || 0}

${data === 0 ? '_No trips found for this period_' : ''}`,
        exportable: true
      };
    } catch (error) {
      return {
        type: 'error',
        content: `❌ Error fetching trips: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getFuelSummary(vehicleReg: string | null, period: string): Promise<ScannerResult> {
    if (!vehicleReg) {
      return {
        type: 'error',
        content: '❌ Please specify a vehicle registration number'
      };
    }

    try {
      const { from, to } = await this.getPeriodRange(period);
      
      // Try RPC first
      const { data, error } = await supabase
        .rpc('rpc_fuel_summary', {
          reg_no: vehicleReg,
          date_from: from.split('T')[0],
          date_to: to.split('T')[0]
        });

      if (error) {
        // Fallback implementation
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('registration_number', vehicleReg)
          .single();

        if (!vehicle) {
          return {
            type: 'error',
            content: `❌ Vehicle ${vehicleReg} not found`
          };
        }

        // Get fuel entries from trips table
        const { data: fuelData } = await supabase
          .from('trips')
          .select('total_fuel_cost, fuel_quantity')
          .eq('vehicle_id', vehicle.id)
          .gte('start_date', from)
          .lte('start_date', to)
          .not('total_fuel_cost', 'is', null);

        const totalAmount = fuelData?.reduce((sum, t) => sum + (t.total_fuel_cost || 0), 0) || 0;
        const totalLiters = fuelData?.reduce((sum, t) => sum + (t.fuel_quantity || 0), 0) || 0;
        const avgPrice = totalLiters > 0 ? (totalAmount / totalLiters).toFixed(2) : '0';

        return {
          type: 'fuel',
          vehicleReg,
          period,
          content: `⛽ **Fuel Summary**

🚗 Vehicle: ${vehicleReg}
📅 Period: ${period}
💰 Total Cost: ₹${totalAmount.toLocaleString('en-IN')}
🛢️ Total Fuel: ${totalLiters} liters
📊 Entries: ${fuelData?.length || 0}
📈 Avg Price: ₹${avgPrice}/liter`,
          exportable: true
        };
      }

      const summary = data?.[0] || { 
        total_fuel_amount: 0, 
        total_liters: 0, 
        trips_covered: 0 
      };

      const avgPrice = summary.total_liters > 0 
        ? (summary.total_fuel_amount / summary.total_liters).toFixed(2)
        : '0';

      return {
        type: 'fuel',
        vehicleReg,
        period,
        content: `⛽ **Fuel Summary**

🚗 Vehicle: ${vehicleReg}
📅 Period: ${period}
💰 Total Cost: ₹${Number(summary.total_fuel_amount).toLocaleString('en-IN')}
🛢️ Total Fuel: ${summary.total_liters} liters
📊 Trips with refueling: ${summary.trips_covered}
📈 Avg Price: ₹${avgPrice}/liter

_Note: Calculated from daily entries_`,
        exportable: true,
        data: summary
      };
    } catch (error) {
      return {
        type: 'error',
        content: `❌ Error calculating fuel summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getMileageStats(vehicleReg: string | null, period: string): Promise<ScannerResult> {
    if (!vehicleReg) {
      return {
        type: 'error',
        content: '❌ Please specify a vehicle registration number'
      };
    }

    try {
      const { from, to } = await this.getPeriodRange(period);
      
      const { data, error } = await supabase
        .rpc('rpc_mileage_stats', {
          reg_no: vehicleReg,
          date_from: from.split('T')[0],
          date_to: to.split('T')[0]
        });

      if (error) {
        // Fallback calculation
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('registration_number', vehicleReg)
          .single();

        if (!vehicle) {
          return {
            type: 'error',
            content: `❌ Vehicle ${vehicleReg} not found`
          };
        }

        const { data: trips } = await supabase
          .from('trips')
          .select('start_km, end_km, fuel_quantity, calculated_kmpl')
          .eq('vehicle_id', vehicle.id)
          .gte('start_date', from)
          .lte('start_date', to);

        if (!trips || trips.length === 0) {
          return {
            type: 'mileage',
            vehicleReg,
            period,
            content: `📈 **Mileage Statistics**

🚗 Vehicle: ${vehicleReg}
📅 Period: ${period}
🛣️ Distance: 0 km
⛽ Fuel Consumed: 0 liters
⚡ Average Mileage: N/A
🔢 Trip Count: 0

_No trip data for this period_`,
            exportable: true
          };
        }

        const totalDistance = trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
        const totalFuel = trips.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0);
        const avgMileage = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(2) : 'N/A';

        return {
          type: 'mileage',
          vehicleReg,
          period,
          content: `📈 **Mileage Statistics**

🚗 Vehicle: ${vehicleReg}
📅 Period: ${period}
🛣️ Distance: ${totalDistance.toLocaleString('en-IN')} km
⛽ Fuel Consumed: ${totalFuel} liters
⚡ Average Mileage: ${avgMileage} km/liter
🔢 Trip Count: ${trips.length}`,
          exportable: true
        };
      }

      const stats = data?.[0] || {
        distance_km: 0,
        refuel_liters: 0,
        trip_count: 0,
        avg_mileage_kmpl: 0
      };

      return {
        type: 'mileage',
        vehicleReg,
        period,
        content: `📈 **Mileage Statistics**

🚗 Vehicle: ${vehicleReg}
📅 Period: ${period}
🛣️ Distance: ${Number(stats.distance_km).toLocaleString('en-IN')} km
⛽ Fuel Consumed: ${stats.refuel_liters} liters
⚡ Average Mileage: ${stats.avg_mileage_kmpl || 'N/A'} km/liter
🔢 Trip Count: ${stats.trip_count}

${stats.distance_km === 0 ? '_No trip data for this period_' : ''}`,
        exportable: true,
        data: stats
      };
    } catch (error) {
      return {
        type: 'error',
        content: `❌ Error calculating mileage: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getDocumentExpiries(vehicleReg: string | null): Promise<ScannerResult> {
    if (!vehicleReg) {
      // Get all vehicles with expiring documents
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('registration_number, insurance_expiry_date, pollution_expiry_date, fitness_expiry_date, permit_expiry_date, registration_date')
        .or(`insurance_expiry_date.lte.${thirtyDaysFromNow.toISOString()},pollution_expiry_date.lte.${thirtyDaysFromNow.toISOString()}`);

      if (!vehicles || vehicles.length === 0) {
        return {
          type: 'expiry',
          content: '✅ No documents expiring in the next 30 days!'
        };
      }

      let content = '⚠️ **Documents Expiring Soon (Next 30 days)**\n\n';
      
      vehicles.forEach(v => {
        const expiries = [];
        if (v.insurance_expiry_date && new Date(v.insurance_expiry_date) <= thirtyDaysFromNow) {
          expiries.push(`Insurance (${new Date(v.insurance_expiry_date).toLocaleDateString('en-IN')})`);
        }
        if (v.pollution_expiry_date && new Date(v.pollution_expiry_date) <= thirtyDaysFromNow) {
          expiries.push(`PUC (${new Date(v.pollution_expiry_date).toLocaleDateString('en-IN')})`);
        }
        
        if (expiries.length > 0) {
          content += `🚗 ${v.registration_number}: ${expiries.join(', ')}\n`;
        }
      });

      return {
        type: 'expiry',
        content,
        exportable: true
      };
    }

    // Get specific vehicle expiries
    try {
      const { data, error } = await supabase
        .rpc('rpc_vehicle_expiries', { reg_no: vehicleReg });

      if (error) {
        // Fallback
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('*')
          .eq('registration_number', vehicleReg)
          .single();

        if (!vehicle) {
          return {
            type: 'error',
            content: `❌ Vehicle ${vehicleReg} not found`
          };
        }

        return this.formatExpiryResponse(vehicle);
      }

      const vehicle = data?.[0];
      if (!vehicle) {
        return {
          type: 'error',
          content: `❌ Vehicle ${vehicleReg} not found`
        };
      }

      // Calculate RC expiry (15 years from registration)
      let rcExpiry = 'N/A';
      if (vehicle.registration_date) {
        const regDate = new Date(vehicle.registration_date);
        regDate.setFullYear(regDate.getFullYear() + 15);
        rcExpiry = regDate.toLocaleDateString('en-IN');
      }

      const formatDate = (date: string | null) => {
        if (!date) return 'Not set';
        const d = new Date(date);
        const daysLeft = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const formatted = d.toLocaleDateString('en-IN');
        
        if (daysLeft < 0) return `${formatted} ❌ EXPIRED`;
        if (daysLeft <= 30) return `${formatted} ⚠️ (${daysLeft} days)`;
        return `${formatted} ✅`;
      };

      return {
        type: 'expiry',
        vehicleReg,
        content: `📄 **Document Expiry Dates**

🚗 Vehicle: ${vehicleReg}

🛡️ Insurance: ${formatDate(vehicle.insurance_expiry_date)}
📋 PUC: ${formatDate(vehicle.pollution_expiry_date || vehicle.puc_expiry_date)}
📜 Permit: ${formatDate(vehicle.permit_expiry_date)}
🔧 Fitness: ${formatDate(vehicle.fitness_expiry_date)}
🆔 RC (15 years): ${rcExpiry}

⚠️ = Expiring within 30 days
❌ = Already expired`,
        exportable: true,
        data: vehicle
      };
    } catch (error) {
      return {
        type: 'error',
        content: `❌ Error fetching document expiries: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getMaintenanceStatus(vehicleReg: string | null): Promise<ScannerResult> {
    try {
      const query = vehicleReg 
        ? supabase
            .from('maintenance')
            .select(`
              *,
              vehicles!inner(registration_number)
            `)
            .eq('vehicles.registration_number', vehicleReg)
            .in('status', ['pending', 'in_progress'])
        : supabase
            .from('maintenance')
            .select(`
              *,
              vehicles(registration_number)
            `)
            .in('status', ['pending', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(10);

      const { data, error } = await query;

      if (error) {
        return {
          type: 'error',
          content: `❌ Error fetching maintenance: ${error.message}`
        };
      }

      if (!data || data.length === 0) {
        return {
          type: 'maintenance',
          content: vehicleReg 
            ? `✅ No pending maintenance for ${vehicleReg}`
            : '✅ No pending maintenance tasks'
        };
      }

      let content = `🔧 **Maintenance Status**\n\n`;
      
      data.forEach(task => {
        const vehicle = task.vehicles?.registration_number || 'Unknown';
        content += `🚗 ${vehicle}\n`;
        content += `   📋 Type: ${task.maintenance_type}\n`;
        content += `   📅 Created: ${new Date(task.created_at).toLocaleDateString('en-IN')}\n`;
        content += `   🔄 Status: ${task.status}\n`;
        content += `   ⚡ Priority: ${task.priority || 'Normal'}\n\n`;
      });

      return {
        type: 'maintenance',
        content,
        exportable: true,
        data
      };
    } catch (error) {
      return {
        type: 'error',
        content: `❌ Error fetching maintenance status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Helper methods
  private formatExpiryResponse(vehicle: any): ScannerResult {
    const formatDate = (date: string | null) => {
      if (!date) return 'Not set';
      const d = new Date(date);
      const daysLeft = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const formatted = d.toLocaleDateString('en-IN');
      
      if (daysLeft < 0) return `${formatted} ❌`;
      if (daysLeft <= 30) return `${formatted} ⚠️`;
      return `${formatted} ✅`;
    };

    return {
      type: 'expiry',
      content: `📄 **Document Expiry Dates**

🚗 Vehicle: ${vehicle.registration_number}

🛡️ Insurance: ${formatDate(vehicle.insurance_expiry_date)}
📋 PUC: ${formatDate(vehicle.pollution_expiry_date)}
📜 Permit: ${formatDate(vehicle.permit_expiry_date)}
🔧 Fitness: ${formatDate(vehicle.fitness_expiry_date)}`,
      exportable: true
    };
  }

  private getHelpMessage(): string {
    return `🤖 **Fleet Scanner Help**

I can help you with:

📊 **Trip Analysis**
• "How many trips for MH12AB1234 last month?"
• "Show trips for GJ03BW8184 this week"

⛽ **Fuel & Expenses**
• "Fuel expenses for MP09KV1123 last week"
• "Total diesel cost this month"

📈 **Mileage & Performance**
• "Average mileage for MH04KL5678 this year"
• "Distance covered by fleet today"

📄 **Document Management**
• "When does insurance expire for MH12AB1234?"
• "Show all expiring documents"
• "PUC expiry for my vehicles"

🔧 **Maintenance**
• "Pending maintenance for MH12AB1234"
• "Show all overdue services"

💡 **Tips:**
• Include vehicle number for specific queries
• Specify time period (today, yesterday, last week, this month)
• Use voice command by clicking the mic button
• Say vehicle numbers clearly: "MH one two AB one two three four"

Try: "Show fuel expenses for MH12AB1234 last week"`;
  }

  // Export functionality
  async exportToCSV(data: any, type: string): Promise<string> {
    // Convert data to CSV format based on type
    let csv = '';
    
    switch (type) {
      case 'trips':
        csv = 'Vehicle,Period,Trip Count\n';
        csv += `${data.vehicleReg},${data.period},${data.count}`;
        break;
      
      case 'fuel':
        csv = 'Vehicle,Period,Total Cost,Total Liters,Avg Price\n';
        csv += `${data.vehicleReg},${data.period},${data.total_fuel_amount},${data.total_liters},${data.total_fuel_amount/data.total_liters}`;
        break;
      
      case 'mileage':
        csv = 'Vehicle,Period,Distance (km),Fuel (L),Mileage (km/L)\n';
        csv += `${data.vehicleReg},${data.period},${data.distance_km},${data.refuel_liters},${data.avg_mileage_kmpl}`;
        break;
      
      default:
        csv = JSON.stringify(data, null, 2);
    }
    
    return csv;
  }
}

// Export singleton instance
export const scannerService = new ScannerService();
