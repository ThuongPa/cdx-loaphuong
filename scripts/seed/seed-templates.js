const { MongoClient } = require('mongodb');
const {
  NotificationTemplateFactory,
} = require('../../dist/modules/notification/templates/domain/notification-template.factory');

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notification-service';
const DB_NAME = process.env.DB_NAME || 'notification-service';

async function seedTemplates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);
    const templatesCollection = db.collection('notification_templates');

    // Check if templates already exist
    const existingCount = await templatesCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing templates. Skipping seeding.`);
      return;
    }

    // Create default templates using factory
    const defaultTemplates = NotificationTemplateFactory.createDefaultTemplates('system');

    // Convert domain objects to MongoDB documents
    const templateDocuments = defaultTemplates.map((template) => {
      const props = template.toPersistence();
      return {
        _id: props.id,
        name: props.name,
        type: props.type,
        channel: props.channel,
        subject: props.subject,
        body: props.body,
        language: props.language,
        variables: props.variables,
        isActive: props.isActive,
        createdBy: props.createdBy,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      };
    });

    // Insert templates
    const result = await templatesCollection.insertMany(templateDocuments);
    console.log(`Successfully seeded ${result.insertedCount} templates`);

    // Create indexes for performance
    await templatesCollection.createIndex({ name: 1 });
    await templatesCollection.createIndex({ type: 1 });
    await templatesCollection.createIndex({ channel: 1 });
    await templatesCollection.createIndex({ language: 1 });
    await templatesCollection.createIndex({ isActive: 1 });
    await templatesCollection.createIndex({ createdBy: 1 });
    await templatesCollection.createIndex({ type: 1, channel: 1, language: 1, isActive: 1 });
    await templatesCollection.createIndex({ name: 1, isActive: 1 });
    await templatesCollection.createIndex({ createdBy: 1, createdAt: -1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error seeding templates:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('Template seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Template seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTemplates };
