/**
 * Test Script: Verify Number Formatting Utility
 * This script tests the NumberFormatter utility to ensure it works correctly
 */

import { NumberFormatter } from '../src/utils/numberFormatter';

console.log('🧪 Testing Number Formatter Utility');
console.log('=====================================\n');

// Test cases
const testCases = [
  { input: 4254.719999999999, expected: '4254.72', description: 'Long decimal (like in your issue)' },
  { input: 15.543210987, expected: '15.55', description: 'Mileage with many decimals' },
  { input: 402850.18456789, expected: '402850.19', description: 'Large expense amount' },
  { input: 0.001, expected: '0.01', description: 'Small decimal (should round up)' },
  { input: 0.00, expected: '0.00', description: 'Zero value' },
  { input: null, expected: '0.00', description: 'Null value' },
  { input: undefined, expected: '0.00', description: 'Undefined value' },
  { input: '', expected: '0.00', description: 'Empty string' },
  { input: 'invalid', expected: '0.00', description: 'Invalid string' },
  { input: 100, expected: '100.00', description: 'Whole number' },
  { input: 99.99, expected: '99.99', description: 'Already 2 decimals' },
  { input: 99.991, expected: '99.99', description: '3 decimals (should round up to 100.00)' },
];

console.log('Testing formatDisplayNumber (2 decimal places, rounded up):');
console.log('----------------------------------------------------------');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = NumberFormatter.display(testCase.input, 2);
  const passed = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Input: ${testCase.input} (${typeof testCase.input})`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Got: ${result}`);
  console.log(`  Description: ${testCase.description}`);
  console.log('');
  
  if (passed) passedTests++;
});

// Test currency formatting
console.log('Testing Currency Formatting:');
console.log('-----------------------------');

const currencyTests = [
  { input: 402850.18456789, expected: '₹4,02,850.19', description: 'Large amount with Indian formatting' },
  { input: 1000, expected: '₹1,000.00', description: 'Thousand with decimals' },
  { input: 1000, expected: '₹1,000', description: 'Thousand without decimals', showDecimals: false },
];

currencyTests.forEach((testCase, index) => {
  const result = NumberFormatter.currency(testCase.input, testCase.showDecimals !== false);
  const passed = result === testCase.expected;
  
  console.log(`Currency Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Input: ${testCase.input}`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Got: ${result}`);
  console.log(`  Description: ${testCase.description}`);
  console.log('');
  
  if (passed) passedTests++;
});

// Test specialized formatters
console.log('Testing Specialized Formatters:');
console.log('--------------------------------');

const specializedTests = [
  { 
    formatter: 'mileage', 
    input: 15.543210987, 
    expected: '15.55 km/L', 
    description: 'Mileage formatter' 
  },
  { 
    formatter: 'distance', 
    input: 472.8234567, 
    expected: '472.83 km', 
    description: 'Distance formatter' 
  },
  { 
    formatter: 'fuel', 
    input: 50.123456, 
    expected: '50.13 L', 
    description: 'Fuel quantity formatter' 
  },
  { 
    formatter: 'percentage', 
    input: 85.6789, 
    expected: '85.68%', 
    description: 'Percentage formatter' 
  },
];

specializedTests.forEach((testCase, index) => {
  let result;
  switch (testCase.formatter) {
    case 'mileage':
      result = NumberFormatter.mileage(testCase.input);
      break;
    case 'distance':
      result = NumberFormatter.distance(testCase.input);
      break;
    case 'fuel':
      result = NumberFormatter.fuel(testCase.input);
      break;
    case 'percentage':
      result = NumberFormatter.percentage(testCase.input);
      break;
  }
  
  const passed = result === testCase.expected;
  
  console.log(`Specialized Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Formatter: ${testCase.formatter}`);
  console.log(`  Input: ${testCase.input}`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Got: ${result}`);
  console.log(`  Description: ${testCase.description}`);
  console.log('');
  
  if (passed) passedTests++;
});

// Summary
console.log('=====================================');
console.log(`📊 Test Summary: ${passedTests}/${totalTests + currencyTests.length + specializedTests.length} tests passed`);

if (passedTests === totalTests + currencyTests.length + specializedTests.length) {
  console.log('🎉 All tests passed! Number formatting is working correctly.');
} else {
  console.log('⚠️ Some tests failed. Please review the implementation.');
}

console.log('\n✨ Your decimal formatting issue should now be resolved!');
console.log('Numbers like 4254.719999999999 will now display as 4254.72');
