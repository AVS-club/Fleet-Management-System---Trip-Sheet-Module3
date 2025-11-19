import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Trip, Vehicle, Driver } from '@/types';
import { Warehouse, Destination } from '@/types/trip';
import { getTrips, getVehicles, getWarehouses, getDestinations } from '../utils/storage';
import { getDrivers } from '../utils/api/drivers';
import { ChevronLeft, IndianRupee, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import Button from '../components/ui/Button';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-toastify';
import { createLogger } from '../utils/logger';

const logger = createLogger('TripPnlReportsPageSimple');

const TripPnlReportsPageSimple: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tripsData, vehiclesData, driversData, warehousesData, destinationsData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers(),
          getWarehouses(),
          getDestinations()
        ]);

        setTrips(tripsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setWarehouses(warehousesData);
        setDestinations(destinationsData);
      } catch (error) {
        logger.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate basic P&L summary
  const pnlSummary = React.useMemo(() => {
    const summary = trips.reduce((acc, trip) => {
      const income = Number(trip.income_amount) || 0;
      const expense = (
        Number(trip.total_fuel_cost || 0) +
        Number(trip.unloading_expense || 0) +
        Number(trip.driver_expense || 0) +
        Number(trip.road_rto_expense || 0) +
        Number(trip.miscellaneous_expense || 0)
      );
      
      acc.totalIncome += income;
      acc.totalExpense += expense;
      acc.netProfit += (income - expense);
      acc.totalTrips++;
      
      if (income > expense) acc.profitableTrips++;
      else if (income < expense) acc.lossTrips++;
      
      return acc;
    }, {
      totalTrips: 0,
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      profitableTrips: 0,
      lossTrips: 0
    });

    return summary;
  }, [trips]);

  if (loading) {
    return (
      <Layout title="Trip P&L Report" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Trip P&L Report"
      subtitle="Analyze profitability of trips"
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/trips')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to Trips
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.totalIncome.toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Expense</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.totalExpense.toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Net Profit</p>
                <p className={`text-2xl font-bold flex items-center ${
                  pnlSummary.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pnlSummary.netProfit.toLocaleString('en-IN')}
                </p>
              </div>
              <IndianRupee className={`h-8 w-8 ${
                pnlSummary.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pnlSummary.totalTrips}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {pnlSummary.profitableTrips} profitable / {pnlSummary.lossTrips} loss
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Customer Analysis Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Customer-wise P&L</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trips
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {destinations.slice(0, 5).map((dest) => {
                  const customerTrips = trips.filter(t => t.destinations?.includes(dest.id));
                  const revenue = customerTrips.reduce((sum, t) => sum + (Number(t.income_amount) || 0), 0);
                  const expenses = customerTrips.reduce((sum, t) => sum + (Number(t.total_expense) || 0), 0);
                  const profit = revenue - expenses;

                  return (
                    <tr key={dest.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {dest.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {customerTrips.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        ₹{revenue.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          ₹{profit.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Trips Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Trips</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trip ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Income
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Expense
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {trips.slice(0, 10).map((trip) => {
                  const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
                  const income = Number(trip.income_amount) || 0;
                  const expense = Number(trip.total_expense) || 0;
                  const profit = income - expense;

                  return (
                    <tr key={trip.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {trip.trip_serial_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(parseISO(trip.trip_start_date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {vehicle?.registration_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                        ₹{income.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                        ₹{expense.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          ₹{profit.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TripPnlReportsPageSimple;

