import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { ChevronLeft, Upload, Download, Filter, Search, UserPlus, Users, RefreshCw, Archive, Trash2, MessageSquare } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatCard from '../../components/ui/StatCard';
import { Driver } from '../../types';
import { getDrivers } from '../../utils/storage';
import { toast } from 'react-toastify';

const AdminDriversPage: React.FC = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    status: 'all',
    licenseExpiry: 'all',
    search: '',
    assignedVehicle: 'all'
  });
  const [showFilters, setShowFilters] = useState(true);
  
  // Stats
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [inactiveDrivers, setInactiveDrivers] = useState(0);
  const [expiringLicenses, setExpiringLicenses] = useState(0);
  const [operationLoading, setOperationLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const driversData = await getDrivers();
        
        if (Array.isArray(driversData)) {
          setDrivers(driversData);
          
          // Calculate stats
          setTotalDrivers(driversData.length);
          setActiveDrivers(driversData.filter(d => d.status === 'active').length);
          setInactiveDrivers(driversData.filter(d => d.status !== 'active').length);
          
          // Check for expiring licenses (within 30 days)
          const today = new Date();
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(today.getDate() + 30);
          
          setExpiringLicenses(driversData.filter(driver => {
            if (!driver.license_expiry_date) return false;
            
            const expiryDate = new Date(driver.license_expiry_date);
            return expiryDate > today && expiryDate <= thirtyDaysFromNow;
          }).length);
        }
      } catch (error) {
        console.error("Error fetching drivers:", error);
        toast.error("Failed to load drivers");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Helper function to delete drivers from Supabase
  const deleteDriversFromSupabase = async (driverIds: string[]): Promise<{ success: number; failed: number }> => {
    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .in('id', driverIds);
      
      if (error) {
        console.error('Supabase deletion error:', error);
        return { success: 0, failed: driverIds.length };
      }
      
      return { success: driverIds.length, failed: 0 };
    } catch (error) {
      console.error('Error deleting drivers:', error);
      return { success: 0, failed: driverIds.length };
    }
  };

  // Helper function to recalculate stats after deletion
  const recalculateStats = (remainingDrivers: Driver[]) => {
    setTotalDrivers(remainingDrivers.length);
    setActiveDrivers(remainingDrivers.filter(d => d.status === 'active').length);
    setInactiveDrivers(remainingDrivers.filter(d => d.status === 'inactive').length);
    
    // Recalculate expiring licenses
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const expiringCount = remainingDrivers.filter(driver => {
      if (!driver.license_expiry_date) return false;
      
      const expiryDate = new Date(driver.license_expiry_date);
      return expiryDate > today && expiryDate <= thirtyDaysFromNow;
    }).length;
    
    setExpiringLicenses(expiringCount);
  };

  const handleImportDrivers = () => {
    // This would open a file upload dialog and process the CSV
    toast.info("Import functionality will be implemented in the future");
  };

  const handleExportDrivers = () => {
    // This would generate and download a CSV of drivers
    toast.info("Export functionality will be implemented in the future");
  };

  const handleBulkAction = async (action: string) => {
    if (selectedDrivers.size === 0) {
      toast.warning("Please select drivers first");
      return;
    }
    
    // Handle different bulk actions
    switch (action) {
      case 'archive':
        toast.info(`Archive action for ${selectedDrivers.size} drivers will be implemented`);
        break;
      case 'delete':
        // Show confirmation dialog
        const confirmDelete = window.confirm(
          `Are you sure you want to permanently delete ${selectedDrivers.size} selected driver(s)? This action cannot be undone and will remove all driver records from the database.`
        );
        
        if (!confirmDelete) {
          return;
        }
        
        setOperationLoading(true);
        try {
          // Convert Set to Array for deletion
          const driverIdsToDelete = Array.from(selectedDrivers);
          
          // Perform bulk deletion
          const result = await deleteDriversFromSupabase(driverIdsToDelete);
          
          if (result.success > 0) {
            // Update local state by filtering out deleted drivers
            const remainingDrivers = drivers.filter(driver => !selectedDrivers.has(driver.id || ''));
            setDrivers(remainingDrivers);
            
            // Recalculate statistics
            recalculateStats(remainingDrivers);
            
            // Clear selection
            setSelectedDrivers(new Set());
            
            // Show success message
            toast.success(`Successfully deleted ${result.success} driver(s)`);
          }
          
          if (result.failed > 0) {
            toast.error(`Failed to delete ${result.failed} driver(s). Please try again.`);
          }
        } catch (error) {
          console.error('Error in bulk delete operation:', error);
          toast.error(`Error deleting drivers: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setOperationLoading(false);
        }
        break;
      case 'whatsapp':
        toast.info(`WhatsApp broadcast for ${selectedDrivers.size} drivers will be implemented`);
        break;
      default:
        toast.info(`Action '${action}' will be implemented`);
    }
  };

  // Filter drivers based on filters
  const filteredDrivers = drivers.filter(driver => {
    // Status filter
    if (filters.status !== 'all' && driver.status !== filters.status) {
      return false;
    }
    
    // License expiry filter
    if (filters.licenseExpiry !== 'all') {
      const today = new Date();
      if (!driver.license_expiry_date) return false;
      
      const expiryDate = new Date(driver.license_expiry_date);
      
      if (filters.licenseExpiry === 'expired' && expiryDate >= today) {
        return false;
      }
      
      if (filters.licenseExpiry === 'valid' && expiryDate < today) {
        return false;
      }
      
      if (filters.licenseExpiry === 'expiring30') {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        
        if (!(expiryDate > today && expiryDate <= thirtyDaysFromNow)) {
          return false;
        }
      }
    }
    
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      if (
        !driver.name.toLowerCase().includes(searchTerm) &&
        !driver.license_number.toLowerCase().includes(searchTerm) &&
        !(driver.contact_number && driver.contact_number.includes(searchTerm))
      ) {
        return false;
      }
    }
    
    // Assigned vehicle filter (placeholder for now)
    if (filters.assignedVehicle !== 'all' && driver.primary_vehicle_id !== filters.assignedVehicle) {
      return false;
    }
    
    return true;
  });

  return (
    <Layout
      title="Driver Management"
      subtitle="Admin tools for driver data management and oversight"
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/admin')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to Admin
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Drivers"
            value={totalDrivers}
            icon={<Users className="h-5 w-5 text-primary-600" />}
          />
          
          <StatCard
            title="Active Drivers"
            value={activeDrivers}
            icon={<Users className="h-5 w-5 text-success-600" />}
          />
          
          <StatCard
            title="Inactive Drivers"
            value={inactiveDrivers}
            icon={<Users className="h-5 w-5 text-gray-500" />}
          />
          
          <StatCard
            title="Expiring Licenses (30d)"
            value={expiringLicenses}
            icon={<Users className="h-5 w-5 text-warning-600" />}
            warning={expiringLicenses > 0}
          />
        </div>
        
        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <h3 className="text-lg font-medium">Driver Filters</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                icon={<Filter className="h-4 w-4" />}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              
              <Button
                variant="outline" 
                size="sm"
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <Input
                placeholder="Search drivers..."
                icon={<Search className="h-4 w-4" />}
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
              />
              
              {/* Status Filter */}
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'onLeave', label: 'On Leave' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'blacklisted', label: 'Blacklisted' }
                ]}
                value={filters.status}
                onChange={e => setFilters({...filters, status: e.target.value})}
              />
              
              {/* License Expiry Filter */}
              <Select
                options={[
                  { value: 'all', label: 'All Licenses' },
                  { value: 'valid', label: 'Valid' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'expiring30', label: 'Expiring in 30 Days' }
                ]}
                value={filters.licenseExpiry}
                onChange={e => setFilters({...filters, licenseExpiry: e.target.value})}
              />
              
              {/* Vehicle Assignment Filter */}
              <Select
                options={[
                  { value: 'all', label: 'All Assignments' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'unassigned', label: 'Unassigned' }
                ]}
                value={filters.assignedVehicle}
                onChange={e => setFilters({...filters, assignedVehicle: e.target.value})}
              />
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="primary"
              onClick={() => navigate('/drivers')}
              icon={<UserPlus className="h-4 w-4" />}
            >
              Add Driver
            </Button>
            
            <Button
              variant="outline"
              onClick={handleImportDrivers}
              icon={<Upload className="h-4 w-4" />}
            >
              Import CSV
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExportDrivers}
              icon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
            
            {selectedDrivers.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleBulkAction('archive')}
                  icon={<Archive className="h-4 w-4" />}
                >
                  Archive Selected
                </Button>
                
                <Button
                  variant="danger"
                  onClick={() => handleBulkAction('delete')}
                  disabled={operationLoading}
                  isLoading={operationLoading && selectedDrivers.size > 0}
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  Delete Selected
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleBulkAction('whatsapp')}
                  disabled={operationLoading}
                  icon={<MessageSquare className="h-4 w-4 text-green-600" />}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  WhatsApp Selected
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Driver Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="ml-3 text-gray-600">Loading drivers...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm">
            {filteredDrivers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-900 mb-1">No drivers found</p>
                <p className="text-gray-500">Try adjusting your filters or add new drivers</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input 
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        License
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        License Expiry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDrivers.map(driver => (
                      <tr key={driver.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={selectedDrivers.has(driver.id || '')}
                            onChange={(e) => {
                              const newSelected = new Set(selectedDrivers);
                              if (e.target.checked) {
                                newSelected.add(driver.id || '');
                              } else {
                                newSelected.delete(driver.id || '');
                              }
                              setSelectedDrivers(newSelected);
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {driver.driver_photo_url ? (
                                <img className="h-10 w-10 rounded-full object-cover" src={driver.driver_photo_url} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                              <div className="text-xs text-gray-500">Since {new Date(driver.join_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {driver.license_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                            driver.status === 'active' 
                              ? 'bg-success-100 text-success-800'
                              : driver.status === 'onLeave'
                              ? 'bg-blue-100 text-blue-800'
                              : driver.status === 'suspended' || driver.status === 'blacklisted'
                              ? 'bg-error-100 text-error-800'
                              : 'bg-gray-100 text-gray-800'
                          } capitalize`}>
                            {driver.status.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {driver.license_expiry_date ? (
                            <span className={`${
                              new Date(driver.license_expiry_date) < new Date() 
                                ? 'text-error-600' 
                                : new Date(driver.license_expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-warning-600'
                                : 'text-gray-900'
                            }`}>
                              {new Date(driver.license_expiry_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div>
                            <div className="text-gray-900">{driver.contact_number}</div>
                            {driver.email && <div className="text-xs text-gray-500">{driver.email}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {driver.primary_vehicle_id ? (
                            <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs">
                              Assigned
                            </span>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => navigate(`/drivers/${driver.id}`)}
                              className="text-primary-600 hover:text-primary-900"
                              title="View Driver"
                            >
                              <Users className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toast.info(`WhatsApp communication will be implemented`)}
                              className="text-green-600 hover:text-green-900"
                              title="WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toast.info(`Archive functionality will be implemented`)}
                              className="text-warning-600 hover:text-warning-900"
                              title="Archive Driver"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDriversPage;