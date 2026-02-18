// MongoDB initialization script
// Creates separate databases for each microservice

// Switch to admin database to create users
db = db.getSiblingDB('admin');

// Create databases for each service
const databases = [
  'korrect_users',
  'korrect_artisans',
  'korrect_transactions',
  'korrect_messaging',
  'korrect_platform',
  'korrectng', // Legacy monolith database
];

databases.forEach((dbName) => {
  print(`Creating database: ${dbName}`);
  db = db.getSiblingDB(dbName);

  // Create a placeholder collection to ensure database exists
  db.createCollection('_init');
  db._init.insertOne({ initialized: new Date() });

  print(`Database ${dbName} initialized`);
});

print('All databases initialized successfully');
