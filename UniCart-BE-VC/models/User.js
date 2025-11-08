import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // optional for google
  googleId: { type: String }, // for oauth
  role: { type: String },
  profile: {
    phone: { type: String },
    collegeRoll: { type: String },
    hostel: { type: String },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    avatar: { type: String },
  },
  agreeToTerms: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
  verificationEmailSentAt: { type: Date },
  rating: { type: Number, default: 0 },
}, { timestamps: true });

// hash password if set
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// compare password for login
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);