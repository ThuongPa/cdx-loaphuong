/**
 * Test User Synchronization from Auth-Service via RabbitMQ
 *
 * This script tests the complete user synchronization flow:
 * 1. Auth-service publishes UserCreatedEvent
 * 2. Notification-service receives event via RabbitMQ
 * 3. UserEventListenerService creates local user copy (Early ACK: 110ms)
 * 4. MongoDB: Create user record
 * 5. NovuSubscriberQueueService: Enqueue CREATE task
 * 6. Background: Novu subscriber creation
 *
 * This replicates existing user creation logic but triggered by events
 */

const amqp = require('amqplib');
const { MongoClient } = require('mongodb');

// RabbitMQ Configuration
const RABBITMQ_URL =
  process.env.RABBITMQ_URI ||
  'amqp://xMlbHAEswk95f17q:xqETMbrXPskYEnwL7VAVa1yYH3mkATkz@rabbitmq.cudanso.net:5672';

// MongoDB connection
const MONGODB_URL =
  process.env.MONGODB_URI ||
  'mongodb://admin:password123@localhost:27017/notification-service?authSource=admin';

// Exchange and Queue Configuration
const AUTH_EXCHANGE = 'auth.exchange';
const NOTIFICATION_EXCHANGE = 'notifications.exchange';

// Test user data
const testUsers = [
  {
    userId: 'auth-user-001',
    email: 'john.doe@example.com',
    name: 'John Doe',
    phone: '+84901234567',
    role: 'ROLE_RESIDENT',
    apartment: 'A101',
    building: 'Building A',
    isActive: true,
    roles: ['resident'],
    firstName: 'John',
    lastName: 'Doe',
  },
  {
    userId: 'auth-user-002',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    phone: '+84907654321',
    role: 'ROLE_ADMIN',
    apartment: 'B205',
    building: 'Building B',
    isActive: true,
    roles: ['admin'],
    firstName: 'Jane',
    lastName: 'Smith',
  },
  {
    userId: 'auth-user-003',
    email: 'bob.wilson@example.com',
    name: 'Bob Wilson',
    role: 'ROLE_MANAGER',
    building: 'Building C',
    isActive: true,
    roles: ['manager'],
    firstName: 'Bob',
    lastName: 'Wilson',
  },
];

async function setupInfrastructure(channel) {
  console.log('\n🔧 Setting up RabbitMQ infrastructure...');

  // Declare auth exchange
  await channel.assertExchange(AUTH_EXCHANGE, 'topic', {
    durable: true,
  });
  console.log(`✅ Exchange declared: ${AUTH_EXCHANGE}`);

  // Declare notification exchange
  await channel.assertExchange(NOTIFICATION_EXCHANGE, 'topic', {
    durable: true,
  });
  console.log(`✅ Exchange declared: ${NOTIFICATION_EXCHANGE}`);

  // Clear notification queue to remove old messages
  const NOTIFICATION_QUEUE = 'notification.queue';
  try {
    await channel.purgeQueue(NOTIFICATION_QUEUE);
    console.log(`🧹 Cleared old messages from queue: ${NOTIFICATION_QUEUE}`);
  } catch (error) {
    console.log(`⚠️ Could not clear queue ${NOTIFICATION_QUEUE}: ${error.message}`);
  }

  // Check queue status
  try {
    const queueInfo = await channel.checkQueue(NOTIFICATION_QUEUE);
    console.log(`📊 Queue status:`);
    console.log(`   - Message count: ${queueInfo.messageCount}`);
    console.log(`   - Consumer count: ${queueInfo.consumerCount}`);
  } catch (error) {
    console.log(`⚠️ Could not get queue info: ${error.message}`);
  }
}

async function publishUserCreatedEvent(channel, userData) {
  const event = {
    eventId: `user-created-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventType: 'auth.UserCreatedEvent',
    eventVersion: '1.0',
    timestamp: new Date().toISOString(),
    aggregateId: userData.userId,
    aggregateType: 'User',
    payload: {
      userData: {
        userId: userData.userId,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        roles: userData.roles,
        apartment: userData.apartment,
        building: userData.building,
        isActive: userData.isActive,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  };

  const routingKey = 'auth.UserCreatedEvent';
  const message = Buffer.from(JSON.stringify(event));

  channel.publish(AUTH_EXCHANGE, routingKey, message, {
    persistent: true,
    contentType: 'application/json',
  });

  console.log(`\n📤 Published UserCreatedEvent:`);
  console.log(`   User: ${userData.name} (${userData.email})`);
  console.log(`   Role: ${userData.role}`);
  console.log(
    `   Building: ${userData.building || 'N/A'}, Apartment: ${userData.apartment || 'N/A'}`,
  );
  console.log(`   Routing Key: ${routingKey}`);
  console.log(`   Event ID: ${event.eventId}`);
}

async function publishUserUpdatedEvent(channel, userId, updates) {
  const event = {
    eventId: `user-updated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventType: 'auth.UserUpdatedEvent',
    eventVersion: '1.0',
    timestamp: new Date().toISOString(),
    aggregateId: userId,
    aggregateType: 'User',
    payload: {
      aggregateId: userId,
      changes: {
        before: {
          email: 'old.email@example.com',
          name: 'Old Name',
          phone: '+84900000000',
          apartment: 'A100',
        },
        after: updates,
      },
      updatedAt: new Date().toISOString(),
    },
  };

  const routingKey = 'auth.UserUpdatedEvent';
  const message = Buffer.from(JSON.stringify(event));

  channel.publish(AUTH_EXCHANGE, routingKey, message, {
    persistent: true,
    contentType: 'application/json',
  });

  console.log(`\n📤 Published UserUpdatedEvent:`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Updates:`, JSON.stringify(updates, null, 2));
  console.log(`   Routing Key: ${routingKey}`);
  console.log(`   Event ID: ${event.eventId}`);
}

async function publishUserDeletedEvent(channel, userId, userData) {
  const event = {
    eventId: `user-deleted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventType: 'auth.UserDeletedEvent',
    eventVersion: '1.0',
    timestamp: new Date().toISOString(),
    aggregateId: userId,
    aggregateType: 'User',
    payload: {
      aggregateId: userId,
      userData: userData,
      deletedAt: new Date().toISOString(),
      reason: 'User account deleted',
    },
  };

  const routingKey = 'auth.UserDeletedEvent';
  const message = Buffer.from(JSON.stringify(event));

  channel.publish(AUTH_EXCHANGE, routingKey, message, {
    persistent: true,
    contentType: 'application/json',
  });

  console.log(`\n📤 Published UserDeletedEvent:`);
  console.log(`   User ID: ${userId}`);
  console.log(`   User: ${userData.name} (${userData.email})`);
  console.log(`   Routing Key: ${routingKey}`);
  console.log(`   Event ID: ${event.eventId}`);
}

async function cleanupTestUsers() {
  console.log('\n🧹 Cleaning up test users from MongoDB...');

  let mongoClient;

  try {
    mongoClient = await MongoClient.connect(MONGODB_URL);
    const db = mongoClient.db();
    const usersCollection = db.collection('users');
    const queueOperationsCollection = db.collection('queue_operations');

    const testUserIds = testUsers.map((u) => u.userId);
    const testEmails = testUsers.map((u) => u.email);

    console.log(`   🔍 Searching for existing test users...`);
    console.log(`   User IDs: ${testUserIds.join(', ')}`);
    console.log(`   Emails: ${testEmails.join(', ')}`);

    // Check existing users by userId
    const existingUsersById = await usersCollection
      .find({
        userId: { $in: testUserIds },
      })
      .toArray();

    // Check existing users by email
    const existingUsersByEmail = await usersCollection
      .find({
        email: { $in: testEmails },
      })
      .toArray();

    const allExistingUsers = [...existingUsersById, ...existingUsersByEmail];
    const uniqueUsers = allExistingUsers.filter(
      (user, index, self) =>
        index === self.findIndex((u) => u._id.toString() === user._id.toString()),
    );

    if (uniqueUsers.length > 0) {
      console.log(`   Found ${uniqueUsers.length} existing test users:`);
      uniqueUsers.forEach((user) => {
        console.log(`   - ${user.name} (${user.email}) - ID: ${user.userId}`);
      });

      // Delete test users by userId
      const deleteResultById = await usersCollection.deleteMany({
        userId: { $in: testUserIds },
      });

      // Delete test users by email
      const deleteResultByEmail = await usersCollection.deleteMany({
        email: { $in: testEmails },
      });

      console.log(`   ✅ Deleted ${deleteResultById.deletedCount} users by userId`);
      console.log(`   ✅ Deleted ${deleteResultByEmail.deletedCount} users by email`);

      // Also cleanup queue operations for these users
      const queueDeleteResult = await queueOperationsCollection.deleteMany({
        'data.userId': { $in: testUserIds },
      });

      console.log(`   ✅ Deleted ${queueDeleteResult.deletedCount} queue operations`);
    } else {
      console.log(`   ℹ️  No existing test users found`);
    }

    // Additional cleanup: Remove any users with test email patterns
    const testEmailPattern = /@example\.com$/;
    const additionalCleanup = await usersCollection.deleteMany({
      email: { $regex: testEmailPattern },
    });

    if (additionalCleanup.deletedCount > 0) {
      console.log(
        `   🧹 Additional cleanup: Deleted ${additionalCleanup.deletedCount} users with @example.com emails`,
      );
    }
  } catch (error) {
    console.error(`   ❌ Failed to cleanup MongoDB:`, error.message);
    console.log(`   ⚠️  Continuing with test anyway...`);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

async function verifyUserSyncResults() {
  console.log('\n🔍 Verifying user synchronization results...');

  let mongoClient;

  try {
    mongoClient = await MongoClient.connect(MONGODB_URL);
    const db = mongoClient.db();
    const usersCollection = db.collection('users');

    const testUserIds = testUsers.map((u) => u.userId);

    // Check synchronized users
    const syncedUsers = await usersCollection
      .find({
        userId: { $in: testUserIds },
      })
      .toArray();

    console.log(`\n📊 Synchronization Results:`);
    console.log(`   Total test users: ${testUsers.length}`);
    console.log(`   Synced users: ${syncedUsers.length}`);

    if (syncedUsers.length > 0) {
      console.log(`\n✅ Successfully synced users:`);
      syncedUsers.forEach((user) => {
        console.log(`   - ${user.name} (${user.email})`);
        console.log(`     Role: ${user.role || 'N/A'}`);
        console.log(
          `     Building: ${user.building || 'N/A'}, Apartment: ${user.apartment || 'N/A'}`,
        );
        console.log(`     Sync Source: ${user.metadata?.syncSource || 'N/A'}`);
        console.log(`     Last Synced: ${user.metadata?.lastSyncedAt || 'N/A'}`);
        console.log(`     Created: ${user.createdAt || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log(`\n⚠️  No users were synchronized`);
    }

    // Check for Novu subscriber queue operations
    const queueOperationsCollection = db.collection('queue_operations');
    const novuOperations = await queueOperationsCollection
      .find({
        type: 'CREATE',
        'data.userId': { $in: testUserIds },
      })
      .toArray();

    console.log(`\n📋 Novu Subscriber Queue Operations:`);
    console.log(`   Total operations: ${novuOperations.length}`);

    if (novuOperations.length > 0) {
      console.log(`\n✅ Novu subscriber operations found:`);
      novuOperations.forEach((op) => {
        console.log(`   - User: ${op.data.userId}`);
        console.log(`     Type: ${op.type}`);
        console.log(`     Status: ${op.status}`);
        console.log(`     Priority: ${op.priority}`);
        console.log(`     Created: ${op.createdAt}`);
        console.log('');
      });
    } else {
      console.log(`\n⚠️  No Novu subscriber operations found`);
    }
  } catch (error) {
    console.error(`   ❌ Failed to verify results:`, error.message);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

async function checkNotificationServiceStatus() {
  console.log('\n🔍 Checking notification-service status...');

  let mongoClient;

  try {
    mongoClient = await MongoClient.connect(MONGODB_URL);
    const db = mongoClient.db();

    // Check if database is accessible
    const collections = await db.listCollections().toArray();
    console.log(`   ✅ MongoDB connection successful`);
    console.log(`   📊 Available collections: ${collections.map((c) => c.name).join(', ')}`);

    // Check if users collection exists and is accessible
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`   👥 Total users in database: ${userCount}`);

    return true;
  } catch (error) {
    console.error(`   ❌ Failed to connect to MongoDB:`, error.message);
    console.log(`   ⚠️  Make sure notification-service is running and MongoDB is accessible`);
    return false;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

async function testUserSynchronization() {
  let connection;
  let channel;

  try {
    console.log('🚀 Starting Complete User Synchronization Test via RabbitMQ\n');
    console.log('📋 Test Flow:');
    console.log('   1. Auth-Service Event');
    console.log('   2. ↓');
    console.log('   3. RabbitMQ UserCreatedEvent');
    console.log('   4. ↓');
    console.log('   5. UserEventListenerService (Early ACK: 110ms)');
    console.log('   6. ↓');
    console.log('   7. MongoDB: Create user record');
    console.log('   8. ↓');
    console.log('   9. NovuSubscriberQueueService: Enqueue CREATE task');
    console.log('   10. ↓');
    console.log('   11. Background: Novu subscriber creation\n');

    // Step 0: Check notification-service status
    const serviceStatus = await checkNotificationServiceStatus();
    if (!serviceStatus) {
      console.log('\n❌ Cannot proceed - notification-service is not accessible');
      console.log('💡 Make sure to:');
      console.log('   1. Start notification-service: npm run start:dev');
      console.log('   2. Check MongoDB connection');
      console.log('   3. Verify RabbitMQ connection');
      process.exit(1);
    }

    // Step 1: Cleanup existing test users from MongoDB
    await cleanupTestUsers();

    console.log(`\n📍 Connecting to RabbitMQ: ${RABBITMQ_URL}`);

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('✅ Connected to RabbitMQ\n');

    // Setup infrastructure
    await setupInfrastructure(channel);

    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: User Creation Events (UserCreatedEvent)');
    console.log('='.repeat(80));

    // Publish UserCreatedEvent for each test user
    for (const user of testUsers) {
      await publishUserCreatedEvent(channel, user);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms between events
    }

    console.log('\n✅ All UserCreatedEvents published');
    console.log('⏳ Wait 5 seconds for notification-service to process...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: User Update Event (UserUpdatedEvent)');
    console.log('='.repeat(80));

    // Update first user
    await publishUserUpdatedEvent(channel, testUsers[0].userId, {
      name: 'John Doe Updated',
      phone: '+84909999999',
      apartment: 'A102',
      building: 'Building A Updated',
    });

    console.log('\n✅ UserUpdatedEvent published');
    console.log('⏳ Wait 3 seconds for notification-service to process...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: Duplicate Prevention Test');
    console.log('='.repeat(80));

    // Try to create the same user again (should be skipped)
    await publishUserCreatedEvent(channel, testUsers[0]);

    console.log('\n✅ Duplicate UserCreatedEvent published (should be skipped)');
    console.log('⏳ Wait 3 seconds for notification-service to process...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n' + '='.repeat(80));
    console.log('TEST 4: User Deletion Event (UserDeletedEvent)');
    console.log('='.repeat(80));

    // Soft delete second user
    await publishUserDeletedEvent(channel, testUsers[1].userId, {
      name: testUsers[1].name,
      email: testUsers[1].email,
    });

    console.log('\n✅ UserDeletedEvent published');
    console.log('⏳ Wait 3 seconds for notification-service to process...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify results
    await verifyUserSyncResults();

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS COMPLETED');
    console.log('='.repeat(80));

    console.log('\n📊 Summary:');
    console.log(`   • Test users: ${testUsers.length}`);
    console.log(
      `   • Events published: ${testUsers.length + 3} (${testUsers.length} create + 1 update + 1 duplicate + 1 delete)`,
    );
    console.log(`   • Processing time: ~5 seconds`);
    console.log(`   • Consumer status: Automatic (notification-service)`);

    console.log('\n🔍 Verification Steps:');
    console.log('   1. Check notification-service logs for processing messages');
    console.log('   2. Verify users were created in MongoDB:');
    console.log(
      '      db.users.find({ userId: { $in: ["auth-user-001", "auth-user-002", "auth-user-003"] } })',
    );
    console.log('   3. Verify Novu subscriber tasks were queued:');
    console.log('      db.queue_operations.find({ type: "CREATE" })');
    console.log('   4. Check user metadata: syncSource = "rabbitmq-event"');

    console.log('\n💡 Next Steps:');
    console.log('   • Test with real auth-service integration');
    console.log('   • Monitor RabbitMQ management UI');
    console.log('   • Verify announcement targeting works with synced users');
    console.log('   • Test notification delivery to synced users');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('\n🔌 Disconnected from RabbitMQ');
  }
}

// Run tests
testUserSynchronization()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
