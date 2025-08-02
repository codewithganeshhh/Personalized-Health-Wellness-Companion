const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // Basic Authentication
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  
  // Health Profile
  healthProfile: {
    height: {
      value: Number,
      unit: { type: String, enum: ['cm', 'ft'], default: 'cm' }
    },
    weight: {
      value: Number,
      unit: { type: String, enum: ['kg', 'lbs'], default: 'kg' }
    },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'],
      default: 'moderately-active'
    },
    fitnessGoals: [{
      type: String,
      enum: ['weight-loss', 'weight-gain', 'muscle-gain', 'endurance', 'strength', 'flexibility', 'general-health']
    }],
    healthConditions: [{
      condition: String,
      severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
      medications: [String]
    }],
    allergies: [String],
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher', 'keto', 'paleo']
    }]
  },
  
  // Preferences
  preferences: {
    notifications: {
      workoutReminders: { type: Boolean, default: true },
      mealReminders: { type: Boolean, default: true },
      progressUpdates: { type: Boolean, default: true },
      communityUpdates: { type: Boolean, default: false }
    },
    privacy: {
      shareProgress: { type: Boolean, default: false },
      shareWorkouts: { type: Boolean, default: false },
      allowMessages: { type: Boolean, default: true }
    },
    units: {
      weight: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
      distance: { type: String, enum: ['km', 'miles'], default: 'km' },
      temperature: { type: String, enum: ['celsius', 'fahrenheit'], default: 'celsius' }
    }
  },
  
  // Biometric Integrations
  connectedDevices: [{
    provider: { type: String, enum: ['fitbit', 'garmin', 'apple-health', 'google-fit', 'manual'] },
    deviceId: String,
    accessToken: String,
    refreshToken: String,
    isActive: { type: Boolean, default: true },
    lastSync: Date
  }],
  
  // Gamification
  gamification: {
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    badges: [{
      name: String,
      description: String,
      earnedAt: Date,
      icon: String
    }],
    streaks: {
      workout: { current: { type: Number, default: 0 }, longest: { type: Number, default: 0 } },
      nutrition: { current: { type: Number, default: 0 }, longest: { type: Number, default: 0 } },
      mindfulness: { current: { type: Number, default: 0 }, longest: { type: Number, default: 0 } }
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Subscription/Premium
  subscription: {
    type: { type: String, enum: ['free', 'premium', 'expert'], default: 'free' },
    startDate: Date,
    endDate: Date,
    autoRenew: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ 'gamification.level': -1 });
UserSchema.index({ lastActive: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get age
UserSchema.methods.getAge = function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Method to calculate BMI
UserSchema.methods.calculateBMI = function() {
  if (!this.healthProfile.height?.value || !this.healthProfile.weight?.value) {
    return null;
  }
  
  let height = this.healthProfile.height.value;
  let weight = this.healthProfile.weight.value;
  
  // Convert to metric if needed
  if (this.healthProfile.height.unit === 'ft') {
    height = height * 30.48; // Convert feet to cm
  }
  if (this.healthProfile.weight.unit === 'lbs') {
    weight = weight * 0.453592; // Convert lbs to kg
  }
  
  // BMI = weight(kg) / (height(m))^2
  const heightInMeters = height / 100;
  return (weight / (heightInMeters * heightInMeters)).toFixed(1);
};

// Method to update experience and level
UserSchema.methods.addExperience = function(points) {
  this.gamification.experience += points;
  
  // Level up logic (every 1000 XP = 1 level)
  const newLevel = Math.floor(this.gamification.experience / 1000) + 1;
  if (newLevel > this.gamification.level) {
    this.gamification.level = newLevel;
    return { leveledUp: true, newLevel };
  }
  
  return { leveledUp: false, newLevel: this.gamification.level };
};

module.exports = mongoose.model('User', UserSchema);