const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';

// Auto-detect Supabase or Neon cloud providers
const isCloudDb = dbUrl.includes('supabase.co') || 
                  dbUrl.includes('supabase.com') || 
                  dbUrl.includes('pooler.supabase.com') ||
                  dbUrl.includes('neon.tech') ||
                  process.env.DB_SSL === 'true' ||
                  dbUrl.includes('sslmode=require');

const sequelizeOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
};

// Supabase and modern cloud PostgreSQL strictly require SSL
if (isCloudDb) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false // Prevents intermediate certificate rejection
    }
  };
}

const sequelize = dbUrl
  ? new Sequelize(dbUrl, sequelizeOptions)
  : new Sequelize(
      process.env.DB_NAME || 'gallery_of_wonders',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 5432,
        ...sequelizeOptions
      }
    );

const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(' PostgreSQL connected successfully via Sequelize (Supabase / Cloud Ready)');

    // Automatically ensure tables exist in Supabase without dropping existing data
    await sequelize.sync({ alter: false });
    console.log(' Database schema synchronized successfully');
  } catch (error) {
    console.warn(' PostgreSQL connection failed (check your credentials in .env):', error.message);
  }
};

module.exports = { sequelize, testDbConnection };
