const express = require('express');
const { authenticateToken, requirePremium } = require('../middleware/auth');
const AIRecommendationEngine = require('../services/AIRecommendationEngine');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/recommendations
// @desc    Get comprehensive AI recommendations for user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type = 'all', refresh = false } = req.query;
    
    // Check if user has cached recommendations (unless refresh is requested)
    if (!refresh) {
      const user = await User.findById(req.user._id);
      const lastRecommendation = user.lastRecommendationUpdate;
      
      // If recommendations are less than 1 hour old, return cached version
      if (lastRecommendation && (Date.now() - lastRecommendation.getTime()) < 3600000) {
        return res.json({
          cached: true,
          lastUpdate: lastRecommendation,
          message: 'Using cached recommendations. Use ?refresh=true for new ones.',
          recommendations: user.cachedRecommendations || {}
        });
      }
    }

    // Generate new recommendations
    const recommendations = await AIRecommendationEngine.generateRecommendations(
      req.user._id, 
      type,
      req.query
    );

    // Cache recommendations in user document
    await User.findByIdAndUpdate(req.user._id, {
      cachedRecommendations: recommendations.recommendations,
      lastRecommendationUpdate: new Date()
    });

    res.json({
      cached: false,
      ...recommendations
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ 
      message: 'Error generating recommendations',
      error: error.message 
    });
  }
});

// @route   GET /api/recommendations/workouts
// @desc    Get workout recommendations
// @access  Private
router.get('/workouts', authenticateToken, async (req, res) => {
  try {
    const options = {
      count: parseInt(req.query.count) || 5,
      difficulty: req.query.difficulty,
      type: req.query.type,
      equipment: req.query.equipment ? req.query.equipment.split(',') : undefined,
      duration: req.query.duration ? parseInt(req.query.duration) : undefined
    };

    const recommendations = await AIRecommendationEngine.generateRecommendations(
      req.user._id,
      'workout',
      options
    );

    res.json(recommendations.recommendations.workouts);

  } catch (error) {
    console.error('Get workout recommendations error:', error);
    res.status(500).json({ 
      message: 'Error generating workout recommendations',
      error: error.message 
    });
  }
});

// @route   GET /api/recommendations/nutrition
// @desc    Get nutrition recommendations with meal planning
// @access  Private
router.get('/nutrition', authenticateToken, async (req, res) => {
  try {
    const options = {
      days: parseInt(req.query.days) || 7,
      mealsPerDay: parseInt(req.query.mealsPerDay) || 3,
      includeSnacks: req.query.includeSnacks === 'true',
      cuisinePreference: req.query.cuisine,
      budgetRange: req.query.budget
    };

    const recommendations = await AIRecommendationEngine.generateRecommendations(
      req.user._id,
      'nutrition',
      options
    );

    res.json(recommendations.recommendations.nutrition);

  } catch (error) {
    console.error('Get nutrition recommendations error:', error);
    res.status(500).json({ 
      message: 'Error generating nutrition recommendations',
      error: error.message 
    });
  }
});

// @route   GET /api/recommendations/mindfulness
// @desc    Get mindfulness and mental health recommendations
// @access  Private
router.get('/mindfulness', authenticateToken, async (req, res) => {
  try {
    const options = {
      focusArea: req.query.focus, // stress, sleep, mood, anxiety
      duration: parseInt(req.query.duration) || 10, // minutes
      experience: req.query.experience || 'beginner'
    };

    const recommendations = await AIRecommendationEngine.generateRecommendations(
      req.user._id,
      'mindfulness',
      options
    );

    res.json(recommendations.recommendations.mindfulness);

  } catch (error) {
    console.error('Get mindfulness recommendations error:', error);
    res.status(500).json({ 
      message: 'Error generating mindfulness recommendations',
      error: error.message 
    });
  }
});

// @route   GET /api/recommendations/goals
// @desc    Get goal recommendations and adjustments
// @access  Private
router.get('/goals', authenticateToken, async (req, res) => {
  try {
    const recommendations = await AIRecommendationEngine.generateRecommendations(
      req.user._id,
      'goals'
    );

    res.json(recommendations.recommendations.goals);

  } catch (error) {
    console.error('Get goal recommendations error:', error);
    res.status(500).json({ 
      message: 'Error generating goal recommendations',
      error: error.message 
    });
  }
});

// @route   POST /api/recommendations/feedback
// @desc    Provide feedback on recommendations
// @access  Private
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { recommendationId, type, rating, feedback, completed } = req.body;

    // Store feedback for improving future recommendations
    const feedbackEntry = {
      userId: req.user._id,
      recommendationId,
      type,
      rating,
      feedback,
      completed,
      timestamp: new Date()
    };

    // In a production app, you'd store this in a dedicated feedback collection
    // For now, we'll just log it and acknowledge receipt
    console.log('Recommendation feedback received:', feedbackEntry);

    // Update user's recommendation preferences based on feedback
    if (rating <= 2) {
      // Negative feedback - adjust preferences
      await AIRecommendationEngine.adjustUserPreferences(req.user._id, {
        type,
        adjustment: 'negative',
        reason: feedback
      });
    } else if (rating >= 4) {
      // Positive feedback - reinforce preferences
      await AIRecommendationEngine.adjustUserPreferences(req.user._id, {
        type,
        adjustment: 'positive',
        reason: feedback
      });
    }

    res.json({
      message: 'Feedback received successfully',
      acknowledgment: 'Your feedback helps us improve future recommendations'
    });

  } catch (error) {
    console.error('Recommendation feedback error:', error);
    res.status(500).json({ 
      message: 'Error processing feedback',
      error: error.message 
    });
  }
});

// @route   GET /api/recommendations/personalized-plan
// @desc    Get a comprehensive personalized health plan
// @access  Private (Premium feature)
router.get('/personalized-plan', authenticateToken, requirePremium, async (req, res) => {
  try {
    const { duration = 'monthly' } = req.query; // weekly, monthly, quarterly

    // Generate comprehensive plan including all recommendation types
    const [workouts, nutrition, mindfulness, goals] = await Promise.all([
      AIRecommendationEngine.generateRecommendations(req.user._id, 'workout', { count: 10 }),
      AIRecommendationEngine.generateRecommendations(req.user._id, 'nutrition', { days: 30 }),
      AIRecommendationEngine.generateRecommendations(req.user._id, 'mindfulness'),
      AIRecommendationEngine.generateRecommendations(req.user._id, 'goals')
    ]);

    const personalizedPlan = {
      planId: `plan_${req.user._id}_${Date.now()}`,
      duration,
      createdAt: new Date(),
      userId: req.user._id,
      
      overview: {
        planType: `${duration} Personalized Health Plan`,
        goals: goals.recommendations.goals.newGoals || [],
        estimatedTimeCommitment: this.calculateTimeCommitment(workouts, mindfulness),
        expectedOutcomes: this.generateExpectedOutcomes(req.user._id)
      },

      weeklySchedule: this.generateWeeklySchedule({
        workouts: workouts.recommendations.workouts,
        mindfulness: mindfulness.recommendations.mindfulness
      }),

      nutritionPlan: {
        dailyCalories: nutrition.recommendations.nutrition.dailyCalories,
        macros: nutrition.recommendations.nutrition.macros,
        mealPlans: nutrition.recommendations.nutrition.mealPlan,
        hydrationGoal: nutrition.recommendations.nutrition.hydrationGoal,
        supplements: nutrition.recommendations.nutrition.supplements
      },

      progressMilestones: goals.recommendations.goals.milestones || [],
      
      adaptationGuidelines: {
        workouts: workouts.recommendations.workouts.adaptations,
        nutrition: 'Adjust portion sizes based on hunger and energy levels',
        mindfulness: 'Increase session duration as you build consistency'
      },

      trackingMetrics: [
        'weight', 'body_fat_percentage', 'steps', 'sleep_duration', 
        'workout_frequency', 'stress_level', 'energy_level'
      ]
    };

    res.json(personalizedPlan);

  } catch (error) {
    console.error('Personalized plan generation error:', error);
    res.status(500).json({ 
      message: 'Error generating personalized plan',
      error: error.message 
    });
  }
});

// @route   GET /api/recommendations/smart-insights
// @desc    Get AI-powered insights based on user data patterns
// @access  Private
router.get('/smart-insights', authenticateToken, async (req, res) => {
  try {
    const insights = await AIRecommendationEngine.generateSmartInsights(req.user._id);
    
    res.json({
      insights,
      generatedAt: new Date(),
      nextUpdateIn: '24 hours'
    });

  } catch (error) {
    console.error('Smart insights error:', error);
    res.status(500).json({ 
      message: 'Error generating insights',
      error: error.message 
    });
  }
});

// @route   POST /api/recommendations/preferences
// @desc    Update user preferences for recommendations
// @access  Private
router.post('/preferences', authenticateToken, async (req, res) => {
  try {
    const {
      workoutPreferences,
      nutritionPreferences,
      mindfulnessPreferences,
      goalPreferences,
      generalPreferences
    } = req.body;

    const user = await User.findById(req.user._id);
    
    // Update recommendation preferences
    user.recommendationPreferences = {
      ...user.recommendationPreferences,
      workouts: workoutPreferences,
      nutrition: nutritionPreferences,
      mindfulness: mindfulnessPreferences,
      goals: goalPreferences,
      general: generalPreferences,
      lastUpdated: new Date()
    };

    await user.save();

    // Clear cached recommendations to force regeneration with new preferences
    user.cachedRecommendations = null;
    user.lastRecommendationUpdate = null;
    await user.save();

    res.json({
      message: 'Recommendation preferences updated successfully',
      preferences: user.recommendationPreferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ 
      message: 'Error updating preferences',
      error: error.message 
    });
  }
});

// Helper functions
function calculateTimeCommitment(workouts, mindfulness) {
  const workoutTime = workouts.recommendations.workouts
    .reduce((total, workout) => total + (workout.estimatedDuration || 30), 0);
  
  const mindfulnessTime = mindfulness.recommendations.mindfulness
    .reduce((total, session) => total + (session.duration || 10), 0);
  
  return {
    weeklyWorkoutMinutes: workoutTime,
    weeklyMindfulnessMinutes: mindfulnessTime,
    totalWeeklyMinutes: workoutTime + mindfulnessTime,
    dailyAverage: Math.round((workoutTime + mindfulnessTime) / 7)
  };
}

function generateWeeklySchedule({ workouts, mindfulness }) {
  const schedule = {};
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  days.forEach((day, index) => {
    schedule[day] = {
      workout: workouts.recommendations.workouts[index % workouts.recommendations.workouts.length],
      mindfulness: mindfulness.recommendations.mindfulness[index % mindfulness.recommendations.mindfulness.length],
      restDay: index === 6 // Sunday as rest day
    };
  });
  
  return schedule;
}

function generateExpectedOutcomes(userId) {
  return [
    'Improved cardiovascular health within 4 weeks',
    'Better sleep quality and duration',
    'Increased energy levels throughout the day',
    'Enhanced stress management capabilities',
    'Sustainable weight management',
    'Improved strength and flexibility',
    'Better nutritional habits and awareness'
  ];
}

module.exports = router;