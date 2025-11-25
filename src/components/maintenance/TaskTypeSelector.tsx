import React, { useState, useRef, useEffect } from "react";
import { PenTool, Check } from "lucide-react";

interface TaskTypeSelectorProps {
  selectedTaskType?: string;
  onChange: (taskType: string) => void;
  error?: string;
}

const TASK_TYPES = [
  {
    value: "general_scheduled_service",
    label: "General Scheduled Service",
  },
  {
    value: "wear_and_tear_replacement_repairs",
    label: "Wear and Tear / Replacement Repairs",
  },
  {
    value: "accidental",
    label: "Accidental",
  },
  {
    value: "others",
    label: "Others",
  },
];

const TaskTypeSelector: React.FC<TaskTypeSelectorProps> = ({
  selectedTaskType,
  onChange,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMenuAbove, setIsMenuAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (isOpen && inputContainerRef.current && dropdownMenuRef.current) {
      const inputRect = inputContainerRef.current.getBoundingClientRect();
      const dropdownHeight = Math.min(
        dropdownMenuRef.current.scrollHeight,
        250
      );
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setIsMenuAbove(true);
      } else {
        setIsMenuAbove(false);
      }
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredTaskTypes = TASK_TYPES.filter((taskType) =>
    taskType.label
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const selectedTaskTypeDetails = TASK_TYPES.find(
    (t) => t.value === selectedTaskType
  );

  return (
    <div className="space-y-2 relative z-30">
      <label className="block text-sm font-medium text-gray-700">
        Maintenance Type
        <span className="text-error-500 ml-1">*</span>
      </label>

      <div className="relative" ref={dropdownRef}>
        <div
          ref={inputContainerRef}
          className={`min-h-[42px] border rounded-lg bg-white ${
            error ? "border-error-500" : "border-gray-300"
          } ${isOpen ? "ring-2 ring-primary-500" : ""}`}
        >
          {isOpen ? (
            <div className="p-2">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full p-2 border-0 focus:outline-none bg-transparent"
                placeholder="Search maintenance types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div 
              className="p-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setIsOpen(true)}
            >
              {selectedTaskTypeDetails ? (
                <div className="flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {selectedTaskTypeDetails.label}
                  </span>
                </div>
              ) : (
                <div className="text-gray-500">Select maintenance type</div>
              )}
            </div>
          )}
        </div>

        {isOpen && (
          <div
            ref={dropdownMenuRef}
            style={{
              position: "absolute",
              [isMenuAbove ? "bottom" : "top"]: isMenuAbove
                ? "calc(100% + 4px)"
                : "calc(100% + 4px)",
              left: 0,
              right: 0,
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: "0.5rem",
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 9999,
              border: "1px solid #e5e7eb",
            }}
            className="z-[9999] w-full bg-white border rounded-lg shadow-lg"
          >
            <div className="max-h-[200px] overflow-y-auto">
              {filteredTaskTypes.map((taskType) => (
                <div
                  key={taskType.value}
                  className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                    selectedTaskType === taskType.value ? "bg-primary-50" : ""
                  }`}
                  onClick={() => {
                    onChange(taskType.value);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PenTool className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {taskType.label}
                      </span>
                    </div>
                    {selectedTaskType === taskType.value && (
                      <Check className="h-4 w-4 text-primary-600" />
                    )}
                  </div>
                </div>
              ))}

              {filteredTaskTypes.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No maintenance types found matching your search
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-error-500 text-sm">{error}</p>}
    </div>
  );
};

export default TaskTypeSelector;
