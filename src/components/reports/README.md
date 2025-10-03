# Auto Vital Solution Reports System

A comprehensive reporting system for fleet management with PDF and Excel export capabilities.

## 🚀 Features

- **5 Report Types**: Weekly Comparison, Monthly Comparison, Trip Summary, Vehicle Utilization, Driver Performance
- **PDF Export**: High-quality PDF reports with professional formatting
- **Excel Export**: Detailed data in Excel format with multiple sheets
- **Real-time Data**: Live data from Supabase database
- **Responsive Design**: Works on desktop and mobile devices
- **Print Optimized**: Reports are optimized for both screen and print

## 📁 File Structure

```
src/components/reports/
├── common/                    # Reusable components
│   ├── ReportHeader.tsx      # Report header with logo and metadata
│   ├── StatCard.tsx          # Statistics display cards
│   ├── ReportTable.tsx       # Data tables with sorting
│   └── ProgressBar.tsx       # Progress bars for metrics
├── templates/                 # Report templates
│   ├── WeeklyComparisonReport.tsx
│   ├── MonthlyComparisonReport.tsx
│   ├── TripSummaryReport.tsx
│   ├── VehicleUtilizationReport.tsx
│   └── DriverPerformanceReport.tsx
├── ReportGenerator.tsx        # Main report generator component
├── ReportsDemo.tsx           # Demo component for testing
└── index.ts                  # Export file

src/utils/
├── reportDataFetchers.ts     # Supabase data fetching functions
└── reportGenerators.ts       # PDF and Excel generation utilities

src/styles/
└── reports.css               # Report-specific styles and print formatting
```

## 🛠️ Usage

### Basic Usage

```tsx
import { ReportGenerator } from './components/reports';
import { ReportType } from './components/reports';

function MyComponent() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);

  return (
    <div>
      <button onClick={() => setSelectedReport('trip-summary')}>
        Generate Trip Summary
      </button>
      
      {selectedReport && (
        <ReportGenerator
          reportType={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
```

### Using Individual Report Templates

```tsx
import { TripSummaryReport } from './components/reports';
import { fetchTripSummaryData } from './utils/reportDataFetchers';

function CustomReport() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchTripSummaryData({
      start: '2024-01-01',
      end: '2024-01-31'
    }).then(setData);
  }, []);

  return data ? <TripSummaryReport data={data} /> : <div>Loading...</div>;
}
```

## 📊 Report Types

### 1. Weekly Comparison Report
- Compares current week with previous week
- Shows percentage changes in key metrics
- Includes performance insights and recommendations

### 2. Monthly Comparison Report
- Monthly performance analysis
- Weekly breakdown within the month
- Vehicle metrics and utilization data

### 3. Trip Summary Report
- Detailed trip information
- Summary statistics
- Route analysis and performance metrics

### 4. Vehicle Utilization Report
- Vehicle usage patterns
- Utilization trends (weekly/monthly)
- Performance recommendations

### 5. Driver Performance Report
- Driver performance metrics
- Safety analysis
- Top performers and training recommendations

## 🎨 Styling

The reports use a consistent design system with:

- **Colors**: Primary green (#10B981), grays, and semantic colors
- **Typography**: Inter and Plus Jakarta Sans fonts
- **Components**: Tailwind CSS with custom report styles
- **Print**: Optimized print styles with proper page breaks

## 📱 Responsive Design

- Mobile-first approach
- Responsive tables and cards
- Touch-friendly interface
- Optimized for various screen sizes

## 🖨️ Print Optimization

- Print-specific CSS styles
- Proper page breaks
- Color preservation
- Professional formatting

## 🔧 Configuration

### Environment Variables

Make sure your Supabase configuration is set up:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Dependencies

The reports system requires these packages (already included in package.json):

```json
{
  "jspdf": "^3.0.3",
  "html2canvas": "^1.4.1",
  "xlsx": "^0.18.5",
  "recharts": "^2.15.4"
}
```

## 🚀 Getting Started

1. **Import the Reports Page**:
   ```tsx
   import ReportsPage from './pages/ReportsPage';
   ```

2. **Add to your routing**:
   ```tsx
   <Route path="/reports" element={<ReportsPage />} />
   ```

3. **Or use individual components**:
   ```tsx
   import { ReportGenerator } from './components/reports';
   ```

## 📈 Data Flow

1. **User selects report type** → ReportGenerator component
2. **Data fetching** → reportDataFetchers.ts queries Supabase
3. **Data processing** → Raw data transformed for display
4. **Report rendering** → Template components render the data
5. **Export options** → PDF/Excel generation via reportGenerators.ts

## 🎯 Customization

### Adding New Report Types

1. Create a new template component in `templates/`
2. Add data fetcher function in `reportDataFetchers.ts`
3. Add export function in `reportGenerators.ts`
4. Update the ReportGenerator component
5. Add to the ReportType union type

### Customizing Styles

- Modify `src/styles/reports.css` for global report styles
- Use Tailwind classes for component-specific styling
- Override print styles in the `@media print` section

## 🐛 Troubleshooting

### Common Issues

1. **PDF Generation Fails**:
   - Check if html2canvas is properly installed
   - Ensure the report content is rendered before PDF generation

2. **Excel Export Issues**:
   - Verify xlsx package is installed
   - Check data format compatibility

3. **Data Not Loading**:
   - Verify Supabase connection
   - Check RLS policies
   - Ensure proper authentication

### Debug Mode

Enable debug logging by setting:
```tsx
localStorage.setItem('debug', 'reports:*');
```

## 📝 Examples

See `ReportsDemo.tsx` for a complete example of how to use the reports system.

## 🤝 Contributing

When adding new features:

1. Follow the existing component structure
2. Add proper TypeScript types
3. Include print-optimized styles
4. Test PDF and Excel export
5. Update this README

## 📄 License

This reports system is part of the Auto Vital Solution fleet management system.
