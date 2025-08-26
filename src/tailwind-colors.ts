```tsx
// This file is created to hold the gray color palette
// so it can be imported into tailwind.config.js for the 'neutral' key.
// This is a workaround to allow both 'gray' and 'neutral' to exist
// with the same color values if desired, or to easily swap.

module.exports = {
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
};
```