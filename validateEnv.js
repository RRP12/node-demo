// validateEnv.js - Environment variable validation
const requiredEnvVars = [
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const optionalEnvVars = [
  'MONGO_URI',
  'PORT',
  'NODE_ENV'
];

function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  const missing = [];
  const warnings = [];
  
  // Check required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    } else {
      console.log(`✅ ${envVar}: Set`);
    }
  }
  
  // Check optional environment variables
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    } else {
      console.log(`✅ ${envVar}: Set`);
    }
  }
  
  // Report warnings for optional variables
  if (warnings.length > 0) {
    console.log('\n⚠️  Optional environment variables not set (using defaults):');
    warnings.forEach(envVar => {
      console.log(`   - ${envVar}`);
    });
  }
  
  // Fail if required variables are missing
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(envVar => {
      console.error(`   - ${envVar}`);
    });
    console.error('\n💡 Please set these environment variables and restart the application.');
    console.error('   You can create a .env file in the project root with these variables.');
    process.exit(1);
  }
  
  // Validate specific formats
  validateSpecificFormats();
  
  console.log('✅ Environment validation passed!\n');
}

function validateSpecificFormats() {
  // Validate JWT secrets are not too short
  if (process.env.ACCESS_TOKEN_SECRET && process.env.ACCESS_TOKEN_SECRET.length < 32) {
    console.warn('⚠️  ACCESS_TOKEN_SECRET should be at least 32 characters long for security');
  }
  
  if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < 32) {
    console.warn('⚠️  REFRESH_TOKEN_SECRET should be at least 32 characters long for security');
  }
  
  // Validate PORT if provided
  if (process.env.PORT && (isNaN(process.env.PORT) || process.env.PORT < 1 || process.env.PORT > 65535)) {
    console.error('❌ PORT must be a valid number between 1 and 65535');
    process.exit(1);
  }
  
  // Validate NODE_ENV if provided
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    console.warn('⚠️  NODE_ENV should be one of: development, production, test');
  }
}

module.exports = { validateEnvironment };
