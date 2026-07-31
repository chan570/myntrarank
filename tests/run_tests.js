/**
 * TRUSTRANK ENTERPRISE TEST SUITE
 * Validates the core ranking, audit engine anomalies, and NLP interfaces.
 */

import assert from 'assert';
import { hashString, calculateTypeTokenRatio, countRepeatedWords, calculateTimeDecay, auditProductReviews } from '../server/services/auditEngine.js';

console.log("\n======================================================");
console.log("🧪 STARTING TRUSTRANK ENTERPRISE UNIT AND INTEGRATION TESTS");
console.log("======================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err.stack);
    failed++;
  }
}

// Test 1: DJB2 Cryptographic hashing check
test("DJB2 Hashing consistency", () => {
  const hash1 = hashString("Hello World!");
  const hash2 = hashString("hello world"); // normalizes punctuation & casing
  assert.strictEqual(hash1, hash2);
});

// Test 2: Vocabulary Type-Token Ratio diversity check
test("Type-Token Ratio Calculation", () => {
  const textUnique = "quick brown fox jumps over lazy dog";
  const textRepeated = "very very very very bad bad";
  
  const ttrUnique = calculateTypeTokenRatio(textUnique);
  const ttrRepeated = calculateTypeTokenRatio(textRepeated);
  
  assert.ok(ttrUnique > ttrRepeated);
  assert.strictEqual(ttrRepeated, 0.333); // unique tokens (2: "very", "bad") / total words (6)
});

// Test 3: Repeated words count
test("Sequential Repeated Words Count", () => {
  const text = "Amazing fabric, very very very good.";
  const count = countRepeatedWords(text);
  assert.strictEqual(count, 2); // "very very" and "very very" (sequential)
});

// Test 4: Time Decay logic
test("Time Decay half-life factor", () => {
  const dateNow = Date.now();
  const datePast = dateNow - (180 * 24 * 60 * 60 * 1000); // 180 days ago (half-life)
  
  const weightNow = calculateTimeDecay(dateNow, 180);
  const weightPast = calculateTimeDecay(datePast, 180);
  
  assert.strictEqual(Math.round(weightNow), 1);
  assert.ok(Math.abs(weightPast - 0.50) < 0.05); // Should decay to approx 0.50
});

// Test 5: Integrated product reviews audit pipeline
test("Comprehensive Product Reviews Auditing", async () => {
  const reviews = [
    { id: "rev-1", text: "Nice product, fits perfectly on body.", rating: 5, verified: true, date: Date.now() },
    { id: "rev-2", text: "Nice product, fits perfectly on body.", rating: 5, verified: true, date: Date.now() }, // duplicate text hash trigger
    { id: "rev-3", text: "Awesome shoes comfortable block style.", rating: 4, verified: true, date: Date.now() },
    { id: "rev-4", text: "Worst dress, extremely cheap loose thread.", rating: 1, verified: true, date: Date.now() }
  ];
  
  const result = await auditProductReviews(reviews, true);
  
  assert.strictEqual(result.totalReviewsCount, 4);
  assert.ok(result.authenticityScore < 1.0); // Duplicate text should decrease authenticity
  assert.strictEqual(result.auditedReviews[1].reasons.includes('duplicate_text'), true);
});

console.log("\n======================================================");
console.log(`🏁 TEST EXECUTION COMPLETE | PASSED: ${passed} | FAILED: ${failed}`);
console.log("======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
