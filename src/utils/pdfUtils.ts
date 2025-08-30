import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Vehicle, Driver } from '../types';

// Helper function to add a section title to the PDF
const addSectionTitle = (doc: jsPDF, title: string, y: number): number => {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text(title, 14, y);
  doc.setLineWidth(0.5);
  doc.setDrawColor(44, 62, 80);
  doc.line(14, y + 1, 196, y + 1);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  return y + 10;
};

// Helper function to add a field to the PDF
const addField = (
  doc: jsPDF,
  label: string,
  value: string,
  y: number
): number => {
  doc.setFont('helvetica', 'bold');
  doc.text(label + ':', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(value || 'N/A', 60, y);
  return y + 7;
};

// Helper function to add a status badge to the PDF
const addStatusBadge = (
  doc: jsPDF,
  label: string,
  status: string,
  y: number
): number => {
  doc.setFont('helvetica', 'bold');
  doc.text(label + ':', 14, y);

  let color = [0, 0, 0];
  if (status.toLowerCase().includes('active') || status.toLowerCase().includes('valid')) {
    color = [39, 174, 96];
  } else if (status.toLowerCase().includes('expired') || status.toLowerCase().includes('inactive')) {
    color = [231, 76, 60];
  } else if (status.toLowerCase().includes('pending') || status.toLowerCase().includes('maintenance')) {
    color = [243, 156, 18];
  }

  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(60, y - 4, 30, 5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(status.toUpperCase(), 75, y, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  return y + 7;
};

export const generateVehiclePDF = async (vehicle: Vehicle, stats: any): Promise<jsPDF> => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text('Vehicle Profile', 105, 20, { align: 'center' });

  doc.setFontSize(16);
  doc.text(vehicle.registration_number, 105, 30, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${vehicle.make} ${vehicle.model} (${vehicle.year})`, 105, 38, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 45, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  let y = 55;
  y = addSectionTitle(doc, 'Vehicle Details', y);
  y = addField(doc, 'Registration Number', vehicle.registration_number, y);
  y = addField(doc, 'Chassis Number', vehicle.chassis_number || 'N/A', y);
  y = addField(doc, 'Engine Number', vehicle.engine_number || 'N/A', y);
  y = addField(doc, 'Make & Model', `${vehicle.make} ${vehicle.model}`, y);
  y = addField(doc, 'Year', vehicle.year.toString(), y);
  y = addField(doc, 'Type', vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1), y);
  y = addField(doc, 'Fuel Type', vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1), y);
  y = addField(doc, 'Current Odometer', `${vehicle.current_odometer.toLocaleString()} km`, y);

  y += 5;
  y = addSectionTitle(doc, 'Document Status', y);
  y = addStatusBadge(doc, 'RC', vehicle.rc_status || 'Unknown', y);
  y = addStatusBadge(doc, 'Insurance', vehicle.insurance_status || 'Unknown', y);
  y = addStatusBadge(doc, 'Fitness', vehicle.fitness_status || 'Unknown', y);
  y = addStatusBadge(doc, 'Permit', vehicle.permit_status || 'Unknown', y);
  y = addStatusBadge(doc, 'PUC', vehicle.puc_status || 'Unknown', y);

  y += 5;
  y = addSectionTitle(doc, 'Performance Stats', y);
  y = addField(doc, 'Total Trips', stats.totalTrips.toString(), y);
  y = addField(doc, 'Total Distance', `${stats.totalDistance.toLocaleString()} km`, y);
  if (stats.averageKmpl !== undefined) {
    y = addField(doc, 'Average Mileage', `${stats.averageKmpl.toFixed(2)} km/L`, y);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Auto Vital Solution - Vehicle Profile - Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
  }

  return doc;
};

export const generateDriverPDF = async (
  driver: Driver,
  trips: any[],
  primaryVehicle?: any
): Promise<jsPDF> => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(44, 62, 80);
  doc.text('Driver Profile', 105, 20, { align: 'center' });

  doc.setFontSize(16);
  doc.text(driver.name, 105, 30, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`License: ${driver.license_number}`, 105, 38, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 45, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  let y = 55;
  y = addSectionTitle(doc, 'Driver Details', y);
  y = addField(doc, 'Name', driver.name, y);
  y = addField(doc, 'License Number', driver.license_number, y);
  y = addField(doc, 'Contact Number', driver.contact_number, y);
  y = addField(doc, 'Email', driver.email || 'N/A', y);
  y = addField(doc, 'Join Date', new Date(driver.join_date).toLocaleDateString(), y);
  y = addField(doc, 'Experience', `${driver.experience_years} years`, y);
  y = addStatusBadge(doc, 'Status', driver.status, y);

  y += 5;
  y = addSectionTitle(doc, 'License Status', y);
  if (driver.license_expiry_date) {
    const licenseStatus = new Date(driver.license_expiry_date) > new Date() ? 'Valid' : 'Expired';
    y = addStatusBadge(doc, 'License', licenseStatus, y);
    y = addField(doc, 'License Expiry', new Date(driver.license_expiry_date).toLocaleDateString(), y);
  } else {
    y = addField(doc, 'License Status', 'Not Available', y);
  }
  y = addField(doc, 'Documents Verified', driver.documents_verified ? 'Yes' : 'No', y);

  if (primaryVehicle) {
    y += 5;
    y = addSectionTitle(doc, 'Primary Vehicle', y);
    y = addField(doc, 'Registration', primaryVehicle.registration_number, y);
    y = addField(doc, 'Make & Model', `${primaryVehicle.make} ${primaryVehicle.model}`, y);
    y = addField(doc, 'Type', primaryVehicle.type.charAt(0).toUpperCase() + primaryVehicle.type.slice(1), y);
    y = addStatusBadge(doc, 'Vehicle Status', primaryVehicle.status, y);
  }

  y += 5;
  y = addSectionTitle(doc, 'Performance Metrics', y);

  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
  const tripsWithMileage = trips.filter((trip) => trip.calculated_kmpl && !trip.short_trip);
  const averageMileage =
    tripsWithMileage.length > 0
      ? tripsWithMileage.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithMileage.length
      : 0;

  y = addField(doc, 'Total Trips', totalTrips.toString(), y);
  y = addField(doc, 'Total Distance', `${totalDistance.toLocaleString()} km`, y);
  y = addField(doc, 'Average Mileage', averageMileage > 0 ? `${averageMileage.toFixed(2)} km/L` : 'N/A', y);

  if (driver.performance_metrics?.risk_score !== undefined) {
    let riskLabel = 'Low Risk';
    if (driver.performance_metrics.risk_score > 70) riskLabel = 'High Risk';
    else if (driver.performance_metrics.risk_score > 30) riskLabel = 'Medium Risk';

    y = addField(doc, 'Risk Score', `${driver.performance_metrics.risk_score}% (${riskLabel})`, y);
  }

  if (trips.length > 0) {
    y += 10;
    y = addSectionTitle(doc, 'Recent Trips', y);
    const tableColumn = ['Date', 'Vehicle', 'Distance', 'Mileage'];
    const tableRows = trips
      .slice(0, 5)
      .map((trip) => [
        new Date(trip.trip_end_date).toLocaleDateString(),
        trip.vehicle_registration || 'Unknown',
        `${(trip.end_km - trip.start_km).toLocaleString()} km`,
        trip.calculated_kmpl ? `${trip.calculated_kmpl.toFixed(2)} km/L` : '-',
      ]);
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 175, 80], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Auto Vital Solution - Driver Profile - Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
  }

  return doc;
};
