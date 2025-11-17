export interface DemoAIInsight {
  id: string;
  title: string;
  summary: string;
  icon: string;
  tags: string[];
  insights?: {
    type: 'comparison' | 'ranking' | 'variation' | 'vendor' | 'document' | 'growth';
    items?: Array<{
      label: string;
      value?: string;
      highlight?: boolean;
      vehicleNumber?: string;
    }>;
    comparison?: {
      better: string;
      worse: string;
      reason: string;
    };
    ranking?: {
      top: string[];
      bottom: string[];
    };
    variation?: {
      previous: string;
      current: string;
      difference: string;
      route: string;
      vehicleNumber?: string;
    };
    vendor?: {
      better: {
        name: string;
        location: string;
        vehicleNumber: string;
        savings: string;
      };
      worse: {
        name: string;
        location: string;
        vehicleNumber: string;
        timeAgo: string;
      };
      item: string;
      reason: string;
    };
    document?: {
      estimatedCost: string;
      period: string;
      breakdown: Array<{
        type: string;
        count: number;
      }>;
    };
    growth?: {
      period: string;
      previousPeriod: string;
      metrics: Array<{
        label: string;
        value: string;
        trend: 'up' | 'down';
      }>;
      remark: string;
    };
  };
}

export const demoAIInsights: DemoAIInsight[] = [
  {
    id: 'tyre-comparison',
    title: 'Tyre Brand Performance Analysis',
    summary: 'Comparing performance across 4 Tata Yodhas to identify which tyre brand delivers better results.',
    icon: '🛞',
    tags: ['Performance', 'Tyre Analysis', 'Fleet Comparison'],
    insights: {
      type: 'comparison',
      comparison: {
        better: 'MRF Tyres',
        worse: 'CEAT Tyres',
        reason: 'On average, MRF tires have lasted 4% longer. Hence, on average per tire, they provide around 200-250 kilometers more life per tire.'
      },
      items: [
        { label: 'MRF Tyres', value: 'Best Performance', highlight: true },
        { label: 'CEAT Tyres', value: 'Needs Review', highlight: false },
        { label: 'Bridgestone', value: 'Average', highlight: false },
        { label: 'Apollo', value: 'Good', highlight: false }
      ]
    }
  },
  {
    id: 'driver-rankings',
    title: 'Driver Performance Rankings',
    summary: 'Top 2 and bottom 3 drivers identified from your fleet of 10 drivers based on safety, efficiency, and route adherence.',
    icon: '👥',
    tags: ['Driver Performance', 'Top Performers', 'Needs Attention'],
    insights: {
      type: 'ranking',
      ranking: {
        top: ['Rajesh Kumar', 'Amit Sharma'],
        bottom: ['Vikram Singh', 'Suresh Patel', 'Mohan Das']
      },
      items: [
        { label: 'Top Performer', value: 'Rajesh Kumar', highlight: true },
        { label: 'Second Best', value: 'Amit Sharma', highlight: true },
        { label: 'Needs Improvement', value: 'Vikram Singh', highlight: false },
        { label: 'Needs Improvement', value: 'Suresh Patel', highlight: false },
        { label: 'Needs Improvement', value: 'Mohan Das', highlight: false }
      ]
    }
  },
  {
    id: 'vehicle-performance',
    title: 'Vehicle Performance Comparison',
    summary: 'Performance analysis of 4 Tata Yodhas to identify the best performing unit.',
    icon: '🚛',
    tags: ['Vehicle Analysis', 'Performance Metrics', 'Fleet Optimization'],
    insights: {
      type: 'comparison',
      items: [
        { label: 'MH-12-AB-1234', value: 'Best Efficiency', highlight: true, vehicleNumber: 'MH-12-AB-1234' },
        { label: 'GJ-12-CD-5678', value: 'Good', highlight: false, vehicleNumber: 'GJ-12-CD-5678' },
        { label: 'AP-12-EF-9012', value: 'Average', highlight: false, vehicleNumber: 'AP-12-EF-9012' },
        { label: 'MH-12-GH-3456', value: 'Needs Review', highlight: false, vehicleNumber: 'MH-12-GH-3456' }
      ]
    }
  },
  {
    id: 'route-distance-variation',
    title: 'Route Distance Variation Detected',
    summary: 'Distance variation between a vehicle that went to the same party and route two months ago versus today.',
    icon: '📍',
    tags: ['Route Analysis', 'Distance Variation', 'Historical Comparison'],
    insights: {
      type: 'variation',
      variation: {
        previous: '245 km',
        current: '287 km',
        difference: '+42 km (+17%)',
        route: 'Mumbai → Pune → Same Party',
        vehicleNumber: 'MH-12-AB-1234'
      },
      items: [
        { label: 'Previous Trip', value: '245 km', highlight: false },
        { label: 'Current Trip', value: '287 km', highlight: true },
        { label: 'Variation', value: '+42 km (+17%)', highlight: true }
      ]
    }
  },
  {
    id: 'vendor-comparison',
    title: 'Vendor Cost Comparison - Clutch Assembly',
    summary: 'Cost analysis reveals significant savings opportunity when purchasing clutch assembly from different vendors.',
    icon: '🏪',
    tags: ['Cost Optimization', 'Vendor Analysis', 'Parts Purchase'],
    insights: {
      type: 'vendor',
      vendor: {
        better: {
          name: 'Rakesh Automobile',
          location: 'Golier',
          vehicleNumber: 'MH-12-AB-1234',
          savings: '7-8% cheaper'
        },
        worse: {
          name: 'City Wheels Showroom',
          location: 'Ashok Leyland City Wheels Showroom',
          vehicleNumber: 'MH-12-CD-5678',
          timeAgo: '6 months ago'
        },
        item: 'Clutch Assembly',
        reason: 'Current purchase from Rakesh Automobile (Golier) is 7-8% cheaper than the purchase made from City Wheels Showroom 6 months ago for a different vehicle.'
      }
    }
  },
  {
    id: 'document-renewal-estimate',
    title: 'Document Renewal Estimates for This Month',
    summary: 'AI estimates for documents renewal for this month with detailed cost breakdown.',
    icon: '📋',
    tags: ['Document Renewal', 'Cost Estimate', 'Compliance'],
    insights: {
      type: 'document',
      document: {
        estimatedCost: '₹64,000',
        period: 'This Month',
        breakdown: [
          { type: 'Insurance', count: 2 },
          { type: 'Fitness', count: 1 },
          { type: 'PUC', count: 3 }
        ]
      }
    }
  },
  {
    id: 'fleet-growth-analysis',
    title: 'Fleet Growth Period Analysis',
    summary: 'Period-over-period comparison showing significant growth in fleet operations and performance metrics.',
    icon: '📈',
    tags: ['Growth Analysis', 'Performance Metrics', 'Period Comparison'],
    insights: {
      type: 'growth',
      growth: {
        period: 'November 1-17, Current Year',
        previousPeriod: 'November 1-17, Last Year',
        metrics: [
          { label: 'Load Carried', value: '+10%', trend: 'up' },
          { label: 'Kilometers Covered', value: '+12%', trend: 'up' }
        ],
        remark: 'Your fleet is in a good growth period with increased load capacity and expanded coverage, indicating strong operational performance and business expansion.'
      }
    }
  }
];

