/**
 * @file exportTest.js
 * @description Export Service Test Suite. Verifies RFC-4180 CSV conversion, date formatting, quote escaping, and gzip compression functionality.
 */

const { convertToCSV, studentColumns, compressGzip } = require('../services/exportService');
const zlib = require('zlib');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n=============================================');
  console.log('🧪 RUNNING LUMINALEARN EXPORT & BACKUP TESTS');
  console.log('=============================================\n');

  // Test 1: RFC-4180 CSV conversion with commas and quotes
  console.log('1. Testing CSV formatting:');
  const mockStudents = [
    {
      registrationNumber: 'ST-001',
      name: 'Silva, Kamal',
      role: 'student',
      studentType: 'physical',
      grade: 'Grade 10',
      email: 'kamal@example.com',
      dateOfBirth: new Date('2008-05-15'),
      nicNumber: '200812345678',
      parentsPhoneNumber: '0771234567',
      phoneNumber: '0712345678',
      createdAt: new Date('2024-01-10'),
      isEmailVerified: true,
      isPhoneVerified: false
    }
  ];

  const csv = convertToCSV(mockStudents, studentColumns);
  assert(csv.includes('"Silva, Kamal"'), 'Escapes commas inside quotes correctly');
  assert(csv.includes('"ST-001"'), 'Contains registration number');
  assert(csv.includes('"2008-05-15"'), 'Formats Date of Birth into YYYY-MM-DD');
  assert(csv.includes('"Yes"') && csv.includes('"No"'), 'Maps boolean verified status correctly');

  // Test 2: GZIP compression & decompression roundtrip
  console.log('\n2. Testing System Backup Compression:');
  const sampleJson = JSON.stringify({ system: 'LuminaLearn', totalUsers: 1500 });
  const compressed = await compressGzip(Buffer.from(sampleJson, 'utf-8'));
  assert(Buffer.isBuffer(compressed), 'Compresses payload to GZIP Buffer');
  
  const decompressed = zlib.gunzipSync(compressed).toString('utf-8');
  assert(decompressed === sampleJson, 'GZIP decompresses accurately back to JSON');

  console.log('\n=============================================');
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
  console.log('=============================================\n');

  if (failedTests > 0) process.exit(1);
}

runTests();
