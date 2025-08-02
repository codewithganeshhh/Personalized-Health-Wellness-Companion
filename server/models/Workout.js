const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['cardio', 'strength', 'flexibility', 'balance', 'sports', 'yoga', 'pilates', 'hiit'],
    required: true
  },
  muscleGroups: [{
    type: String,
    enum: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'glutes', 'quads', 'hamstrings', 'calves', 'full-body']
  }],
  equipment: [{
    type: String,
    enum: ['none', 'dumbbells', 'barbell', 'resistance-bands', 'kettlebell', 'treadmill', 'stationary-bike', 'yoga-mat', 'stability-ball', 'pull-up-bar', 'bench']
  }],
  instructions: [{
    step: Number,
    description: String,
    duration: Number, // in seconds
    image: String,
    video: String
  }],
  sets: Number,
  reps: Number,
  duration: Number, // in seconds for time-based exercises
  restTime: Number, // in seconds
  caloriesPerMinute: Number,
  difficultyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  modifications: [{
    level: { type: String, enum: ['easier', 'harder'] },
    description: String
  }]
});

const WorkoutSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // Workout Details
  type: {
    type: String,
    enum: ['cardio', 'strength', 'flexibility', 'hiit', 'yoga', 'pilates', 'sports', 'circuit', 'mixed'],
    required: true
  },
  difficultyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  estimatedCalories: Number,
  
  // Exercises in this workout
  exercises: [ExerciseSchema],
  
  // Workout Structure
  warmUp: {
    duration: Number, // in minutes
    exercises: [ExerciseSchema]
  },
  coolDown: {
    duration: Number, // in minutes
    exercises: [ExerciseSchema]
  },
  
  // Requirements
  equipment: [{
    type: String,
    enum: ['none', 'dumbbells', 'barbell', 'resistance-bands', 'kettlebell', 'treadmill', 'stationary-bike', 'yoga-mat', 'stability-ball', 'pull-up-bar', 'bench']
  }],
  spaceRequired: {
    type: String,
    enum: ['small', 'medium', 'large', 'gym'],
    default: 'medium'
  },
  
  // Targeting
  primaryMuscleGroups: [{
    type: String,
    enum: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'glutes', 'quads', 'hamstrings', 'calves', 'full-body']
  }],
  fitnessGoals: [{
    type: String,
    enum: ['weight-loss', 'muscle-gain', 'endurance', 'strength', 'flexibility', 'balance', 'sports-performance']
  }],
  
  // Media
  thumbnailImage: String,
  instructionalVideo: String,
  
  // Metrics
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  totalCompleted: {
    type: Number,
    default: 0
  },
  
  // Tags for search and categorization
  tags: [String],
  
  // Schedule information (if this is a scheduled workout)
  schedule: {
    isScheduled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'bi-weekly', 'monthly'] },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday
    time: String, // HH:MM format
    timezone: String
  }
}, {
  timestamps: true
});

// Indexes
WorkoutSchema.index({ createdBy: 1 });
WorkoutSchema.index({ type: 1 });
WorkoutSchema.index({ difficultyLevel: 1 });
WorkoutSchema.index({ isTemplate: 1, isPublic: 1 });
WorkoutSchema.index({ 'fitnessGoals': 1 });
WorkoutSchema.index({ 'primaryMuscleGroups': 1 });
WorkoutSchema.index({ averageRating: -1 });
WorkoutSchema.index({ totalCompleted: -1 });
WorkoutSchema.index({ tags: 1 });

// Calculate total workout time including warm-up and cool-down
WorkoutSchema.methods.getTotalDuration = function() {
  let total = this.estimatedDuration;
  if (this.warmUp && this.warmUp.duration) total += this.warmUp.duration;
  if (this.coolDown && this.coolDown.duration) total += this.coolDown.duration;
  return total;
};

// Get all required equipment for the workout
WorkoutSchema.methods.getAllEquipment = function() {
  const equipment = new Set(this.equipment);
  
  // Add equipment from exercises
  this.exercises.forEach(exercise => {
    exercise.equipment.forEach(item => equipment.add(item));
  });
  
  // Add equipment from warm-up
  if (this.warmUp && this.warmUp.exercises) {
    this.warmUp.exercises.forEach(exercise => {
      exercise.equipment.forEach(item => equipment.add(item));
    });
  }
  
  // Add equipment from cool-down
  if (this.coolDown && this.coolDown.exercises) {
    this.coolDown.exercises.forEach(exercise => {
      exercise.equipment.forEach(item => equipment.add(item));
    });
  }
  
  return Array.from(equipment);
};

// Calculate estimated calories burned
WorkoutSchema.methods.calculateCalories = function(userWeight = 70) {
  let totalCalories = 0;
  
  this.exercises.forEach(exercise => {
    if (exercise.caloriesPerMinute) {
      const exerciseDuration = exercise.duration ? exercise.duration / 60 : 1; // Convert to minutes
      totalCalories += exercise.caloriesPerMinute * exerciseDuration * (userWeight / 70); // Adjust for weight
    }
  });
  
  return Math.round(totalCalories);
};

// Static method to find workouts by user preferences
WorkoutSchema.statics.findByPreferences = function(preferences) {
  const query = {};
  
  if (preferences.type) query.type = preferences.type;
  if (preferences.difficultyLevel) query.difficultyLevel = preferences.difficultyLevel;
  if (preferences.equipment) query.equipment = { $in: preferences.equipment };
  if (preferences.fitnessGoals) query.fitnessGoals = { $in: preferences.fitnessGoals };
  if (preferences.muscleGroups) query.primaryMuscleGroups = { $in: preferences.muscleGroups };
  if (preferences.maxDuration) query.estimatedDuration = { $lte: preferences.maxDuration };
  if (preferences.minRating) query.averageRating = { $gte: preferences.minRating };
  
  return this.find(query).sort({ averageRating: -1, totalCompleted: -1 });
};

// Static method to get popular workouts
WorkoutSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isPublic: true })
    .sort({ totalCompleted: -1, averageRating: -1 })
    .limit(limit)
    .populate('createdBy', 'firstName lastName');
};

// Static method to search workouts
WorkoutSchema.statics.searchWorkouts = function(searchTerm, filters = {}) {
  const query = {
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  // Apply filters
  if (filters.type) query.type = filters.type;
  if (filters.difficultyLevel) query.difficultyLevel = filters.difficultyLevel;
  if (filters.equipment) query.equipment = { $in: filters.equipment };
  if (filters.isPublic !== undefined) query.isPublic = filters.isPublic;
  
  return this.find(query)
    .sort({ averageRating: -1, totalCompleted: -1 })
    .populate('createdBy', 'firstName lastName');
};

module.exports = mongoose.model('Workout', WorkoutSchema);