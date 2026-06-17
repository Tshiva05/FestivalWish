/**
 * models/Wish.js
 */
const mongoose = require('mongoose');

const WishSchema = new mongoose.Schema({
  shareId:        { type: String, required: true, unique: true, index: true, trim: true },
  senderName:     { type: String, required: true, trim: true, maxlength: 60 },
  message:        { type: String, required: true, trim: true, maxlength: 500 },
  festival: {
    type: String, required: true,
    enum: ['diwali','sankranti','holi','christmas','newyear','birthday','eid','navratri'],
  },
  imageUrl:       { type: String, required: true },
  imagePublicId:  { type: String },
  audioType:      { type: String, enum: ['default','custom','none'], default: 'none' },
  defaultSongKey: { type: String, default: null },
  audioUrl:       { type: String, default: null },
  audioPublicId:  { type: String, default: null },
  views:          { type: Number, default: 0 },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Wish', WishSchema);

