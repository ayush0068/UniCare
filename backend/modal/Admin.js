const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    pass: { type: String, required: true },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'super_admin'],
        default: 'admin'
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    permissions: {
        userManagement:   { type: Boolean, default: true },
        doctorManagement: { type: Boolean, default: true },
        paymentManagement:{ type: Boolean, default: true },
        analytics:        { type: Boolean, default: true },
    }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);