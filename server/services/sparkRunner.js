/**
 * TRUSTRANK APACHE SPARK BRIDGE & RUNNER SERVICE
 * Probes environment for PySpark & Python, executes server/spark/spark_audit_job.py,
 * and falls back to Node.js VADER NLP audit engine if PySpark/Java is missing.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { auditProductReviews } from './auditEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPARK_JOB_PATH = path.join(__dirname, '../spark/spark_audit_job.py');

export async function runSparkAuditJob(products) {
  console.log(`\n======================================================`);
  console.log(`🚀 INITIALIZING TRUSTRANK BATCH PROCESSING PIPELINE`);
  console.log(`======================================================`);

  // Step 1: Probe PySpark capability
  const isPySparkAvailable = await checkPySparkInstalled();

  if (isPySparkAvailable) {
    console.log(`⚡ Apache Spark (PySpark) environment DETECTED! Executing PySpark DataFrame Batch Job...`);
    try {
      const sparkResults = await executePySparkScript(products);
      console.log(`✅ PySpark Batch Worker completed successfully! Audited ${sparkResults.length} products.`);
      return sparkResults;
    } catch (err) {
      console.warn(`⚠️ PySpark execution fallback: ${err.message}`);
    }
  } else {
    console.log(`ℹ️ Apache Spark / JVM not detected on host path.`);
    console.log(`⚡ Executing Node.js VADER NLP Audit Engine (PySpark-Equivalent Execution)...`);
  }

  // Fallback Engine Execution
  const fallbackResults = await Promise.all(products.map(async p => {
    const metrics = await auditProductReviews(p.reviews || []);
    return {
      id: p.id,
      ...p,
      auditedMetrics: metrics,
      auditedBy: 'Node.js ML Transformer NLP Audit Engine'
    };
  }));

  console.log(`✅ Batch Processing Engine completed! Audited ${fallbackResults.length} products.\n`);
  return fallbackResults;
}

function checkPySparkInstalled() {
  return new Promise(resolve => {
    const child = spawn('python', ['-c', 'import pyspark']);
    child.on('error', () => resolve(false));
    child.on('close', code => resolve(code === 0));
  });
}

function executePySparkScript(products) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.join(__dirname, '../scratch');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const tmpFile = path.join(tmpDir, `input_${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify({ products }), 'utf-8');

    const pyProcess = spawn('python', [SPARK_JOB_PATH, tmpFile]);

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', data => { stdoutData += data.toString(); });
    pyProcess.stderr.on('data', data => { stderrData += data.toString(); });

    pyProcess.on('close', code => {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch (e) {}

      if (code !== 0) {
        return reject(new Error(`PySpark exited with code ${code}: ${stderrData}`));
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        if (parsed.status === 'success') {
          resolve(parsed.auditedProducts);
        } else {
          reject(new Error(parsed.error || 'PySpark job failed'));
        }
      } catch (err) {
        reject(new Error(`Failed to parse PySpark JSON output: ${err.message}`));
      }
    });
  });
}

export default { runSparkAuditJob };
