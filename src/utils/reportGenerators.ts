import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// PDF Generation Utility
export const generatePDF = async (
  elementId: string, 
  fileName: string,
  options: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
    margin?: number;
    scale?: number;
  } = {}
): Promise<void> => {
  const {
    orientation = 'portrait',
    format = 'a4',
    margin = 20,
    scale = 2
  } = options;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Add print styles temporarily
    const originalStyles = element.style.cssText;
    element.style.cssText += `
      @media print {
        .report-container { 
          max-width: none !important; 
          margin: 0 !important; 
          padding: 0 !important;
        }
        .page-break { 
          page-break-after: always; 
        }
        .no-break { 
          page-break-inside: avoid; 
        }
      }
    `;

    const canvas = await html2canvas(element, {
      scale,
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight
    });

    // Restore original styles
    element.style.cssText = originalStyles;

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format
    });

    const imgWidth = format === 'a4' ? 210 : 216;
    const pageHeight = format === 'a4' ? 295 : 279;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth - (margin * 2), imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth - (margin * 2), imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Excel Generation Utility
export const generateExcel = (
  data: any,
  fileName: string,
  options: {
    sheetName?: string;
    includeCharts?: boolean;
    formatCells?: boolean;
  } = {}
): void => {
  const {
    sheetName = 'Report Data',
    includeCharts = false,
    formatCells = true
  } = options;

  try {
    const workbook = XLSX.utils.book_new();

    // Handle different data types
    if (Array.isArray(data)) {
      // Simple array of objects
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      if (formatCells) {
        // Auto-size columns
        const colWidths = Object.keys(data[0] || {}).map(key => ({
          wch: Math.max(key.length, 15)
        }));
        worksheet['!cols'] = colWidths;
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    } else if (typeof data === 'object' && data !== null) {
      // Object with multiple sheets
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          const worksheet = XLSX.utils.json_to_sheet(value);
          
          if (formatCells) {
            const colWidths = Object.keys(value[0] || {}).map(() => ({ wch: 15 }));
            worksheet['!cols'] = colWidths;
          }

          XLSX.utils.book_append_sheet(workbook, worksheet, key);
        }
      });
    }

    // Save the Excel file
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw new Error(`Failed to generate Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Specialized Excel generators for different report types
export const generateWeeklyComparisonExcel = (data: any): void => {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Metric', 'Previous Week', 'Current Week', 'Change (%)'],
    ['Total Trips', data.previousWeek.totalTrips, data.currentWeek.totalTrips, data.percentageChange.trips],
    ['Total Distance (km)', data.previousWeek.totalDistance, data.currentWeek.totalDistance, data.percentageChange.distance],
    ['Fuel Consumed (L)', data.previousWeek.fuelConsumed, data.currentWeek.fuelConsumed, data.percentageChange.fuel],
    ['Avg Fuel Efficiency (km/L)', data.previousWeek.avgFuelEfficiency, data.currentWeek.avgFuelEfficiency, data.percentageChange.efficiency],
    ['Total Cost (₹)', data.previousWeek.totalCost, data.currentWeek.totalCost, data.percentageChange.cost]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Detailed metrics sheet
  const metricsSheet = XLSX.utils.json_to_sheet(data.metrics);
  metricsSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Detailed Metrics');

  XLSX.writeFile(workbook, 'Weekly_Comparison_Report.xlsx');
};

export const generateTripSummaryExcel = (data: any): void => {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Trips', data.totalTrips],
    ['Total Distance (km)', data.totalDistance],
    ['Average Duration (min)', data.avgDuration],
    ['Average Fuel Efficiency (km/L)', data.avgFuelEfficiency],
    ['Total Fuel Cost (₹)', data.totalFuelCost],
    ['Total Active Hours', data.summaryStats.totalActiveHours],
    ['Average Speed (km/h)', data.summaryStats.avgSpeed],
    ['Most Used Vehicle', data.summaryStats.mostUsedVehicle],
    ['Top Driver', data.summaryStats.topDriver]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Trip details sheet
  const tripsSheet = XLSX.utils.json_to_sheet(data.trips);
  tripsSheet['!cols'] = [
    { wch: 12 }, // Trip ID
    { wch: 15 }, // Vehicle
    { wch: 20 }, // Driver
    { wch: 25 }, // Start Location
    { wch: 25 }, // End Location
    { wch: 12 }, // Distance
    { wch: 12 }, // Duration
    { wch: 15 }, // Start Time
    { wch: 12 }  // Fuel Cost
  ];
  XLSX.utils.book_append_sheet(workbook, tripsSheet, 'Trip Details');

  XLSX.writeFile(workbook, 'Trip_Summary_Report.xlsx');
};

export const generateVehicleUtilizationExcel = (data: any): void => {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Fleet Utilization (%)', data.performanceMetrics.totalFleetUtilization],
    ['High Utilization Vehicles', data.highUtilization],
    ['Medium Utilization Vehicles', data.mediumUtilization],
    ['Low Utilization Vehicles', data.lowUtilization],
    ['Average Fuel Efficiency (km/L)', data.performanceMetrics.avgFuelEfficiency],
    ['Total Active Hours', data.performanceMetrics.totalActiveHours],
    ['Total Idle Hours', data.performanceMetrics.totalIdleHours]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Vehicle details sheet
  const vehiclesSheet = XLSX.utils.json_to_sheet(data.vehicles);
  vehiclesSheet['!cols'] = [
    { wch: 15 }, // Vehicle Number
    { wch: 20 }, // Model
    { wch: 12 }, // Utilization
    { wch: 10 }, // Total Trips
    { wch: 15 }, // Total Distance
    { wch: 12 }, // Active Hours
    { wch: 12 }, // Idle Time
    { wch: 15 }, // Fuel Efficiency
    { wch: 12 }, // Avg Speed
    { wch: 15 }  // Last Trip Date
  ];
  XLSX.utils.book_append_sheet(workbook, vehiclesSheet, 'Vehicle Details');

  // Weekly trends sheet
  const weeklyTrendsSheet = XLSX.utils.json_to_sheet(data.utilizationTrends.weekly);
  weeklyTrendsSheet['!cols'] = [{ wch: 10 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, weeklyTrendsSheet, 'Weekly Trends');

  XLSX.writeFile(workbook, 'Vehicle_Utilization_Report.xlsx');
};

export const generateDriverPerformanceExcel = (data: any): void => {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Drivers', data.performanceMetrics.totalDrivers],
    ['Average Rating', data.performanceMetrics.avgRating],
    ['Average Safety Score', data.performanceMetrics.avgSafetyScore],
    ['Average Fuel Efficiency (km/L)', data.performanceMetrics.avgFuelEfficiency],
    ['Total Trips', data.performanceMetrics.totalTrips],
    ['Total Violations', data.safetyMetrics.totalViolations],
    ['Accidents', data.safetyMetrics.accidents],
    ['Near Misses', data.safetyMetrics.nearMisses],
    ['Safety Training Completed', data.safetyMetrics.safetyTrainingCompleted]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Top performers sheet
  const topPerformersSheet = XLSX.utils.json_to_sheet(data.topPerformers);
  topPerformersSheet['!cols'] = [
    { wch: 20 }, // Name
    { wch: 10 }, // Rating
    { wch: 12 }, // Total Trips
    { wch: 12 }, // Safety Score
    { wch: 15 }  // Fuel Efficiency
  ];
  XLSX.utils.book_append_sheet(workbook, topPerformersSheet, 'Top Performers');

  // All drivers sheet
  const driversSheet = XLSX.utils.json_to_sheet(data.drivers);
  driversSheet['!cols'] = [
    { wch: 20 }, // Name
    { wch: 12 }, // Safety Score
    { wch: 15 }, // Fuel Efficiency
    { wch: 12 }, // Punctuality
    { wch: 12 }, // Rating
    { wch: 10 }, // Trips
    { wch: 15 }, // Total Distance
    { wch: 12 }, // Avg Speed
    { wch: 10 }, // Violations
    { wch: 15 }  // Last Trip Date
  ];
  XLSX.utils.book_append_sheet(workbook, driversSheet, 'All Drivers');

  XLSX.writeFile(workbook, 'Driver_Performance_Report.xlsx');
};

export const generateMonthlyComparisonExcel = (data: any): void => {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Metric', 'Value'],
    ['Month', `${data.monthName} ${data.year}`],
    ['Active Vehicles', data.activeVehicles],
    ['Total Trips', data.totalTrips],
    ['Total Distance (km)', data.totalDistance],
    ['Total Fuel Consumed (L)', data.totalFuelConsumed],
    ['Average Fuel Efficiency (km/L)', data.avgFuelEfficiency],
    ['Total Cost (₹)', data.totalCost]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Weekly breakdown sheet
  const weeklyBreakdownSheet = XLSX.utils.json_to_sheet(data.weeklyBreakdown);
  weeklyBreakdownSheet['!cols'] = [
    { wch: 10 }, // Week
    { wch: 10 }, // Trips
    { wch: 15 }, // Distance
    { wch: 12 }, // Fuel
    { wch: 15 }  // Cost
  ];
  XLSX.utils.book_append_sheet(workbook, weeklyBreakdownSheet, 'Weekly Breakdown');

  // Vehicle metrics sheet
  const vehicleMetricsSheet = XLSX.utils.json_to_sheet(data.vehicleMetrics);
  vehicleMetricsSheet['!cols'] = [
    { wch: 15 }, // Registration Number
    { wch: 20 }, // Model
    { wch: 10 }, // Trips
    { wch: 15 }, // Distance
    { wch: 15 }, // Fuel Efficiency
    { wch: 12 }  // Utilization
  ];
  XLSX.utils.book_append_sheet(workbook, vehicleMetricsSheet, 'Vehicle Metrics');

  XLSX.writeFile(workbook, 'Monthly_Comparison_Report.xlsx');
};

// Utility function to format data for export
export const formatDataForExport = (data: any, reportType: string): any => {
  switch (reportType) {
    case 'weekly-comparison':
      return {
        summary: [
          { metric: 'Total Trips', previous: data.previousWeek.totalTrips, current: data.currentWeek.totalTrips, change: data.percentageChange.trips },
          { metric: 'Total Distance (km)', previous: data.previousWeek.totalDistance, current: data.currentWeek.totalDistance, change: data.percentageChange.distance },
          { metric: 'Fuel Consumed (L)', previous: data.previousWeek.fuelConsumed, current: data.currentWeek.fuelConsumed, change: data.percentageChange.fuel },
          { metric: 'Avg Fuel Efficiency (km/L)', previous: data.previousWeek.avgFuelEfficiency, current: data.currentWeek.avgFuelEfficiency, change: data.percentageChange.efficiency },
          { metric: 'Total Cost (₹)', previous: data.previousWeek.totalCost, current: data.currentWeek.totalCost, change: data.percentageChange.cost }
        ],
        metrics: data.metrics
      };
    
    case 'trip-summary':
      return {
        summary: {
          totalTrips: data.totalTrips,
          totalDistance: data.totalDistance,
          avgDuration: data.avgDuration,
          avgFuelEfficiency: data.avgFuelEfficiency,
          totalFuelCost: data.totalFuelCost
        },
        trips: data.trips,
        stats: data.summaryStats
      };
    
    case 'vehicle-utilization':
      return {
        summary: {
          totalFleetUtilization: data.performanceMetrics.totalFleetUtilization,
          highUtilization: data.highUtilization,
          mediumUtilization: data.mediumUtilization,
          lowUtilization: data.lowUtilization
        },
        vehicles: data.vehicles,
        trends: data.utilizationTrends
      };
    
    case 'driver-performance':
      return {
        summary: {
          totalDrivers: data.performanceMetrics.totalDrivers,
          avgRating: data.performanceMetrics.avgRating,
          avgSafetyScore: data.performanceMetrics.avgSafetyScore,
          totalTrips: data.performanceMetrics.totalTrips
        },
        topPerformers: data.topPerformers,
        drivers: data.drivers,
        safety: data.safetyMetrics
      };
    
    case 'monthly-comparison':
      return {
        summary: {
          month: `${data.monthName} ${data.year}`,
          activeVehicles: data.activeVehicles,
          totalTrips: data.totalTrips,
          totalDistance: data.totalDistance,
          totalCost: data.totalCost
        },
        weeklyBreakdown: data.weeklyBreakdown,
        vehicleMetrics: data.vehicleMetrics
      };
    
    default:
      return data;
  }
};
