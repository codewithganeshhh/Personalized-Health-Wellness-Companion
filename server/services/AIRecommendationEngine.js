const OpenAI = require('openai');
const tf = require('@tensorflow/tfjs-node');
const { Matrix } = require('ml-matrix');
const User = require('../models/User');
const BiometricData = require('../models/BiometricData');
const Workout = require('../models/Workout');

class AIRecommendationEngine {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    this.userProfiles = new Map(); // Cache for user profiles
    this.modelCache = new Map(); // Cache for ML models
  }

  // Main recommendation method
  async generateRecommendations(userId, type = 'all', options = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Get user's health data and preferences
      const userProfile = await this.buildUserProfile(userId);
      
      let recommendations = {};

      if (type === 'all' || type === 'workout') {
        recommendations.workouts = await this.generateWorkoutRecommendations(userProfile, options);
      }

      if (type === 'all' || type === 'nutrition') {
        recommendations.nutrition = await this.generateNutritionRecommendations(userProfile, options);
      }

      if (type === 'all' || type === 'mindfulness') {
        recommendations.mindfulness = await this.generateMindfulnessRecommendations(userProfile, options);
      }

      if (type === 'all' || type === 'goals') {
        recommendations.goals = await this.generateGoalRecommendations(userProfile, options);
      }

      return {
        userId,
        timestamp: new Date(),
        recommendations,
        userProfile: {
          fitnessLevel: userProfile.fitnessLevel,
          goals: userProfile.goals,
          preferences: userProfile.preferences
        }
      };

    } catch (error) {
      console.error('Recommendation generation error:', error);
      throw error;
    }
  }

  // Build comprehensive user profile for recommendations
  async buildUserProfile(userId) {
    try {
      if (this.userProfiles.has(userId)) {
        const cached = this.userProfiles.get(userId);
        if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
          return cached.profile;
        }
      }

      const user = await User.findById(userId);
      
      // Get recent biometric data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const biometricData = await BiometricData.getDataRange(userId, thirtyDaysAgo, new Date());
      
      // Calculate fitness level based on activity data
      const fitnessLevel = this.calculateFitnessLevel(user, biometricData);
      
      // Analyze health trends
      const healthTrends = await this.analyzeHealthTrends(userId, biometricData);
      
      // Get user preferences and constraints
      const preferences = this.extractPreferences(user);
      
      const profile = {
        userId,
        age: user.getAge(),
        gender: user.gender,
        goals: user.healthProfile.fitnessGoals || [],
        activityLevel: user.healthProfile.activityLevel,
        fitnessLevel,
        healthTrends,
        preferences,
        constraints: this.identifyConstraints(user),
        recentActivity: this.analyzeRecentActivity(biometricData),
        bmi: user.calculateBMI(),
        timestamp: Date.now()
      };

      // Cache the profile
      this.userProfiles.set(userId, { profile, timestamp: Date.now() });
      
      return profile;

    } catch (error) {
      console.error('Error building user profile:', error);
      throw error;
    }
  }

  // Generate personalized workout recommendations
  async generateWorkoutRecommendations(userProfile, options = {}) {
    try {
      const { count = 5, difficulty, type, equipment } = options;
      
      // Use ML to find similar users and their successful workouts
      const collaborativeRecs = await this.getCollaborativeWorkoutRecommendations(userProfile);
      
      // Content-based filtering using user preferences and constraints
      const contentRecs = await this.getContentBasedWorkoutRecommendations(userProfile, {
        difficulty,
        type,
        equipment
      });
      
      // AI-powered custom workout generation
      const aiCustomWorkouts = await this.generateCustomWorkouts(userProfile);
      
      // Combine and rank recommendations
      const allRecommendations = [
        ...collaborativeRecs.map(r => ({ ...r, source: 'collaborative', weight: 0.4 })),
        ...contentRecs.map(r => ({ ...r, source: 'content', weight: 0.4 })),
        ...aiCustomWorkouts.map(r => ({ ...r, source: 'ai-generated', weight: 0.2 }))
      ];

      // Apply machine learning ranking
      const rankedRecommendations = await this.rankRecommendations(allRecommendations, userProfile);
      
      return {
        recommendations: rankedRecommendations.slice(0, count),
        reasoning: this.generateWorkoutReasoning(userProfile, rankedRecommendations),
        adaptations: this.suggestWorkoutAdaptations(userProfile)
      };

    } catch (error) {
      console.error('Workout recommendation error:', error);
      return { recommendations: [], reasoning: 'Unable to generate recommendations at this time.' };
    }
  }

  // Generate nutrition recommendations with AI
  async generateNutritionRecommendations(userProfile, options = {}) {
    try {
      if (!this.openai) {
        return this.getFallbackNutritionRecommendations(userProfile);
      }

      const prompt = this.buildNutritionPrompt(userProfile, options);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a certified nutritionist and health expert. Provide personalized, science-based nutrition recommendations in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content);
      
      // Enhance AI recommendations with calculated macros and calories
      const enhancedRecommendations = await this.enhanceNutritionRecommendations(aiResponse, userProfile);
      
      return enhancedRecommendations;

    } catch (error) {
      console.error('Nutrition recommendation error:', error);
      return this.getFallbackNutritionRecommendations(userProfile);
    }
  }

  // Generate mindfulness and mental health recommendations
  async generateMindfulnessRecommendations(userProfile, options = {}) {
    try {
      const stressLevel = this.calculateStressLevel(userProfile);
      const sleepQuality = this.calculateSleepQuality(userProfile);
      const moodTrends = this.analyzeMoodTrends(userProfile);

      let recommendations = [];

      // Stress management recommendations
      if (stressLevel > 3) {
        recommendations.push(...this.getStressReductionActivities(stressLevel));
      }

      // Sleep improvement recommendations
      if (sleepQuality < 3) {
        recommendations.push(...this.getSleepImprovementTips(sleepQuality));
      }

      // Mood enhancement activities
      recommendations.push(...this.getMoodEnhancementActivities(moodTrends));

      // Meditation and breathing exercises
      recommendations.push(...this.getMeditationRecommendations(userProfile));

      // AI-powered personalized mindfulness plan
      if (this.openai) {
        const aiMindfulness = await this.generateAIMindfulnessRecommendations(userProfile);
        recommendations.push(...aiMindfulness);
      }

      return {
        recommendations: recommendations.slice(0, 8),
        stressLevel,
        sleepQuality,
        focusAreas: this.identifyMindfulnessFocusAreas(userProfile),
        dailyPractices: this.suggestDailyMindfulnessPractices(userProfile)
      };

    } catch (error) {
      console.error('Mindfulness recommendation error:', error);
      return { recommendations: [], focusAreas: ['general-wellness'] };
    }
  }

  // Generate goal recommendations and adjustments
  async generateGoalRecommendations(userProfile, options = {}) {
    try {
      const currentGoals = userProfile.goals;
      const healthTrends = userProfile.healthTrends;
      const progressAnalysis = await this.analyzeGoalProgress(userProfile);

      const recommendations = {
        adjustments: [],
        newGoals: [],
        milestones: [],
        timeline: {}
      };

      // Analyze current goal feasibility
      for (const goal of currentGoals) {
        const analysis = this.analyzeGoalFeasibility(goal, userProfile, progressAnalysis);
        if (analysis.needsAdjustment) {
          recommendations.adjustments.push(analysis);
        }
      }

      // Suggest new goals based on progress and trends
      const potentialGoals = this.identifyPotentialGoals(userProfile, progressAnalysis);
      recommendations.newGoals = potentialGoals;

      // Create milestone recommendations
      recommendations.milestones = this.generateMilestones(userProfile, currentGoals);

      // Generate timeline recommendations
      recommendations.timeline = this.generateGoalTimeline(userProfile, currentGoals);

      return recommendations;

    } catch (error) {
      console.error('Goal recommendation error:', error);
      return { adjustments: [], newGoals: [], milestones: [] };
    }
  }

  // Calculate fitness level based on user data
  calculateFitnessLevel(user, biometricData) {
    let score = 0;
    let factors = 0;

    // Activity level factor
    const activityLevels = {
      'sedentary': 1,
      'lightly-active': 2,
      'moderately-active': 3,
      'very-active': 4,
      'extremely-active': 5
    };
    
    score += (activityLevels[user.healthProfile.activityLevel] || 2);
    factors++;

    // Recent activity data
    const recentActivity = biometricData.filter(d => d.activity && d.activity.steps);
    if (recentActivity.length > 0) {
      const avgSteps = recentActivity.reduce((sum, d) => sum + d.activity.steps, 0) / recentActivity.length;
      if (avgSteps > 10000) score += 5;
      else if (avgSteps > 7500) score += 4;
      else if (avgSteps > 5000) score += 3;
      else if (avgSteps > 2500) score += 2;
      else score += 1;
      factors++;
    }

    // Heart rate variability (if available)
    const hrvData = biometricData.filter(d => d.stress && d.stress.hrv);
    if (hrvData.length > 0) {
      const avgHrv = hrvData.reduce((sum, d) => sum + d.stress.hrv.value, 0) / hrvData.length;
      if (avgHrv > 50) score += 5;
      else if (avgHrv > 35) score += 4;
      else if (avgHrv > 25) score += 3;
      else score += 2;
      factors++;
    }

    const finalScore = factors > 0 ? score / factors : 2.5;
    
    if (finalScore >= 4.5) return 'advanced';
    if (finalScore >= 3.5) return 'intermediate';
    if (finalScore >= 2.5) return 'beginner-plus';
    return 'beginner';
  }

  // Analyze health trends using simple ML
  async analyzeHealthTrends(userId, biometricData) {
    try {
      const trends = {};
      
      // Weight trend
      const weightData = biometricData
        .filter(d => d.bodyComposition && d.bodyComposition.weight)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      if (weightData.length >= 3) {
        trends.weight = this.calculateTrend(weightData.map(d => d.bodyComposition.weight.value));
      }

      // Activity trend
      const activityData = biometricData
        .filter(d => d.activity && d.activity.steps)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      if (activityData.length >= 3) {
        trends.activity = this.calculateTrend(activityData.map(d => d.activity.steps));
      }

      // Sleep trend
      const sleepData = biometricData
        .filter(d => d.sleep && d.sleep.duration)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      if (sleepData.length >= 3) {
        trends.sleep = this.calculateTrend(sleepData.map(d => d.sleep.duration));
      }

      return trends;

    } catch (error) {
      console.error('Health trends analysis error:', error);
      return {};
    }
  }

  // Simple trend calculation using linear regression
  calculateTrend(values) {
    if (values.length < 2) return { direction: 'stable', strength: 0 };

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const strength = Math.abs(slope);

    return {
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      strength: Math.min(strength * 10, 5), // Normalize to 0-5 scale
      slope
    };
  }

  // Extract user preferences for recommendations
  extractPreferences(user) {
    return {
      dietaryRestrictions: user.healthProfile.dietaryRestrictions || [],
      allergies: user.healthProfile.allergies || [],
      notifications: user.preferences.notifications,
      units: user.preferences.units,
      workoutTypes: this.inferWorkoutPreferences(user),
      timeAvailability: this.inferTimeAvailability(user)
    };
  }

  // Identify user constraints for recommendations
  identifyConstraints(user) {
    const constraints = [];

    if (user.healthProfile.healthConditions?.length > 0) {
      user.healthProfile.healthConditions.forEach(condition => {
        constraints.push({
          type: 'health',
          condition: condition.condition,
          severity: condition.severity,
          implications: this.getHealthConditionImplications(condition.condition)
        });
      });
    }

    if (user.healthProfile.allergies?.length > 0) {
      constraints.push({
        type: 'allergies',
        items: user.healthProfile.allergies
      });
    }

    if (user.healthProfile.dietaryRestrictions?.length > 0) {
      constraints.push({
        type: 'dietary',
        restrictions: user.healthProfile.dietaryRestrictions
      });
    }

    return constraints;
  }

  // Analyze recent activity patterns
  analyzeRecentActivity(biometricData) {
    const last7Days = biometricData.filter(d => {
      const daysDiff = (new Date() - new Date(d.timestamp)) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

    return {
      averageSteps: this.calculateAverage(last7Days, 'activity.steps'),
      averageSleep: this.calculateAverage(last7Days, 'sleep.duration'),
      averageHeartRate: this.calculateAverage(last7Days, 'vitals.heartRate.value'),
      workoutFrequency: this.calculateWorkoutFrequency(last7Days),
      consistency: this.calculateConsistency(last7Days)
    };
  }

  // Build nutrition prompt for AI
  buildNutritionPrompt(userProfile, options) {
    const goals = userProfile.goals.join(', ');
    const restrictions = userProfile.preferences.dietaryRestrictions.join(', ');
    const allergies = userProfile.preferences.allergies.join(', ');
    
    return `
      Create personalized nutrition recommendations for a user with the following profile:
      - Age: ${userProfile.age}
      - Gender: ${userProfile.gender}
      - Fitness Goals: ${goals}
      - Activity Level: ${userProfile.activityLevel}
      - BMI: ${userProfile.bmi}
      - Dietary Restrictions: ${restrictions || 'None'}
      - Allergies: ${allergies || 'None'}
      - Recent Activity: ${userProfile.recentActivity.averageSteps} steps/day
      
      Please provide a JSON response with:
      {
        "dailyCalories": number,
        "macros": {"protein": number, "carbs": number, "fat": number},
        "mealPlan": [
          {
            "meal": "breakfast/lunch/dinner/snack",
            "name": "meal name",
            "calories": number,
            "ingredients": ["ingredient1", "ingredient2"],
            "instructions": "cooking instructions",
            "nutritionFacts": {"protein": number, "carbs": number, "fat": number}
          }
        ],
        "hydrationGoal": number,
        "supplements": ["supplement1", "supplement2"],
        "tips": ["tip1", "tip2"],
        "reasoning": "explanation of recommendations"
      }
    `;
  }

  // Enhance AI nutrition recommendations with calculations
  async enhanceNutritionRecommendations(aiResponse, userProfile) {
    try {
      // Validate and adjust calorie recommendations based on user data
      const bmr = this.calculateBMR(userProfile);
      const tdee = this.calculateTDEE(bmr, userProfile.activityLevel);
      
      // Adjust for goals
      let targetCalories = tdee;
      if (userProfile.goals.includes('weight-loss')) {
        targetCalories = tdee - 500; // 1 lb/week loss
      } else if (userProfile.goals.includes('weight-gain')) {
        targetCalories = tdee + 500; // 1 lb/week gain
      }

      // Validate AI recommendations against calculated values
      if (Math.abs(aiResponse.dailyCalories - targetCalories) > 300) {
        aiResponse.dailyCalories = targetCalories;
      }

      // Add meal timing recommendations
      aiResponse.mealTiming = this.generateMealTiming(userProfile);
      
      // Add shopping list
      aiResponse.shoppingList = this.generateShoppingList(aiResponse.mealPlan);
      
      // Add nutritional analysis
      aiResponse.nutritionalAnalysis = this.analyzeNutritionalBalance(aiResponse);

      return aiResponse;

    } catch (error) {
      console.error('Error enhancing nutrition recommendations:', error);
      return aiResponse;
    }
  }

  // Calculate Basal Metabolic Rate
  calculateBMR(userProfile) {
    const { age, gender } = userProfile;
    const weight = userProfile.recentActivity.averageWeight || 70; // Default if not available
    const height = 170; // Default height in cm

    if (gender === 'male') {
      return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }
  }

  // Calculate Total Daily Energy Expenditure
  calculateTDEE(bmr, activityLevel) {
    const multipliers = {
      'sedentary': 1.2,
      'lightly-active': 1.375,
      'moderately-active': 1.55,
      'very-active': 1.725,
      'extremely-active': 1.9
    };
    
    return bmr * (multipliers[activityLevel] || 1.55);
  }

  // Fallback nutrition recommendations when AI is not available
  getFallbackNutritionRecommendations(userProfile) {
    const bmr = this.calculateBMR(userProfile);
    const tdee = this.calculateTDEE(bmr, userProfile.activityLevel);
    
    return {
      dailyCalories: Math.round(tdee),
      macros: {
        protein: Math.round(tdee * 0.25 / 4), // 25% of calories from protein
        carbs: Math.round(tdee * 0.45 / 4),   // 45% from carbs
        fat: Math.round(tdee * 0.30 / 9)      // 30% from fat
      },
      hydrationGoal: Math.round(userProfile.recentActivity.averageSteps * 0.0008 + 2000), // ml
      tips: [
        'Eat a balanced diet with variety',
        'Stay hydrated throughout the day',
        'Include lean proteins in every meal',
        'Choose whole grains over refined carbs'
      ],
      reasoning: 'Basic recommendations based on your activity level and goals.'
    };
  }

  // Helper method to calculate averages
  calculateAverage(data, path) {
    const values = data.map(item => {
      return path.split('.').reduce((obj, key) => obj?.[key], item);
    }).filter(val => val != null);
    
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  // Helper method to infer workout preferences
  inferWorkoutPreferences(user) {
    // Based on goals and activity level
    const preferences = [];
    
    if (user.healthProfile.fitnessGoals?.includes('weight-loss')) {
      preferences.push('cardio', 'hiit');
    }
    if (user.healthProfile.fitnessGoals?.includes('muscle-gain')) {
      preferences.push('strength', 'resistance');
    }
    if (user.healthProfile.fitnessGoals?.includes('flexibility')) {
      preferences.push('yoga', 'stretching');
    }
    
    return preferences.length > 0 ? preferences : ['mixed'];
  }

  // Additional helper methods would continue here...
  // [Continued with remaining helper methods for comprehensive functionality]

}

module.exports = new AIRecommendationEngine();