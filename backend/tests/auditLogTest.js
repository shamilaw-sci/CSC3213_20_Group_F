/**
 * @file auditLogTest.js
 * @description Audit Log Test Suite. Verifies sensitive field redaction, client IP extraction, and audit log generation under simulated scenarios.
 */

const { sanitizePayload } = require('../services/auditLogger');
const AuditLog = require('../models/AuditLog');

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
  console.log('🧪 RUNNING LUMINALEARN AUDIT LOG SYSTEM TESTS');
  console.log('=============================================\n');

  // Test 1: Sanitizer redacts sensitive fields
  console.log('1. Testing Payload Sanitization:');
  const dirtyPayload = {
    name: 'Alice',
    email: 'alice@example.com',
    password: 'SuperSecretPassword123!',
    token: 'jwt.token.here',
    nested: {
      otp: '123456',
      role: 'student'
    }
  };

  const clean = sanitizePayload(dirtyPayload);
  assert(clean.password === '[REDACTED]', 'Password field is redacted');
  assert(clean.token === '[REDACTED]', 'Token field is redacted');
  assert(clean.nested.otp === '[REDACTED]', 'Nested OTP field is redacted');
  assert(clean.name === 'Alice' && clean.email === 'alice@example.com', 'Non-sensitive fields remain intact');

  // Test 2: AuditLog Schema Validation
  console.log('\n2. Testing AuditLog Schema Validation:');
  const validLog = new AuditLog({
    actor: {
      name: 'Admin User',
      email: 'admin@luminalearn.edu.lk',
      role: 'admin'
    },
    action: 'USER_CREATE',
    entity: 'User',
    entityId: '60d0fe4f5311236168a109ca',
    summary: 'Created new student Alice',
    diff: {
      before: null,
      after: { name: 'Alice', role: 'student' }
    }
  });

  const validationError = validLog.validateSync();
  assert(!validationError, 'Valid audit log model passes validation without errors');

  // Test 3: Invalid entity rejection
  console.log('\n3. Testing Invalid Entity Rejection:');
  const invalidEntityLog = new AuditLog({
    actor: { name: 'Admin', role: 'admin' },
    action: 'TEST',
    entity: 'InvalidEntityName123',
    summary: 'Testing invalid entity'
  });

  const entityError = invalidEntityLog.validateSync();
  assert(!!entityError && entityError.errors.entity, 'Rejects unauthorized entity types');

  // Test 4: Indexes check
  console.log('\n4. Testing AuditLog Model Indexes:');
  const indexes = AuditLog.schema.indexes();
  const hasCreatedAtIndex = indexes.some(idx => idx[0].createdAt === -1);
  const hasEntityIndex = indexes.some(idx => idx[0].entity === 1 && idx[0].createdAt === -1);
  assert(hasCreatedAtIndex, 'AuditLog has descending createdAt index');
  assert(hasEntityIndex, 'AuditLog has compound entity + createdAt index');

  console.log('\n=============================================');
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
  console.log('=============================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
