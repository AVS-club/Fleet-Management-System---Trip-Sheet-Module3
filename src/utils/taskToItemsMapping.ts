/**
 * Mapping of maintenance tasks to their corresponding line items
 * Used to auto-populate line items when tasks are selected
 */

export const TASK_TO_ITEMS: Record<string, string[]> = {
  // Battery Related
  'Battery Purchase': ['Battery'],
  'Battery Installation': [],
  'Battery Charging': [],
  'Battery Terminal Cleaning': [],
  
  // Oil Related
  'Engine Oil Purchase': ['Engine Oil'],
  'Oil Filter Purchase': ['Oil Filter'],
  'Engine Oil Change': [],
  'Oil Filter Replacement': [],
  
  // Air Filter
  'Air Filter Purchase': ['Air Filter'],
  'Air Filter Cleaning': [],
  'Air Filter Replacement': [],
  
  // Fuel Filter
  'Fuel Filter Purchase': ['Fuel Filter'],
  'Fuel Filter Replacement': [],
  
  // Brake Related
  'Brake Pad Purchase': ['Brake Pads'],
  'Brake Shoe Purchase': ['Brake Shoes'],
  'Brake Disc Purchase': ['Brake Disc'],
  'Brake Drum Purchase': ['Brake Drum'],
  'Brake Oil Purchase': ['Brake Oil'],
  'Brake Pad Replacement': [],
  'Brake Shoe Replacement': [],
  'Brake Disc Resurfacing': [],
  'Brake Drum Turning': [],
  'Brake Fluid Replacement': [],
  'Brake Bleeding': [],
  'Brake Adjustment': [],
  'Handbrake Adjustment': [],
  
  // Clutch Related
  'Clutch Plate Purchase': ['Clutch Plate'],
  'Clutch Assembly Purchase': ['Clutch Assembly'],
  'Clutch Plate Replacement': [],
  'Clutch Assembly Replacement': [],
  'Clutch Adjustment': [],
  'Clutch Cable Replacement': [],
  
  // Cooling System
  'Coolant Purchase': ['Coolant'],
  'Radiator Hose Purchase': ['Radiator Hose'],
  'Water Pump Purchase': ['Water Pump'],
  'Thermostat Purchase': ['Thermostat'],
  'Coolant Flush/Radiator Flush': [],
  'Coolant Top-up': [],
  'Radiator Cleaning': [],
  'Radiator Hose Replacement': [],
  'Thermostat Replacement': [],
  'Water Pump Replacement': [],
  
  // Electrical
  'Alternator Purchase': ['Alternator'],
  'Starter Motor Purchase': ['Starter Motor'],
  'Light Bulb Purchase': ['Light Bulbs'],
  'Fuse Purchase': ['Fuses'],
  'Alternator Check': [],
  'Alternator Replacement': [],
  'Starter Motor Service': [],
  'Starter Motor Replacement': [],
  'Wiring Repairs': [],
  'Light Bulb Replacement': [],
  'Fuse Replacement': [],
  
  // Suspension
  'Shock Absorber Purchase': ['Shock Absorbers'],
  'Spring Purchase': ['Springs'],
  'Ball Joint Purchase': ['Ball Joints'],
  'Tie Rod End Purchase': ['Tie Rod Ends'],
  'Wheel Bearing Purchase': ['Wheel Bearings'],
  'Shock Absorber Replacement': [],
  'Spring Replacement': [],
  'Ball Joint Replacement': [],
  'Tie Rod End Replacement': [],
  'Wheel Bearing Service': [],
  'Wheel Bearing Replacement': [],
  'Steering Adjustment': [],
  'Power Steering Fluid Check': [],
  
  // Spark/Glow Plugs
  'Spark Plug Purchase': ['Spark Plugs'],
  'Glow Plug Purchase': ['Glow Plugs'],
  
  // Belts
  'Timing Belt Purchase': ['Timing Belt'],
  'Drive Belt Purchase': ['Drive Belt'],
  'Belt Tensioning': [],
  'Belt Replacement': [],
  
  // Wipers
  'Windshield Wiper Purchase': ['Wiper Blades'],
  'Windshield Wiper Replacement': [],
  
  // Tyre Related
  'Tyre Purchase': ['Tyres'],
  'Tyre Installation': [],
  'Tyre Rotation': [],
  'Tyre Puncture Repair': [],
  'Tyre Pressure Check': [],
  'Wheel Alignment': [],
  'Wheel Balancing': [],
  'Spare Tyre Mount': [],
  
  // General Parts
  'Parts Purchase': [],
  
  // Service Tasks (no parts by default)
  'General Service': [],
  'Periodic Maintenance': [],
  'Repair Work': [],
  'Tappet Adjustment': [],
  'Engine Tune-up': [],
  'Injector Cleaning': [],
  'Transmission Oil Change': [],
  'Differential Oil Change': [],
  'AC Service/Gas Filling': [],
  'AC Compressor Replacement': [],
  'Underbody Wash': [],
  'Chassis Greasing': [],
  'Engine Decarbonization': [],
  'DPF Cleaning': [],
  'EGR Valve Cleaning': [],
};

/**
 * Extract part names from selected tasks
 * @param tasks Array of task names
 * @returns Array of suggested line item names
 */
export const getLineItemsFromTasks = (tasks: string[]): string[] => {
  const items: string[] = [];
  
  tasks.forEach(task => {
    const mappedItems = TASK_TO_ITEMS[task];
    if (mappedItems && mappedItems.length > 0) {
      items.push(...mappedItems);
    }
  });
  
  // Remove duplicates
  return [...new Set(items)];
};

/**
 * Check if a task typically involves purchasing parts
 * @param task Task name
 * @returns true if task involves purchase
 */
export const isPurchaseTask = (task: string): boolean => {
  return task.includes('Purchase');
};

/**
 * Get a clean part name from a task name
 * Examples:
 * - "Battery Purchase" → "Battery"
 * - "Engine Oil Change" → "Engine Oil"
 */
export const getPartNameFromTask = (task: string): string => {
  // Remove common suffixes
  return task
    .replace(/\s+Purchase$/i, '')
    .replace(/\s+Replacement$/i, '')
    .replace(/\s+Installation$/i, '')
    .replace(/\s+Change$/i, '')
    .trim();
};

