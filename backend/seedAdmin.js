const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    const dbURI = process.env.MONGO_URI || 'mongodb://developer:dev1234@ac-zqvmyqq-shard-00-00.br5bcum.mongodb.net:27017,ac-zqvmyqq-shard-00-01.br5bcum.mongodb.net:27017,ac-zqvmyqq-shard-00-02.br5bcum.mongodb.net:27017/LuminaLearn?ssl=true&replicaSet=atlas-l6y6kk-shard-0&authSource=admin&appName=LuminaLearnCluster';
    
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(dbURI);
    }

    const adminEmail = 'admin@luminalearn.com';
    const adminPassword = 'admin123';

    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        mustChangePassword: false
      });
      console.log('✅ Default Admin account created successfully!');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    } else {
      console.log(`ℹ️ Admin account already exists: ${admin.email}`);
    }
  } catch (err) {
    console.error('❌ Error seeding admin account:', err);
  }
};

if (require.main === module) {
  seedAdmin().then(() => mongoose.disconnect());
}

module.exports = seedAdmin;
