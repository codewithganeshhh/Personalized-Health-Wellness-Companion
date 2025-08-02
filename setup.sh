#!/bin/bash

# Personalized Health & Wellness Companion Setup Script
# This script helps you set up the application quickly

echo "🏥 Personalized Health & Wellness Companion Setup"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found. You can either:"
    echo "   1. Install MongoDB locally"
    echo "   2. Use MongoDB Atlas (cloud)"
    echo "   3. Use Docker Compose (recommended)"
    echo ""
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
    echo ""
fi

# Install dependencies
echo "📦 Installing backend dependencies..."
npm install

echo "📦 Installing frontend dependencies..."
cd client && npm install && cd ..

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p logs

# Set up Git hooks (optional)
if [ -d .git ]; then
    echo "🔧 Setting up Git hooks..."
    echo "#!/bin/sh" > .git/hooks/pre-commit
    echo "npm run lint" >> .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env file with your configuration:"
echo "   - Set JWT_SECRET to a secure random string"
echo "   - Configure MongoDB connection (MONGODB_URI)"
echo "   - Add OpenAI API key for AI recommendations (optional)"
echo "   - Configure email settings for notifications"
echo ""
echo "2. Start the application:"
echo "   npm run dev    # Development mode (recommended)"
echo "   npm start      # Production mode"
echo ""
echo "3. Or use Docker Compose:"
echo "   docker-compose up -d"
echo ""
echo "🌐 The application will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo ""
echo "📚 For more information, see the README.md file"
echo ""
echo "💡 Key features included:"
echo "   ✅ User registration & authentication"
echo "   ✅ Health profile management"
echo "   ✅ Biometric data integration (Fitbit, Garmin, etc.)"
echo "   ✅ AI-powered recommendations"
echo "   ✅ Interactive health dashboards"
echo "   ✅ Workout library & tracking"
echo "   ✅ Nutrition planning"
echo "   ✅ Mindfulness & mental health support"
echo "   ✅ Community features"
echo "   ✅ Gamification system"
echo "   ✅ Smart notifications"
echo ""
echo "🚀 Happy coding!"