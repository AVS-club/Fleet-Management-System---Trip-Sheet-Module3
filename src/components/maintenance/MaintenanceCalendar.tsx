import React, { useState, useEffect, useMemo } from "react";
import { MaintenanceTask } from "@/types/maintenance";
import { Vehicle } from "@/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Button from "../ui/Button";
import { useNavigate } from "react-router-dom";

interface MaintenanceCalendarProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'start' | 'end' | 'due' | 'overdue';
  status: string;
  priority: string;
  vehicleId: string;
  vehicleRegistration: string;
  task: MaintenanceTask;
}

const MaintenanceCalendar: React.FC<MaintenanceCalendarProps> = ({ tasks, vehicles }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Create a map of vehicles for quick lookup
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);

  // Generate calendar events from maintenance tasks
  useEffect(() => {
    const calendarEvents: CalendarEvent[] = [];

    tasks.forEach(task => {
      const vehicle = vehicleMap.get(task.vehicle_id);
      if (!vehicle) return;

      const vehicleRegistration = vehicle.registration_number;

      // Add start date event
      if (task.start_date) {
        const startDate = new Date(task.start_date);
        calendarEvents.push({
          id: `${task.id}-start`,
          title: `Start: ${task.task_type}`,
          date: startDate,
          type: 'start',
          status: task.status,
          priority: task.priority,
          vehicleId: task.vehicle_id,
          vehicleRegistration,
          task,
        });
      }

      // Add end date event
      if (task.end_date) {
        const endDate = new Date(task.end_date);
        calendarEvents.push({
          id: `${task.id}-end`,
          title: `End: ${task.task_type}`,
          date: endDate,
          type: 'end',
          status: task.status,
          priority: task.priority,
          vehicleId: task.vehicle_id,
          vehicleRegistration,
          task,
        });
      }

      // Add next service due event
      if (task.next_service_due?.date) {
        const dueDate = new Date(task.next_service_due.date);
        const isOverdue = isPast(dueDate) && task.status !== 'resolved';
        
        calendarEvents.push({
          id: `${task.id}-due`,
          title: `Due: ${task.task_type}`,
          date: dueDate,
          type: isOverdue ? 'overdue' : 'due',
          status: task.status,
          priority: task.priority,
          vehicleId: task.vehicle_id,
          vehicleRegistration,
          task,
        });
      }
    });

    setEvents(calendarEvents);
  }, [tasks, vehicleMap]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => isSameDay(event.date, date));
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get event type styling
  const getEventTypeStyle = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'start':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'end':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'due':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get priority styling
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-red-500';
      case 'high':
        return 'border-l-4 border-orange-500';
      case 'medium':
        return 'border-l-4 border-yellow-500';
      case 'low':
        return 'border-l-4 border-green-500';
      default:
        return 'border-l-4 border-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'escalated':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'open':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <CalendarIcon className="h-6 w-6 text-primary-500" />
          <h2 className="text-xl font-semibold text-gray-900">
            Maintenance Calendar
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            inputSize="sm"
            onClick={goToPreviousMonth}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          
          <Button
            variant="outline"
            inputSize="sm"
            onClick={goToToday}
          >
            Today
          </Button>
          
          <Button
            variant="outline"
            inputSize="sm"
            onClick={goToNextMonth}
            icon={<ChevronRight className="h-4 w-4" />}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Month/Year Display */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="xl:col-span-2">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const dayEvents = getEventsForDate(day);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border border-gray-200 cursor-pointer hover:bg-gray-50
                    ${isCurrentDay ? 'bg-primary-50 border-primary-200' : ''}
                    ${isSelected ? 'bg-primary-100 border-primary-300' : ''}
                    ${isPast(day) && !isCurrentDay ? 'bg-gray-50' : ''}
                  `}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`
                      text-sm font-medium
                      ${isCurrentDay ? 'text-primary-600' : 'text-gray-900'}
                      ${isSelected ? 'text-primary-700' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-xs bg-primary-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className={`
                          text-xs p-1 rounded border
                          ${getEventTypeStyle(event.type)}
                          ${getPriorityStyle(event.priority)}
                        `}
                        title={`${event.title} - ${event.vehicleRegistration}`}
                      >
                        <div className="truncate">{event.title}</div>
                        <div className="text-xs opacity-75 truncate">
                          {event.vehicleRegistration}
                        </div>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events */}
        <div className="xl:col-span-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
            </h4>
            
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map(event => (
                  <div
                    key={event.id}
                    className={`
                      bg-white rounded-lg p-3 border cursor-pointer hover:shadow-md transition-shadow
                      ${getPriorityStyle(event.priority)}
                    `}
                    onClick={() => navigate(`/maintenance/${event.task.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(event.status)}
                        <span className="text-sm font-medium text-gray-900">
                          {event.title}
                        </span>
                      </div>
                      <span className={`
                        text-xs px-2 py-1 rounded-full
                        ${getEventTypeStyle(event.type)}
                      `}>
                        {event.type}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-1">
                      Vehicle: {event.vehicleRegistration}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      Priority: <span className="capitalize">{event.priority}</span>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      Status: <span className="capitalize">{event.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                {selectedDate ? 'No events on this date' : 'Click on a date to view events'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceCalendar;

