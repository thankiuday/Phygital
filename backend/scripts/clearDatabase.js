/**
 * Clear all data from MongoDB database
 * Use with caution - this will delete ALL data!
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function clearDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`\n📋 Found ${collections.length} collections\n`);
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();
      
      console.log(`🗑️  Clearing "${collectionName}" (${count} documents)...`);
      await db.collection(collectionName).deleteMany({});
      console.log(`   ✅ Cleared!`);
    }
    
    console.log('\n✅ All data cleared from database!');
    console.log('🎉 Database is now ready for production!\n');
    
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Confirmation check
console.log('\n⚠️  WARNING: This will DELETE ALL DATA from your database!');
console.log('Database:', process.env.MONGODB_URI ? 'Connected' : 'Not configured');
console.log('\nStarting in 3 seconds...\n');

setTimeout(() => {
  clearDatabase();
}, 3000);

