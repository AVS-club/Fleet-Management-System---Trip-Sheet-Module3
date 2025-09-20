import React from "react";
import { useFormContext } from "react-hook-form";
import { MaintenanceTask } from "@/types/maintenance";
import Input from "../ui/Input";
import Switch from "../ui/Switch";
import { Calendar, PenTool as PenToolIcon, Bell } from "lucide-react";
import { standardizeDate, validateDate } from "@/utils/dateValidation";

interface Props {
  reminder: boolean;
  onToggle: (checked: boolean) => void;
  odometerReading?: number | null;
}

const NextServiceReminderSection: React.FC<Props> = ({
  reminder,
  onToggle,
  odometerReading,
}) => {
  const { register } = useFormContext<Partial<MaintenanceTask>>();

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Bell className="h-5 w-5 mr-2 text-primary-500" />
          Next Service Reminder
        </h3>
        <Switch
          checked={reminder}
          onChange={(e) => onToggle(e.target.checked)}
          label="Set Reminder"
          inputSize="sm"
        />
      </div>
      {reminder && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Next Service Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            {...register("next_service_due.date", {
              validate: (value) => {
                if (!value) return true; // Optional field
                
                const standardizedDate = standardizeDate(value);
                if (!standardizedDate) {
                  return "Invalid date format";
                }
                
                const dateValidation = validateDate(standardizedDate);
                if (!dateValidation.isValid) {
                  return dateValidation.error;
                }
                
                return true;
              }
            })}
          />
          <Input
            label="Next Service Odometer"
            type="number"
            icon={<PenToolIcon className="h-4 w-4" />}
            {...register("next_service_due.odometer", {
              valueAsNumber: true,
              min: {
                value: odometerReading || 0,
                message: "Must be greater than current reading",
              },
            })}
          />
        </div>
      )}
    </div>
  );
};

export default NextServiceReminderSection;
