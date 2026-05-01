/**
 * scripts/seedSuperAdmin.js
 *
 * Run once to create the super admin from your .env:
 *   node scripts/seedSuperAdmin.js
 *
 * Required env vars:
 *   MONGO_URI
 *   SUPER_ADMIN_EMAIL
 *   SUPER_ADMIN_PASS
 *   SUPER_ADMIN_NAME   (optional, defaults to "Super Admin")
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const Admin    = require('../modal/Admin');

(async () => {
    const { MONGO_URI, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASS, SUPER_ADMIN_NAME } = process.env;

    if (!MONGO_URI || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASS) {
        console.error('❌  Missing MONGO_URI, SUPER_ADMIN_EMAIL, or SUPER_ADMIN_PASS in .env');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log('✅  MongoDB connected');

    const exists = await Admin.findOne({ email: SUPER_ADMIN_EMAIL });
    if (exists) {
        console.log(`ℹ️   Super admin already exists: ${SUPER_ADMIN_EMAIL}`);
        await mongoose.disconnect();
        return;
    }

    const hashed = await bcrypt.hash(SUPER_ADMIN_PASS, 12);
    await Admin.create({
        name:  SUPER_ADMIN_NAME || 'Super Admin',
        email: SUPER_ADMIN_EMAIL,
        pass:  hashed,
        role:  'super_admin',
        permissions: {
            userManagement:    true,
            doctorManagement:  true,
            paymentManagement: true,
            analytics:         true,
        },
    });

    console.log(`✅  Super admin created: ${SUPER_ADMIN_EMAIL}`);
    await mongoose.disconnect();
})();