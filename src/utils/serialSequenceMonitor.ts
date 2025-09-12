import { supabase } from './supabaseClient';

export interface SerialSequenceIssue {
  type: 'gap' | 'duplicate';
  vehicle_id: string;
  vehicle_registration: string;
  serial_number: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  missing_serials?: string[];
  duplicate_trips?: Array<{
    id: string;
    trip_start_date: string;
    driver_name?: string;
  }>;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface SequenceAnalysis {
  vehicle_id: string;
  vehicle_registration: string;
  total_trips: number;
  expected_sequence_length: number;
  actual_sequence_length: number;
  gaps: number;
  duplicates: number;
  latest_serial: string;
  issues: SerialSequenceIssue[];
}

export class SerialSequenceMonitor {
  /**
   * Analyze serial number sequence for a specific vehicle
   */
  static async analyzeVehicleSequence(vehicleId: string): Promise<SequenceAnalysis | null> {
    try {
      // Get vehicle info and all trips
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('registration_number')
        .eq('id', vehicleId)
        .single();

      if (vehicleError || !vehicleData) {
        console.error('Vehicle not found:', vehicleError);
        return null;
      }

      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, vehicle_id, trip_serial_number, trip_start_date, driver:drivers(name)')
        .eq('vehicle_id', vehicleId)
        .order('trip_start_date')
        .is('deleted_at', null);

      interface TripWithDriver {
        id: string;
        vehicle_id: string;
        trip_serial_number: string;
        trip_start_date: string;
        driver?: { name: string } | null;
      }

      if (tripsError) {
        console.error('Error fetching trips:', tripsError);
        return null;
      }

      const tripList: TripWithDriver[] = trips || [];
      const issues: SerialSequenceIssue[] = [];

      // Extract serial numbers and analyze sequence
      const serialNumbers = tripList.map(trip => trip.trip_serial_number).filter(Boolean);
      const uniqueSerials = [...new Set(serialNumbers)];
      
      // Detect duplicates
      const duplicateIssues = this.detectDuplicateSerials(tripList, vehicleData.registration_number, vehicleId);
      issues.push(...duplicateIssues);

      // Detect gaps in sequence
      const gapIssues = this.detectSequenceGaps(tripList, vehicleData.registration_number, vehicleId);
      issues.push(...gapIssues);

      return {
        vehicle_id: vehicleId,
        vehicle_registration: vehicleData.registration_number,
        total_trips: tripList.length,
        expected_sequence_length: this.calculateExpectedSequenceLength(tripList),
        actual_sequence_length: uniqueSerials.length,
        gaps: gapIssues.length,
        duplicates: duplicateIssues.length,
        latest_serial: serialNumbers[serialNumbers.length - 1] || '',
        issues
      };
    } catch (error) {
      console.error('Error analyzing vehicle sequence:', error);
      return null;
    }
  }

  /**
   * Detect duplicate serial numbers
   */
  private static detectDuplicateSerials(trips: Array<{id: string; vehicle_id: string; trip_serial_number: string; trip_start_date: string; driver?: {name: string} | null}>, vehicleRegistration: string, vehicleId: string): SerialSequenceIssue[] {
    const issues: SerialSequenceIssue[] = [];
    const serialCountMap = new Map<string, any[]>();

    // Group trips by serial number
    trips.forEach((trip: any) => {
      if (trip.trip_serial_number) {
        if (!serialCountMap.has(trip.trip_serial_number)) {
          serialCountMap.set(trip.trip_serial_number, []);
        }
        serialCountMap.get(trip.trip_serial_number)!.push(trip);
      }
    });

    // Find duplicates
    serialCountMap.forEach((tripList, serialNumber) => {
      if (tripList.length > 1) {
        issues.push({
          type: 'duplicate',
          vehicle_id: vehicleId,
          vehicle_registration: vehicleRegistration,
          serial_number: serialNumber,
          duplicate_trips: tripList.map(trip => ({
            id: trip.id,
            trip_start_date: trip.trip_start_date,
            driver_name: trip.driver?.name
          })),
          severity: tripList.length > 2 ? 'high' : 'medium',
          description: `Serial number ${serialNumber} is used by ${tripList.length} trips`
        });
      }
    });

    return issues;
  }

  /**
   * Detect gaps in serial number sequence
   */
  private static detectSequenceGaps(trips: Array<{id: string; vehicle_id: string; trip_serial_number: string; trip_start_date: string; driver?: {name: string} | null}>, vehicleRegistration: string, vehicleId: string): SerialSequenceIssue[] {
    const issues: SerialSequenceIssue[] = [];
    
    // Extract and sort serial numbers by date
    const serialData = trips
      .filter(trip => trip.trip_serial_number)
      .map(trip => ({
        serial: trip.trip_serial_number,
        date: trip.trip_start_date,
        trip_id: trip.id
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (serialData.length < 2) return issues;

    // Group by year-month for sequence analysis
    const monthlyGroups = new Map<string, typeof serialData>();
    
    serialData.forEach(item => {
      const monthKey = item.date.substring(0, 7); // YYYY-MM format
      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey)!.push(item);
    });

    // Analyze each month for gaps
    monthlyGroups.forEach((monthData) => {
      const gaps = this.findSequenceGapsInMonth(monthData, vehicleRegistration, vehicleId);
      issues.push(...gaps);
    });

    return issues;
  }

  /**
   * Find sequence gaps within a month
   */
  private static findSequenceGapsInMonth(monthData: any[], vehicleRegistration: string, vehicleId: string): SerialSequenceIssue[] {
    const issues: SerialSequenceIssue[] = [];
    
    // Extract numeric parts from serial numbers (assuming format like ABC-001, ABC-002)
    const serialNumbers = monthData.map(item => {
      const match = item.serial.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    }).filter(num => num !== null).sort((a, b) => a - b);

    if (serialNumbers.length < 2) return issues;

    // Find gaps in the sequence
    const missingNumbers: number[] = [];
    for (let i = 0; i < serialNumbers.length - 1; i++) {
      const current = serialNumbers[i];
      const next = serialNumbers[i + 1];
      
      if (next - current > 1) {
        // There's a gap
        for (let missing = current + 1; missing < next; missing++) {
          missingNumbers.push(missing);
        }
      }
    }

    if (missingNumbers.length > 0) {
      const firstDate = monthData[0].date;
      const lastDate = monthData[monthData.length - 1].date;
      
      // Generate expected missing serial numbers
      const prefix = monthData[0].serial.replace(/\d+$/, '');
      const missingSerials = missingNumbers.map(num => 
        prefix + num.toString().padStart(3, '0')
      );

      issues.push({
        type: 'gap',
        vehicle_id: vehicleId,
        vehicle_registration: vehicleRegistration,
        serial_number: `${missingSerials[0]} - ${missingSerials[missingSerials.length - 1]}`,
        date_range: {
          start_date: firstDate,
          end_date: lastDate
        },
        missing_serials: missingSerials,
        severity: missingNumbers.length > 5 ? 'high' : missingNumbers.length > 2 ? 'medium' : 'low',
        description: `${missingNumbers.length} missing serial numbers detected in sequence`
      });
    }

    return issues;
  }

  /**
   * Calculate expected sequence length based on date range and trip frequency
   */
  private static calculateExpectedSequenceLength(trips: any[]): number {
    if (trips.length < 2) return trips.length;

    const sortedTrips = trips.sort((a, b) => 
      new Date(a.trip_start_date).getTime() - new Date(b.trip_start_date).getTime()
    );

    const firstDate = new Date(sortedTrips[0].trip_start_date);
    const lastDate = new Date(sortedTrips[sortedTrips.length - 1].trip_start_date);
    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

    // Estimate based on average trip frequency
    const avgTripsPerDay = trips.length / Math.max(daysDiff, 1);
    return Math.ceil(daysDiff * avgTripsPerDay);
  }

  /**
   * Get sequence issues for all vehicles
   */
  static async getSystemWideSequenceIssues(): Promise<{
    total_vehicles_checked: number;
    vehicles_with_issues: number;
    total_issues: number;
    issues_by_severity: Record<string, number>;
    vehicle_analyses: SequenceAnalysis[];
  }> {
    try {
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .is('deleted_at', null);

      if (vehiclesError) {
        throw vehiclesError;
      }

      const vehicleList = vehicles || [];
      const analyses: SequenceAnalysis[] = [];
      const issuesBySeverity = { low: 0, medium: 0, high: 0 };

      // Analyze each vehicle
      for (const vehicle of vehicleList) {
        const analysis = await this.analyzeVehicleSequence(vehicle.id);
        if (analysis) {
          analyses.push(analysis);
          
          // Count issues by severity
          analysis.issues.forEach(issue => {
            issuesBySeverity[issue.severity]++;
          });
        }
      }

      const vehiclesWithIssues = analyses.filter(a => a.issues.length > 0).length;
      const totalIssues = analyses.reduce((sum, a) => sum + a.issues.length, 0);

      return {
        total_vehicles_checked: vehicleList.length,
        vehicles_with_issues: vehiclesWithIssues,
        total_issues: totalIssues,
        issues_by_severity: issuesBySeverity,
        vehicle_analyses: analyses
      };
    } catch (error) {
      console.error('Error getting system-wide sequence issues:', error);
      throw error;
    }
  }

  /**
   * Generate next serial number for a vehicle with gap detection
   */
  static async generateNextSerialWithGapCheck(
    vehicleRegistration: string,
    tripDate: string,
    vehicleId: string
  ): Promise<{ serial: string; hasGaps: boolean; suggestions?: string[] }> {
    try {
      const analysis = await this.analyzeVehicleSequence(vehicleId);
      
      if (!analysis) {
        // Fallback to basic generation
        const basicSerial = await this.generateBasicSerial(vehicleRegistration, tripDate);
        return { serial: basicSerial, hasGaps: false };
      }

      const gapIssues = analysis.issues.filter(issue => issue.type === 'gap');
      
      if (gapIssues.length > 0) {
        // Suggest filling gaps first
        const suggestions = gapIssues
          .flatMap(issue => issue.missing_serials || [])
          .slice(0, 5); // Show first 5 missing serials

        return {
          serial: await this.generateBasicSerial(vehicleRegistration, tripDate),
          hasGaps: true,
          suggestions
        };
      }

      return {
        serial: await this.generateBasicSerial(vehicleRegistration, tripDate),
        hasGaps: false
      };
    } catch (error) {
      console.error('Error generating serial with gap check:', error);
      const basicSerial = await this.generateBasicSerial(vehicleRegistration, tripDate);
      return { serial: basicSerial, hasGaps: false };
    }
  }

  private static async generateBasicSerial(vehicleRegistration: string, tripDate: string): Promise<string> {
    // This would use the existing trip serial generation logic
    // For now, return a placeholder
    const date = new Date(tripDate);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `${vehicleRegistration}-${dateStr}-001`;
  }
}