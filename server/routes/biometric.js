const express = require('express');
const { body, validationResult } = require('express-validator');
const BiometricData = require('../models/BiometricData');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// @route   POST /api/biometric/manual
// @desc    Add manual biometric data
// @access  Private
router.post('/manual', authenticateToken, [
  body('timestamp').optional().isISO8601().withMessage('Valid timestamp required'),
  body('vitals.heartRate.value').optional().isFloat({ min: 30, max: 250 }).withMessage('Heart rate must be between 30-250 bpm'),
  body('bodyComposition.weight.value').optional().isFloat({ min: 20, max: 1000 }).withMessage('Weight must be between 20-1000'),
  body('activity.steps').optional().isInt({ min: 0 }).withMessage('Steps must be a non-negative integer'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const biometricData = new BiometricData({
      userId: req.user._id,
      source: 'manual',
      timestamp: req.body.timestamp || new Date(),
      ...req.body
    });

    await biometricData.save();

    res.status(201).json({
      message: 'Biometric data saved successfully',
      data: biometricData
    });

  } catch (error) {
    console.error('Manual biometric data error:', error);
    res.status(500).json({ message: 'Error saving biometric data' });
  }
});

// @route   GET /api/biometric/latest
// @desc    Get latest biometric data for user
// @access  Private
router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const { type, limit = 1 } = req.query;
    
    const data = await BiometricData.getLatestForUser(req.user._id, type, parseInt(limit));
    
    res.json({
      data,
      count: data.length
    });

  } catch (error) {
    console.error('Get latest biometric data error:', error);
    res.status(500).json({ message: 'Error retrieving biometric data' });
  }
});

// @route   GET /api/biometric/range
// @desc    Get biometric data for date range
// @access  Private
router.get('/range', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, types } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const dataTypes = types ? types.split(',') : [];
    const data = await BiometricData.getDataRange(req.user._id, startDate, endDate, dataTypes);
    
    res.json({
      data,
      count: data.length,
      dateRange: { startDate, endDate },
      types: dataTypes
    });

  } catch (error) {
    console.error('Get biometric data range error:', error);
    res.status(500).json({ message: 'Error retrieving biometric data' });
  }
});

// @route   GET /api/biometric/trends/:metric
// @desc    Get trend analysis for a specific metric
// @access  Private
router.get('/trends/:metric', authenticateToken, async (req, res) => {
  try {
    const { metric } = req.params;
    const { days = 30 } = req.query;
    
    const trends = await BiometricData.calculateTrends(req.user._id, metric, parseInt(days));
    
    // Calculate additional statistics
    const values = trends.map(t => t.avgValue).filter(v => v != null);
    const stats = {
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      trend: calculateTrend(trends),
      dataPoints: values.length
    };
    
    res.json({
      metric,
      period: `${days} days`,
      trends,
      statistics: stats
    });

  } catch (error) {
    console.error('Get biometric trends error:', error);
    res.status(500).json({ message: 'Error calculating trends' });
  }
});

// @route   POST /api/biometric/connect-device
// @desc    Connect a biometric device
// @access  Private
router.post('/connect-device', authenticateToken, [
  body('provider').isIn(['fitbit', 'garmin', 'apple-health', 'google-fit']).withMessage('Invalid provider'),
  body('accessToken').notEmpty().withMessage('Access token is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { provider, accessToken, refreshToken, deviceId } = req.body;

    // Verify the token with the provider
    const isValid = await verifyProviderToken(provider, accessToken);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid access token' });
    }

    // Update user's connected devices
    const user = await User.findById(req.user._id);
    
    // Remove existing connection for this provider
    user.connectedDevices = user.connectedDevices.filter(device => device.provider !== provider);
    
    // Add new connection
    user.connectedDevices.push({
      provider,
      deviceId,
      accessToken,
      refreshToken,
      isActive: true,
      lastSync: new Date()
    });

    await user.save();

    // Perform initial sync
    try {
      await syncDeviceData(user._id, provider, accessToken);
    } catch (syncError) {
      console.error('Initial sync failed:', syncError);
      // Continue even if sync fails
    }

    res.json({
      message: 'Device connected successfully',
      provider,
      lastSync: new Date()
    });

  } catch (error) {
    console.error('Connect device error:', error);
    res.status(500).json({ message: 'Error connecting device' });
  }
});

// @route   POST /api/biometric/sync/:provider
// @desc    Manually sync data from connected device
// @access  Private
router.post('/sync/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const user = await User.findById(req.user._id);
    
    const connectedDevice = user.connectedDevices.find(device => 
      device.provider === provider && device.isActive
    );

    if (!connectedDevice) {
      return res.status(404).json({ message: 'Device not connected or inactive' });
    }

    const syncResult = await syncDeviceData(user._id, provider, connectedDevice.accessToken);

    // Update last sync time
    connectedDevice.lastSync = new Date();
    await user.save();

    res.json({
      message: 'Data synced successfully',
      provider,
      recordsImported: syncResult.recordsImported,
      lastSync: connectedDevice.lastSync
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ message: 'Error syncing device data' });
  }
});

// @route   DELETE /api/biometric/disconnect/:provider
// @desc    Disconnect a biometric device
// @access  Private
router.delete('/disconnect/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const user = await User.findById(req.user._id);
    
    user.connectedDevices = user.connectedDevices.filter(device => device.provider !== provider);
    await user.save();

    res.json({
      message: 'Device disconnected successfully',
      provider
    });

  } catch (error) {
    console.error('Disconnect device error:', error);
    res.status(500).json({ message: 'Error disconnecting device' });
  }
});

// @route   GET /api/biometric/connected-devices
// @desc    Get user's connected devices
// @access  Private
router.get('/connected-devices', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('connectedDevices');
    
    const devices = user.connectedDevices.map(device => ({
      provider: device.provider,
      deviceId: device.deviceId,
      isActive: device.isActive,
      lastSync: device.lastSync
    }));

    res.json({ devices });

  } catch (error) {
    console.error('Get connected devices error:', error);
    res.status(500).json({ message: 'Error retrieving connected devices' });
  }
});

// @route   GET /api/biometric/analytics/summary
// @desc    Get comprehensive health analytics summary
// @access  Private
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get data for the period
    const data = await BiometricData.getDataRange(req.user._id, startDate, new Date());

    // Calculate comprehensive analytics
    const analytics = {
      overview: {
        totalDataPoints: data.length,
        period: `${days} days`,
        lastUpdate: data.length > 0 ? data[0].timestamp : null
      },
      vitals: calculateVitalsAnalytics(data),
      activity: calculateActivityAnalytics(data),
      sleep: calculateSleepAnalytics(data),
      nutrition: calculateNutritionAnalytics(data),
      trends: {
        weight: await calculateMetricTrend(req.user._id, 'bodyComposition.weight.value', days),
        heartRate: await calculateMetricTrend(req.user._id, 'vitals.heartRate.value', days),
        steps: await calculateMetricTrend(req.user._id, 'activity.steps', days)
      }
    };

    res.json(analytics);

  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({ message: 'Error generating analytics' });
  }
});

// Helper function to verify provider token
async function verifyProviderToken(provider, accessToken) {
  try {
    switch (provider) {
      case 'fitbit':
        const fitbitResponse = await axios.get('https://api.fitbit.com/1/user/-/profile.json', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return fitbitResponse.status === 200;
      
      case 'garmin':
        // Garmin Connect IQ verification would go here
        return true; // Placeholder
      
      case 'apple-health':
        // Apple HealthKit verification would go here
        return true; // Placeholder
      
      case 'google-fit':
        const googleResponse = await axios.get('https://www.googleapis.com/fitness/v1/users/me/dataSources', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return googleResponse.status === 200;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}

// Helper function to sync device data
async function syncDeviceData(userId, provider, accessToken) {
  try {
    let recordsImported = 0;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Sync last 7 days

    switch (provider) {
      case 'fitbit':
        recordsImported = await syncFitbitData(userId, accessToken, startDate, endDate);
        break;
      case 'garmin':
        recordsImported = await syncGarminData(userId, accessToken, startDate, endDate);
        break;
      case 'google-fit':
        recordsImported = await syncGoogleFitData(userId, accessToken, startDate, endDate);
        break;
      default:
        throw new Error('Unsupported provider');
    }

    return { recordsImported };
  } catch (error) {
    console.error('Data sync failed:', error);
    throw error;
  }
}

// Fitbit data sync implementation
async function syncFitbitData(userId, accessToken, startDate, endDate) {
  let recordsImported = 0;
  
  try {
    // Sync activity data
    const activityData = await axios.get(`https://api.fitbit.com/1/user/-/activities/date/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}.json`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Sync heart rate data
    const heartRateData = await axios.get(`https://api.fitbit.com/1/user/-/activities/heart/date/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}.json`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Process and save data
    for (const activity of activityData.data.activities || []) {
      const biometricEntry = new BiometricData({
        userId,
        source: 'fitbit',
        timestamp: new Date(activity.startTime),
        activity: {
          steps: activity.steps,
          distance: { value: activity.distance, unit: 'km' },
          caloriesBurned: activity.calories,
          activeMinutes: {
            light: activity.minutesLightlyActive,
            moderate: activity.minutesFairlyActive,
            vigorous: activity.minutesVeryActive
          }
        }
      });
      
      await biometricEntry.save();
      recordsImported++;
    }

    return recordsImported;
  } catch (error) {
    console.error('Fitbit sync error:', error);
    return recordsImported;
  }
}

// Placeholder for other provider sync functions
async function syncGarminData(userId, accessToken, startDate, endDate) {
  // Garmin Connect IQ API implementation would go here
  return 0;
}

async function syncGoogleFitData(userId, accessToken, startDate, endDate) {
  // Google Fit API implementation would go here
  return 0;
}

// Analytics calculation helpers
function calculateVitalsAnalytics(data) {
  const vitalsData = data.filter(d => d.vitals && Object.keys(d.vitals).length > 0);
  
  if (vitalsData.length === 0) return null;

  const heartRates = vitalsData.map(d => d.vitals.heartRate?.value).filter(v => v);
  
  return {
    heartRate: {
      average: heartRates.length > 0 ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null,
      min: heartRates.length > 0 ? Math.min(...heartRates) : null,
      max: heartRates.length > 0 ? Math.max(...heartRates) : null,
      dataPoints: heartRates.length
    }
  };
}

function calculateActivityAnalytics(data) {
  const activityData = data.filter(d => d.activity && Object.keys(d.activity).length > 0);
  
  if (activityData.length === 0) return null;

  const steps = activityData.map(d => d.activity.steps).filter(v => v);
  const calories = activityData.map(d => d.activity.caloriesBurned).filter(v => v);
  
  return {
    steps: {
      average: steps.length > 0 ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null,
      total: steps.length > 0 ? steps.reduce((a, b) => a + b, 0) : null,
      max: steps.length > 0 ? Math.max(...steps) : null
    },
    calories: {
      average: calories.length > 0 ? Math.round(calories.reduce((a, b) => a + b, 0) / calories.length) : null,
      total: calories.length > 0 ? calories.reduce((a, b) => a + b, 0) : null
    }
  };
}

function calculateSleepAnalytics(data) {
  const sleepData = data.filter(d => d.sleep && d.sleep.duration);
  
  if (sleepData.length === 0) return null;

  const durations = sleepData.map(d => d.sleep.duration);
  const efficiencies = sleepData.map(d => d.sleep.efficiency).filter(v => v);
  
  return {
    duration: {
      average: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: Math.min(...durations),
      max: Math.max(...durations)
    },
    efficiency: efficiencies.length > 0 ? {
      average: Math.round(efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length)
    } : null,
    dataPoints: sleepData.length
  };
}

function calculateNutritionAnalytics(data) {
  const nutritionData = data.filter(d => d.nutrition && d.nutrition.calories);
  
  if (nutritionData.length === 0) return null;

  const calories = nutritionData.map(d => d.nutrition.calories);
  
  return {
    calories: {
      average: Math.round(calories.reduce((a, b) => a + b, 0) / calories.length),
      min: Math.min(...calories),
      max: Math.max(...calories)
    },
    dataPoints: nutritionData.length
  };
}

async function calculateMetricTrend(userId, metric, days) {
  try {
    const trends = await BiometricData.calculateTrends(userId, metric, days);
    if (trends.length < 2) return { direction: 'stable', change: 0 };

    const firstValue = trends[0].avgValue;
    const lastValue = trends[trends.length - 1].avgValue;
    const change = ((lastValue - firstValue) / firstValue) * 100;

    return {
      direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      change: Math.round(change * 100) / 100
    };
  } catch (error) {
    return { direction: 'unknown', change: 0 };
  }
}

function calculateTrend(trends) {
  if (trends.length < 2) return 'stable';
  
  const firstValue = trends[0].avgValue;
  const lastValue = trends[trends.length - 1].avgValue;
  const change = ((lastValue - firstValue) / firstValue) * 100;
  
  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

module.exports = router;