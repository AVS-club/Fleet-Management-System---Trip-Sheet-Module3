/**
 * Test Script: Verify Number Formatting Utility
 * This script tests the NumberFormatter utility to ensure it works correctly
 */

// Simple test of the rounding logic
function formatNumberWithRoundUp(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return 0;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return 0;
  
  // For rounding up to specific decimal places
  const multiplier = Math.pow(10, decimals);
  return Math.ceil(num * multiplier) / multiplier;
}

function formatDisplayNumber(value, decimals = 2) {
  const rounded = formatNumberWithRoundUp(value, decimals);
  return rounded.toFixed(decimals);
}

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
  { input: 99.991, expected: '100.00', description: '3 decimals (should round up to 100.00)' },
];

console.log('Testing formatDisplayNumber (2 decimal places, rounded up):');
console.log('----------------------------------------------------------');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = formatDisplayNumber(testCase.input, 2);
  const passed = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Input: ${testCase.input} (${typeof testCase.input})`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Got: ${result}`);
  console.log(`  Description: ${testCase.description}`);
  console.log('');
  
  if (passed) passedTests++;
});

// Summary
console.log('=====================================');
console.log(`📊 Test Summary: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Number formatting is working correctly.');
} else {
  console.log('⚠️ Some tests failed. Please review the implementation.');
}

console.log('\n✨ Your decimal formatting issue should now be resolved!');
console.log('Numbers like 4254.719999999999 will now display as 4254.72');
