#!/usr/bin/env ts-node
/**
 * KorrectNG Data Migration Script
 *
 * Migrates data from the monolithic MongoDB database to separate service databases.
 *
 * Usage:
 *   npx ts-node scripts/migrate-data.ts --source mongodb://localhost:27017/korrect --dry-run
 *   npx ts-node scripts/migrate-data.ts --source mongodb://localhost:27017/korrect --target-prefix mongodb://localhost:27017/korrect_
 *
 * Options:
 *   --source       Source MongoDB URI (monolith database)
 *   --target-prefix Target MongoDB URI prefix (service databases will be appended)
 *   --dry-run      Preview migration without making changes
 *   --collection   Migrate specific collection only
 *   --skip-indexes Skip index creation
 *   --batch-size   Number of documents per batch (default: 1000)
 */

import { MongoClient, Db, Collection, Document } from 'mongodb';

// Configuration
interface MigrationConfig {
  sourceUri: string;
  targetPrefix: string;
  dryRun: boolean;
  skipIndexes: boolean;
  batchSize: number;
  specificCollection?: string;
}

// Collection to service mapping
const COLLECTION_MAPPING: Record<string, { database: string; collection: string }> = {
  // Users Service
  users: { database: 'users', collection: 'users' },
  pushtokens: { database: 'users', collection: 'pushtokens' },

  // Artisan Service
  artisanprofiles: { database: 'artisans', collection: 'artisanprofiles' },
  reviews: { database: 'artisans', collection: 'reviews' },
  verificationapplications: { database: 'artisans', collection: 'verificationapplications' },
  subscriptions: { database: 'artisans', collection: 'subscriptions' },
  warrantyclaims: { database: 'artisans', collection: 'warrantyclaims' },

  // Transaction Service
  bookings: { database: 'transactions', collection: 'bookings' },
  jobcontracts: { database: 'transactions', collection: 'jobcontracts' },
  escrowpayments: { database: 'transactions', collection: 'escrowpayments' },
  disputes: { database: 'transactions', collection: 'disputes' },

  // Messaging Service
  conversations: { database: 'messaging', collection: 'conversations' },
  messages: { database: 'messaging', collection: 'messages' },

  // Platform Service
  notifications: { database: 'platform', collection: 'notifications' },
  searchlogs: { database: 'platform', collection: 'searchlogs' },
  termsacceptances: { database: 'platform', collection: 'termsacceptances' },
  pricecatalogs: { database: 'platform', collection: 'pricecatalogs' },
  suppliers: { database: 'platform', collection: 'suppliers' },
};

// Parse command line arguments
function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2);
  const config: MigrationConfig = {
    sourceUri: '',
    targetPrefix: '',
    dryRun: false,
    skipIndexes: false,
    batchSize: 1000,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        config.sourceUri = args[++i];
        break;
      case '--target-prefix':
        config.targetPrefix = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--skip-indexes':
        config.skipIndexes = true;
        break;
      case '--batch-size':
        config.batchSize = parseInt(args[++i], 10);
        break;
      case '--collection':
        config.specificCollection = args[++i];
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  if (!config.sourceUri) {
    console.error('Error: --source is required');
    printHelp();
    process.exit(1);
  }

  if (!config.targetPrefix && !config.dryRun) {
    console.error('Error: --target-prefix is required (unless using --dry-run)');
    printHelp();
    process.exit(1);
  }

  return config;
}

function printHelp(): void {
  console.log(`
KorrectNG Data Migration Script

Usage:
  npx ts-node scripts/migrate-data.ts [options]

Options:
  --source <uri>        Source MongoDB URI (monolith database) [required]
  --target-prefix <uri> Target MongoDB URI prefix [required unless --dry-run]
  --dry-run             Preview migration without making changes
  --skip-indexes        Skip index creation
  --batch-size <n>      Documents per batch (default: 1000)
  --collection <name>   Migrate specific collection only
  --help                Show this help message

Examples:
  # Dry run to see what will be migrated
  npx ts-node scripts/migrate-data.ts \\
    --source mongodb://localhost:27017/korrect \\
    --dry-run

  # Full migration
  npx ts-node scripts/migrate-data.ts \\
    --source mongodb://localhost:27017/korrect \\
    --target-prefix mongodb://localhost:27017/korrect_

  # Migrate only users collection
  npx ts-node scripts/migrate-data.ts \\
    --source mongodb://localhost:27017/korrect \\
    --target-prefix mongodb://localhost:27017/korrect_ \\
    --collection users
  `);
}

// Logger
function log(level: 'info' | 'warn' | 'error' | 'success', message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    success: '\x1b[32m', // Green
  };
  const reset = '\x1b[0m';

  console.log(`${colors[level]}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`, data || '');
}

// Migration statistics
interface MigrationStats {
  collection: string;
  sourceCount: number;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  duration: number;
}

// Migrate a single collection
async function migrateCollection(
  sourceDb: Db,
  targetClient: MongoClient | null,
  collectionName: string,
  mapping: { database: string; collection: string },
  config: MigrationConfig
): Promise<MigrationStats> {
  const startTime = Date.now();
  const stats: MigrationStats = {
    collection: collectionName,
    sourceCount: 0,
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    duration: 0,
  };

  try {
    const sourceCollection = sourceDb.collection(collectionName);
    stats.sourceCount = await sourceCollection.countDocuments();

    log('info', `Migrating ${collectionName} → ${mapping.database}.${mapping.collection}`, {
      documents: stats.sourceCount,
    });

    if (stats.sourceCount === 0) {
      log('warn', `Collection ${collectionName} is empty, skipping`);
      stats.duration = Date.now() - startTime;
      return stats;
    }

    if (config.dryRun) {
      log('info', `[DRY RUN] Would migrate ${stats.sourceCount} documents`);
      stats.migratedCount = stats.sourceCount;
      stats.duration = Date.now() - startTime;
      return stats;
    }

    // Get target collection
    const targetDb = targetClient!.db(`korrect_${mapping.database}`);
    const targetCollection = targetDb.collection(mapping.collection);

    // Migrate in batches
    const cursor = sourceCollection.find({}).batchSize(config.batchSize);
    let batch: Document[] = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (doc) {
        batch.push(doc);

        if (batch.length >= config.batchSize) {
          try {
            await targetCollection.insertMany(batch, { ordered: false });
            stats.migratedCount += batch.length;
          } catch (error: any) {
            // Handle duplicate key errors gracefully
            if (error.code === 11000) {
              stats.skippedCount += error.writeErrors?.length || batch.length;
              stats.migratedCount += batch.length - (error.writeErrors?.length || 0);
            } else {
              log('error', `Batch insert error: ${error.message}`);
              stats.errorCount += batch.length;
            }
          }
          batch = [];

          // Progress update
          const progress = Math.round((stats.migratedCount / stats.sourceCount) * 100);
          process.stdout.write(`\r  Progress: ${progress}% (${stats.migratedCount}/${stats.sourceCount})`);
        }
      }
    }

    // Insert remaining documents
    if (batch.length > 0) {
      try {
        await targetCollection.insertMany(batch, { ordered: false });
        stats.migratedCount += batch.length;
      } catch (error: any) {
        if (error.code === 11000) {
          stats.skippedCount += error.writeErrors?.length || batch.length;
          stats.migratedCount += batch.length - (error.writeErrors?.length || 0);
        } else {
          stats.errorCount += batch.length;
        }
      }
    }

    console.log(''); // New line after progress

    // Copy indexes
    if (!config.skipIndexes) {
      const indexes = await sourceCollection.indexes();
      for (const index of indexes) {
        if (index.name === '_id_') continue; // Skip default index

        try {
          await targetCollection.createIndex(index.key, {
            name: index.name,
            unique: index.unique,
            sparse: index.sparse,
            expireAfterSeconds: index.expireAfterSeconds,
          });
          log('info', `  Created index: ${index.name}`);
        } catch (error: any) {
          log('warn', `  Failed to create index ${index.name}: ${error.message}`);
        }
      }
    }

    stats.duration = Date.now() - startTime;
    log('success', `Completed ${collectionName}`, {
      migrated: stats.migratedCount,
      skipped: stats.skippedCount,
      errors: stats.errorCount,
      duration: `${stats.duration}ms`,
    });

    return stats;
  } catch (error: any) {
    log('error', `Failed to migrate ${collectionName}: ${error.message}`);
    stats.errorCount = stats.sourceCount;
    stats.duration = Date.now() - startTime;
    return stats;
  }
}

// Main migration function
async function migrate(): Promise<void> {
  const config = parseArgs();

  log('info', 'Starting KorrectNG data migration');
  log('info', `Source: ${config.sourceUri}`);
  log('info', `Target prefix: ${config.targetPrefix || '(dry run)'}`);
  log('info', `Dry run: ${config.dryRun}`);
  log('info', `Batch size: ${config.batchSize}`);

  let sourceClient: MongoClient | null = null;
  let targetClient: MongoClient | null = null;

  try {
    // Connect to source
    log('info', 'Connecting to source database...');
    sourceClient = new MongoClient(config.sourceUri);
    await sourceClient.connect();
    const sourceDb = sourceClient.db();

    // Get available collections
    const collections = await sourceDb.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name.toLowerCase());
    log('info', `Found ${collectionNames.length} collections in source database`);

    // Connect to target (if not dry run)
    if (!config.dryRun) {
      log('info', 'Connecting to target databases...');
      targetClient = new MongoClient(config.targetPrefix);
      await targetClient.connect();
    }

    // Filter collections to migrate
    const toMigrate = Object.entries(COLLECTION_MAPPING).filter(([name]) => {
      if (config.specificCollection) {
        return name === config.specificCollection.toLowerCase();
      }
      return collectionNames.includes(name);
    });

    log('info', `Will migrate ${toMigrate.length} collections`);

    // Migrate each collection
    const allStats: MigrationStats[] = [];
    for (const [name, mapping] of toMigrate) {
      const stats = await migrateCollection(sourceDb, targetClient, name, mapping, config);
      allStats.push(stats);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    log('info', 'Migration Summary');
    console.log('='.repeat(60));

    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalDuration = 0;

    for (const stats of allStats) {
      console.log(`  ${stats.collection}: ${stats.migratedCount} migrated, ${stats.skippedCount} skipped, ${stats.errorCount} errors`);
      totalMigrated += stats.migratedCount;
      totalSkipped += stats.skippedCount;
      totalErrors += stats.errorCount;
      totalDuration += stats.duration;
    }

    console.log('-'.repeat(60));
    console.log(`  Total: ${totalMigrated} migrated, ${totalSkipped} skipped, ${totalErrors} errors`);
    console.log(`  Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log('='.repeat(60));

    if (totalErrors > 0) {
      log('warn', 'Migration completed with errors');
      process.exit(1);
    } else {
      log('success', 'Migration completed successfully');
    }
  } catch (error: any) {
    log('error', `Migration failed: ${error.message}`);
    process.exit(1);
  } finally {
    if (sourceClient) await sourceClient.close();
    if (targetClient) await targetClient.close();
  }
}

// Rollback function
async function rollback(targetPrefix: string, database: string): Promise<void> {
  log('warn', `Rolling back ${database}...`);

  const client = new MongoClient(targetPrefix);
  await client.connect();

  try {
    await client.db(`korrect_${database}`).dropDatabase();
    log('success', `Dropped korrect_${database}`);
  } finally {
    await client.close();
  }
}

// Validation function
async function validate(sourceUri: string, targetPrefix: string): Promise<boolean> {
  log('info', 'Validating migration...');

  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetPrefix);

  await sourceClient.connect();
  await targetClient.connect();

  try {
    const sourceDb = sourceClient.db();
    let isValid = true;

    for (const [collectionName, mapping] of Object.entries(COLLECTION_MAPPING)) {
      const sourceCount = await sourceDb.collection(collectionName).countDocuments();
      const targetDb = targetClient.db(`korrect_${mapping.database}`);
      const targetCount = await targetDb.collection(mapping.collection).countDocuments();

      if (sourceCount !== targetCount) {
        log('error', `Mismatch in ${collectionName}: source=${sourceCount}, target=${targetCount}`);
        isValid = false;
      } else {
        log('success', `${collectionName}: ${sourceCount} documents verified`);
      }
    }

    return isValid;
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

// Run migration
migrate().catch((error) => {
  log('error', `Unhandled error: ${error.message}`);
  process.exit(1);
});
