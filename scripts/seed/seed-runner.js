const { seedTemplates } = require('./seed-templates');

async function runAllSeeds() {
  console.log('Starting database seeding...');

  try {
    // Seed templates
    console.log('\n=== Seeding Templates ===');
    await seedTemplates();

    console.log('\n=== All seeding completed successfully ===');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run all seeds if called directly
if (require.main === module) {
  runAllSeeds();
}

module.exports = { runAllSeeds };
