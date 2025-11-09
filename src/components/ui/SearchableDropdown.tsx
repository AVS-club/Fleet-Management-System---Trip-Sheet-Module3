import React, { useState, useRef, useEffect, ReactNode } from "react";
import { Check } from "lucide-react";

export interface SearchableDropdownProps<T> {
  items: T[];
  selectedId?: string;
  onChange: (id: string) => void;
  renderItem: (item: T, isSelected: boolean, isHighlighted: boolean) => ReactNode;
  renderSelected: (item: T) => ReactNode;
  filterFn: (item: T, searchTerm: string) => boolean;
  getItemId: (item: T) => string;
  placeholder: string;
  label: string;
  required?: boolean;
  error?: string;
  searchPlaceholder?: string;
  maxHeight?: number;
  emptyMessage?: string;
  showCheckmark?: boolean;
}

function SearchableDropdown<T>({
  items,
  selectedId,
  onChange,
  renderItem,
  renderSelected,
  filterFn,
  getItemId,
  placeholder,
  label,
  required = false,
  error,
  searchPlaceholder = "Search...",
  maxHeight = 200,
  emptyMessage = "No items found matching your search",
  showCheckmark = true,
}: SearchableDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMenuAbove, setIsMenuAbove] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
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
        maxHeight + 50 // Account for search input
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
  }, [isOpen, maxHeight]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  const filteredItems = items.filter((item) => filterFn(item, searchTerm));
  const selectedItem = items.find((item) => getItemId(item) === selectedId);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          const selectedItem = filteredItems[highlightedIndex];
          onChange(getItemId(selectedItem));
          setIsOpen(false);
          setSearchTerm("");
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        break;
    }
  };

  return (
    <div className="space-y-2 relative z-30">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-error-500 ml-1">*</span>}
      </label>

      <div className="relative" ref={dropdownRef}>
        <div
          ref={inputContainerRef}
          className={`min-h-[42px] p-2 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 ${
            error ? "border-error-500" : "border-gray-300"
          }`}
          onClick={() => setIsOpen(true)}
        >
          {selectedItem ? renderSelected(selectedItem) : (
            <div className="text-gray-500">{placeholder}</div>
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
            <div className="p-2 border-b sticky top-0 bg-white z-10">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full p-2 border rounded-md"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>

            <div style={{ maxHeight: `${maxHeight}px`, overflowY: "auto" }}>
              {filteredItems.map((item, index) => {
                const itemId = getItemId(item);
                const isSelected = selectedId === itemId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={itemId}
                    className={`cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                      isSelected ? "bg-primary-50" : ""
                    } ${isHighlighted ? "bg-gray-100" : ""}`}
                    onClick={() => {
                      onChange(itemId);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="relative">
                      {renderItem(item, isSelected, isHighlighted)}
                      {showCheckmark && isSelected && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Check className="h-4 w-4 text-primary-600" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-error-500 text-sm">{error}</p>}
    </div>
  );
}

export default SearchableDropdown;
