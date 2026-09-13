const mongoose = require('mongoose');
const { Schema } = mongoose;

// Compte humain (responsable commercial / admin) pour le tableau de bord.
const UserSchema = new Schema(
  {
    boutiqueId: { type: Schema.Types.ObjectId, ref: 'Boutique', required: true, index: true },
    nom: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    motDePasseHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'commercial'], default: 'commercial' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
