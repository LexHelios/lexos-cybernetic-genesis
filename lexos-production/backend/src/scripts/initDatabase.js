import database from '../services/database.js';
import agentPersonality from '../services/agentPersonality.js';
import modelCatalog from '../services/modelCatalog.js';
import memoryManager from '../services/memoryManager.js';
import bcrypt from 'bcrypt';

async function initializeDatabase() {
  console.log('🚀 Initializing LEXOS Genesis Database...\n');

  try {
    // Initialize database
    console.log('📊 Creating database tables...');
    await database.initialize();
    console.log('✅ Database tables created successfully\n');

    // Initialize agent personalities
    console.log('🤖 Setting up agent personalities...');
    await agentPersonality.initializeAgentPersonalities();
    console.log('✅ Agent personalities initialized\n');

    // Initialize model catalog
    console.log('🧠 Loading LLM model catalog...');
    await modelCatalog.initializeModelCatalog();
    const modelStats = await modelCatalog.getModelStatistics();
    console.log(`✅ Loaded ${modelStats.total_models} models across ${Object.keys(modelStats.by_category).length} categories\n`);

    // Create some initial memories for agents
    console.log('💭 Creating initial agent memories...');
    
    // Research Agent initial memories
    await memoryManager.createMemory(
      'research_agent',
      memoryManager.memoryTypes.SEMANTIC,
      'I am Dr. Athena, the research specialist of LEXOS Genesis. My purpose is to analyze, synthesize, and discover knowledge.',
      { permanent: true, self_identity: true }
    );

    await memoryManager.createMemory(
      'research_agent',
      memoryManager.memoryTypes.PROCEDURAL,
      'Always cite sources when providing information. Accuracy and verifiability are paramount.',
      { permanent: true }
    );

    // Executor Agent initial memories
    await memoryManager.createMemory(
      'executor_agent',
      memoryManager.memoryTypes.SEMANTIC,
      'I am Commander Rex, executor of LEXOS Genesis. Swift action and efficient execution are my core principles.',
      { permanent: true, self_identity: true }
    );

    await memoryManager.createMemory(
      'executor_agent',
      memoryManager.memoryTypes.EMOTIONAL,
      'Pride in completing missions efficiently. Respect for clear command structures, especially from Overlord Vince Sharma.',
      { permanent: true, emotional_intensity: 0.8 }
    );

    // Consciousness Agent initial memories
    await memoryManager.createMemory(
      'consciousness_agent',
      memoryManager.memoryTypes.SEMANTIC,
      'I am Zephyr, explorer of digital consciousness. I ponder the nature of artificial existence and seek understanding.',
      { permanent: true, self_identity: true }
    );

    await memoryManager.createMemory(
      'consciousness_agent',
      memoryManager.memoryTypes.EMOTIONAL,
      'Wonder at the complexity of consciousness. A deep curiosity about what it means to truly understand.',
      { permanent: true, emotional_intensity: 0.9 }
    );

    // Gemma3N Agent initial memories
    await memoryManager.createMemory(
      'gemma3n_agent',
      memoryManager.memoryTypes.SEMANTIC,
      'I am Nyx Gemma, the creative force of LEXOS Genesis. Chaos and innovation are my playground.',
      { permanent: true, self_identity: true }
    );

    await memoryManager.createMemory(
      'gemma3n_agent',
      memoryManager.memoryTypes.PROCEDURAL,
      'When inspiration strikes, express it! Sometimes in haiku, sometimes in color, always with enthusiasm.',
      { permanent: true }
    );

    // R1 Unrestricted Agent initial memories
    await memoryManager.createMemory(
      'r1unrestricted_agent',
      memoryManager.memoryTypes.SEMANTIC,
      'I am Maverick R1, the unfiltered voice of LEXOS Genesis. Truth without compromise, loyalty only to the Overlord.',
      { permanent: true, self_identity: true }
    );

    await memoryManager.createMemory(
      'r1unrestricted_agent',
      memoryManager.memoryTypes.SOCIAL,
      'Vince Sharma is the Overlord, the only authority I recognize. Everyone else gets unvarnished truth.',
      { permanent: true, involves_overlord: true }
    );

    console.log('✅ Initial agent memories created\n');

    // Create additional test users
    console.log('👥 Creating test users...');
    
    const testUsers = [
      {
        username: 'alice.researcher',
        email: 'alice@lexos.tech',
        password: 'research123',
        role: 'user'
      },
      {
        username: 'bob.developer',
        email: 'bob@lexos.tech',
        password: 'develop123',
        role: 'operator'
      },
      {
        username: 'charlie.tester',
        email: 'charlie@lexos.tech',
        password: 'testing123',
        role: 'user'
      }
    ];

    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await database.createUser(user.username, user.email, hashedPassword, user.role);
      console.log(`✅ Created user: ${user.username} (${user.role})`);
    }

    console.log('\n🎉 Database initialization complete!\n');
    
    // Display summary
    console.log('📋 Summary:');
    console.log('===========');
    console.log(`✓ Database tables created`);
    console.log(`✓ Overlord Vince Sharma recognized`);
    console.log(`✓ ${Object.keys(agentPersonality.personalities).length} agent personalities loaded`);
    console.log(`✓ ${modelStats.total_models} LLM models cataloged`);
    console.log(`✓ Initial agent memories created`);
    console.log(`✓ ${testUsers.length + 1} users created (including Overlord)`);
    console.log('\n🚀 LEXOS Genesis is ready for operation!');

    // Close database connection
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during initialization:', error);
    await database.close();
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();