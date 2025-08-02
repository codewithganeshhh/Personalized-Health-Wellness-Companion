# Personalized Health & Wellness Companion

A comprehensive AI-driven health and wellness platform that integrates biometric data to provide personalized recommendations for fitness, nutrition, and mental well-being.

## 🌟 Features

### Core Functionality
- **User Registration & Health Profile Management**
- **Biometric Data Integration** (Manual/API-based with Fitbit, Garmin, Apple Health, Google Fit)
- **AI-Powered Recommendation Engine** for workouts, meal plans, and mindfulness
- **Interactive Health Dashboards** with progress tracking
- **Community & Expert Network** with booking/video conferencing
- **Gamification & Streak Tracking System**
- **Smart Notifications & Reminders**

### Advanced Features
- **Real-time Health Analytics** with trend analysis
- **Machine Learning-based Recommendations**
- **Personalized Meal Planning** with dietary restrictions support
- **Workout Library** with custom routine creation
- **Mindfulness & Mental Health Support**
- **Expert Consultations** with certified professionals
- **Social Features** for community support
- **Progressive Web App** capabilities

## 🏗️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communications
- **OpenAI API** for AI-powered recommendations
- **TensorFlow.js** for machine learning
- **JWT** for authentication
- **Nodemailer** for email services

### Frontend
- **React 18** with modern hooks
- **Material-UI (MUI)** for component library
- **React Router** for navigation
- **Recharts** for data visualization
- **Framer Motion** for animations
- **React Query** for state management
- **Socket.IO Client** for real-time updates

### External Integrations
- **Fitbit API** for fitness data
- **Garmin Connect IQ** for sports data
- **Apple HealthKit** for iOS health data
- **Google Fit API** for Android health data
- **OpenAI GPT** for personalized recommendations
- **Email Services** for notifications

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd personalized-health-wellness-companion
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd client && npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Required Environment Variables**
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000

   # Database
   MONGODB_URI=mongodb://localhost:27017/health_wellness

   # JWT Secret
   JWT_SECRET=your_super_secret_jwt_key

   # OpenAI API (for AI recommendations)
   OPENAI_API_KEY=your_openai_api_key

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password

   # Biometric Integration APIs
   FITBIT_CLIENT_ID=your_fitbit_client_id
   FITBIT_CLIENT_SECRET=your_fitbit_client_secret
   GARMIN_API_KEY=your_garmin_api_key
   APPLE_HEALTH_API_KEY=your_apple_health_api_key
   ```

5. **Start the application**
   ```bash
   # Development mode (runs both frontend and backend)
   npm run dev

   # Or run separately:
   # Backend only
   npm run server

   # Frontend only (in another terminal)
   npm run client
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health Check: http://localhost:5000/health

## 📱 Application Structure

```
personalized-health-wellness-companion/
├── server/                      # Backend Node.js application
│   ├── index.js                # Main server file
│   ├── models/                 # MongoDB schemas
│   │   ├── User.js            # User model with health profile
│   │   ├── BiometricData.js   # Biometric data model
│   │   └── Workout.js         # Workout model
│   ├── routes/                # API route handlers
│   │   ├── auth.js           # Authentication routes
│   │   ├── biometric.js      # Biometric data routes
│   │   ├── recommendations.js # AI recommendation routes
│   │   └── ...               # Other route files
│   ├── middleware/           # Custom middleware
│   │   └── auth.js          # Authentication middleware
│   ├── services/            # Business logic services
│   │   └── AIRecommendationEngine.js # AI recommendation service
│   └── utils/               # Utility functions
│       └── email.js         # Email service utilities
├── client/                   # Frontend React application
│   ├── public/              # Static assets
│   ├── src/                # React source code
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Frontend utilities
│   └── package.json       # Frontend dependencies
├── package.json            # Backend dependencies and scripts
├── .env.example           # Environment variables template
└── README.md             # This file
```

## 🔌 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "healthProfile": {
    "height": {"value": 180, "unit": "cm"},
    "weight": {"value": 75, "unit": "kg"},
    "activityLevel": "moderately-active",
    "fitnessGoals": ["weight-loss", "muscle-gain"]
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Biometric Data Endpoints

#### Add Manual Data
```http
POST /api/biometric/manual
Authorization: Bearer <token>
Content-Type: application/json

{
  "vitals": {
    "heartRate": {"value": 72, "context": "resting"}
  },
  "bodyComposition": {
    "weight": {"value": 75, "unit": "kg"}
  },
  "activity": {
    "steps": 8500,
    "caloriesBurned": 350
  }
}
```

#### Get Analytics Summary
```http
GET /api/biometric/analytics/summary?period=30
Authorization: Bearer <token>
```

### Recommendation Endpoints

#### Get AI Recommendations
```http
GET /api/recommendations?type=all&refresh=false
Authorization: Bearer <token>
```

#### Get Workout Recommendations
```http
GET /api/recommendations/workouts?count=5&difficulty=intermediate&type=strength
Authorization: Bearer <token>
```

#### Get Nutrition Plan
```http
GET /api/recommendations/nutrition?days=7&mealsPerDay=3
Authorization: Bearer <token>
```

## 🎯 Key Features Breakdown

### 1. User Registration & Health Profile
- Comprehensive user onboarding
- Detailed health questionnaire
- Profile customization with goals and preferences
- BMI calculation and health assessments

### 2. Biometric Data Integration
- **Manual Entry**: Direct input of health metrics
- **Device Integration**: 
  - Fitbit (steps, heart rate, sleep)
  - Garmin (activity, GPS data)
  - Apple Health (comprehensive health data)
  - Google Fit (activity tracking)
- **Real-time Sync**: Automatic data synchronization
- **Data Validation**: Quality checks and anomaly detection

### 3. AI Recommendation Engine
- **Machine Learning**: User behavior analysis
- **Collaborative Filtering**: Similar user recommendations
- **Content-based Filtering**: Preference-based suggestions
- **OpenAI Integration**: Natural language recommendations
- **Adaptive Learning**: Improves with user feedback

### 4. Health Dashboard
- **Real-time Analytics**: Live health metrics
- **Trend Analysis**: Progress tracking over time
- **Goal Monitoring**: Visual progress indicators
- **Comparative Analysis**: Period-over-period comparisons

### 5. Workout System
- **Exercise Library**: Comprehensive workout database
- **Custom Routines**: Personalized workout creation
- **Progress Tracking**: Performance monitoring
- **Video Guidance**: Exercise demonstrations

### 6. Nutrition Planning
- **Meal Recommendations**: AI-powered meal suggestions
- **Dietary Restrictions**: Allergies and preferences support
- **Calorie Tracking**: Nutritional monitoring
- **Shopping Lists**: Automated grocery planning

### 7. Mindfulness & Mental Health
- **Stress Management**: Relaxation techniques
- **Sleep Optimization**: Sleep quality improvement
- **Meditation Library**: Guided meditation sessions
- **Mood Tracking**: Emotional well-being monitoring

### 8. Community Features
- **Expert Consultations**: Professional health advice
- **Peer Support**: Community interaction
- **Challenge Participation**: Group fitness challenges
- **Progress Sharing**: Social accountability

### 9. Gamification
- **Achievement System**: Badges and rewards
- **Streak Tracking**: Consistency motivation
- **Leaderboards**: Friendly competition
- **Level Progression**: Experience-based advancement

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt encryption
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Data sanitization
- **HTTPS Enforcement**: Secure data transmission
- **Privacy Controls**: User data protection

## 📊 Health Metrics Supported

### Vital Signs
- Heart Rate (resting, active, peak)
- Blood Pressure
- Body Temperature
- Respiratory Rate
- Oxygen Saturation

### Body Composition
- Weight tracking
- Body Fat Percentage
- Muscle Mass
- Bone Density
- Metabolic Age

### Activity Metrics
- Daily Steps
- Distance Traveled
- Calories Burned
- Active Minutes
- Exercise Sessions

### Sleep Analysis
- Sleep Duration
- Sleep Efficiency
- Sleep Stages (Deep, Light, REM)
- Sleep Quality Score

### Mental Health
- Stress Levels
- Mood Tracking
- Energy Levels
- Meditation Minutes

## 🌐 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   # Set production database URL
   # Configure production email settings
   # Set secure JWT secret
   ```

2. **Build Frontend**
   ```bash
   cd client && npm run build
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Deployment
```dockerfile
# Dockerfile example included in repository
docker build -t health-wellness-app .
docker run -p 5000:5000 health-wellness-app
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@healthwellness.com or create an issue in the repository.

## 🚀 Roadmap

- [ ] Mobile app development (React Native)
- [ ] Advanced AI recommendations (GPT-4 integration)
- [ ] Wearable device integration (Oura Ring, WHOOP)
- [ ] Telemedicine features
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Offline mode capabilities

## 👥 Team

- **Backend Development**: Node.js, MongoDB, AI Integration
- **Frontend Development**: React, UI/UX Design
- **Health & Wellness**: Medical advisors and fitness experts
- **Data Science**: ML algorithms and analytics

---

**Built with ❤️ for better health and wellness**