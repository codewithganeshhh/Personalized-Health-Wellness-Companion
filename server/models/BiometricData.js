const mongoose = require('mongoose');

const BiometricDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Data source information
  source: {
    type: String,
    enum: ['manual', 'fitbit', 'garmin', 'apple-health', 'google-fit', 'smart-scale', 'heart-rate-monitor'],
    required: true
  },
  deviceInfo: {
    deviceId: String,
    deviceName: String,
    manufacturer: String,
    model: String
  },
  
  // Timestamp for the measurement
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  
  // Vital Signs
  vitals: {
    heartRate: {
      value: Number,
      unit: { type: String, default: 'bpm' },
      context: { type: String, enum: ['resting', 'active', 'peak', 'recovery'] }
    },
    bloodPressure: {
      systolic: Number,
      diastolic: Number,
      unit: { type: String, default: 'mmHg' }
    },
    oxygenSaturation: {
      value: Number,
      unit: { type: String, default: '%' }
    },
    bodyTemperature: {
      value: Number,
      unit: { type: String, enum: ['celsius', 'fahrenheit'], default: 'celsius' }
    },
    respiratoryRate: {
      value: Number,
      unit: { type: String, default: 'breaths/min' }
    }
  },
  
  // Body Composition
  bodyComposition: {
    weight: {
      value: Number,
      unit: { type: String, enum: ['kg', 'lbs'], default: 'kg' }
    },
    bodyFatPercentage: Number,
    muscleMass: {
      value: Number,
      unit: { type: String, enum: ['kg', 'lbs'], default: 'kg' }
    },
    boneDensity: {
      value: Number,
      unit: { type: String, default: 'g/cm²' }
    },
    visceralFat: Number,
    waterPercentage: Number,
    metabolicAge: Number
  },
  
  // Activity Metrics
  activity: {
    steps: Number,
    distance: {
      value: Number,
      unit: { type: String, enum: ['km', 'miles'], default: 'km' }
    },
    caloriesBurned: Number,
    activeMinutes: {
      light: Number,
      moderate: Number,
      vigorous: Number
    },
    floors: Number,
    elevation: {
      value: Number,
      unit: { type: String, enum: ['m', 'ft'], default: 'm' }
    }
  },
  
  // Sleep Data
  sleep: {
    duration: Number, // in minutes
    efficiency: Number, // percentage
    stages: {
      deep: Number, // minutes
      light: Number, // minutes
      rem: Number, // minutes
      awake: Number // minutes
    },
    bedTime: Date,
    wakeTime: Date,
    restlessness: Number,
    sleepScore: Number
  },
  
  // Stress and Recovery
  stress: {
    level: {
      type: String,
      enum: ['low', 'moderate', 'high', 'very-high']
    },
    score: Number, // 0-100
    hrv: { // Heart Rate Variability
      value: Number,
      unit: { type: String, default: 'ms' }
    }
  },
  
  // Nutrition Data
  nutrition: {
    calories: Number,
    macros: {
      protein: { value: Number, unit: { type: String, default: 'g' } },
      carbs: { value: Number, unit: { type: String, default: 'g' } },
      fat: { value: Number, unit: { type: String, default: 'g' } },
      fiber: { value: Number, unit: { type: String, default: 'g' } }
    },
    micronutrients: [{
      name: String,
      value: Number,
      unit: String,
      dailyValuePercentage: Number
    }],
    hydration: {
      intake: Number, // in ml
      goal: Number // in ml
    }
  },
  
  // Environmental Data
  environment: {
    temperature: {
      value: Number,
      unit: { type: String, enum: ['celsius', 'fahrenheit'], default: 'celsius' }
    },
    humidity: Number, // percentage
    airQuality: {
      index: Number,
      status: { type: String, enum: ['good', 'moderate', 'unhealthy-sensitive', 'unhealthy', 'very-unhealthy', 'hazardous'] }
    },
    uvIndex: Number
  },
  
  // Mental Health Indicators
  mentalHealth: {
    moodScore: {
      type: Number,
      min: 1,
      max: 10
    },
    anxietyLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'severe']
    },
    energyLevel: {
      type: Number,
      min: 1,
      max: 10
    },
    meditationMinutes: Number,
    gratitudeEntries: Number
  },
  
  // Custom Metrics
  customMetrics: [{
    name: String,
    value: Number,
    unit: String,
    description: String
  }],
  
  // Data Quality
  dataQuality: {
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    },
    validated: {
      type: Boolean,
      default: false
    },
    anomaly: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Compound indexes for efficient queries
BiometricDataSchema.index({ userId: 1, timestamp: -1 });
BiometricDataSchema.index({ userId: 1, source: 1, timestamp: -1 });
BiometricDataSchema.index({ timestamp: -1 });
BiometricDataSchema.index({ 'vitals.heartRate.value': 1 });
BiometricDataSchema.index({ 'bodyComposition.weight.value': 1 });
BiometricDataSchema.index({ 'activity.steps': 1 });

// Static method to get latest data for user
BiometricDataSchema.statics.getLatestForUser = function(userId, dataType = null, limit = 1) {
  const query = { userId };
  
  if (dataType) {
    // Add specific data type filters
    switch (dataType) {
      case 'vitals':
        query['vitals.heartRate.value'] = { $exists: true };
        break;
      case 'weight':
        query['bodyComposition.weight.value'] = { $exists: true };
        break;
      case 'activity':
        query['activity.steps'] = { $exists: true };
        break;
      case 'sleep':
        query['sleep.duration'] = { $exists: true };
        break;
    }
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName preferences.units');
};

// Static method to get data range for user
BiometricDataSchema.statics.getDataRange = function(userId, startDate, endDate, dataTypes = []) {
  const query = {
    userId,
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  // Add data type filters if specified
  if (dataTypes.length > 0) {
    const orConditions = [];
    dataTypes.forEach(type => {
      switch (type) {
        case 'vitals':
          orConditions.push({ 'vitals.heartRate.value': { $exists: true } });
          orConditions.push({ 'vitals.bloodPressure.systolic': { $exists: true } });
          break;
        case 'weight':
          orConditions.push({ 'bodyComposition.weight.value': { $exists: true } });
          break;
        case 'activity':
          orConditions.push({ 'activity.steps': { $exists: true } });
          break;
        case 'sleep':
          orConditions.push({ 'sleep.duration': { $exists: true } });
          break;
        case 'nutrition':
          orConditions.push({ 'nutrition.calories': { $exists: true } });
          break;
      }
    });
    
    if (orConditions.length > 0) {
      query.$or = orConditions;
    }
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .populate('userId', 'firstName lastName preferences.units');
};

// Method to calculate trends
BiometricDataSchema.statics.calculateTrends = async function(userId, metric, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const pipeline = [
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
        [metric]: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        avgValue: { $avg: `$${metric}` },
        minValue: { $min: `$${metric}` },
        maxValue: { $max: `$${metric}` },
        count: { $sum: 1 },
        date: { $first: '$timestamp' }
      }
    },
    {
      $sort: { date: 1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('BiometricData', BiometricDataSchema);