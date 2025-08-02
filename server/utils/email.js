const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Email templates
const templates = {
  'email-verification': (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Health & Wellness Companion!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName}!</h2>
              <p>Thank you for joining our health and wellness community. To get started, please verify your email address by clicking the button below:</p>
              <a href="${data.verificationLink}" class="button">Verify Email Address</a>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${data.verificationLink}</p>
              <p>This link will expire in 24 hours for security purposes.</p>
              <p>Best regards,<br>The Health & Wellness Team</p>
            </div>
            <div class="footer">
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${data.firstName}! Welcome to Health & Wellness Companion. Please verify your email by visiting: ${data.verificationLink}`
  }),

  'password-reset': (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName}!</h2>
              <p>We received a request to reset your password for your Health & Wellness Companion account.</p>
              <div class="warning">
                <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account is still secure.
              </div>
              <p>To reset your password, click the button below:</p>
              <a href="${data.resetLink}" class="button">Reset Password</a>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${data.resetLink}</p>
              <p><strong>This link will expire in 1 hour</strong> for security purposes.</p>
              <p>Best regards,<br>The Health & Wellness Team</p>
            </div>
            <div class="footer">
              <p>For security questions, contact our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${data.firstName}! Reset your password by visiting: ${data.resetLink} (expires in 1 hour)`
  }),

  'workout-reminder': (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏋️‍♀️ Time for Your Workout!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName}!</h2>
              <p>It's time for your scheduled workout: <strong>${data.workoutName}</strong></p>
              <p>Duration: ${data.duration} minutes</p>
              <p>Don't let your streak break! You've got this! 💪</p>
              <a href="${data.workoutLink}" class="button">Start Workout</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${data.firstName}! Time for your workout: ${data.workoutName} (${data.duration} min). Start now: ${data.workoutLink}`
  }),

  'meal-reminder': (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ Meal Time Reminder</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName}!</h2>
              <p>It's time for your ${data.mealType}: <strong>${data.mealName}</strong></p>
              <p>Calories: ${data.calories} | Prep time: ${data.prepTime} minutes</p>
              <p>Fuel your body right! 🌟</p>
              <a href="${data.mealLink}" class="button">View Recipe</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${data.firstName}! Time for ${data.mealType}: ${data.mealName} (${data.calories} cal). Recipe: ${data.mealLink}`
  }),

  'progress-update': (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .stats { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
            .stat { text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
            .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Your Weekly Progress</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.firstName}!</h2>
              <p>Here's your amazing progress this week:</p>
              <div class="stats">
                <div class="stat">
                  <div class="stat-value">${data.workoutsCompleted}</div>
                  <div>Workouts</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${data.caloriesBurned}</div>
                  <div>Calories Burned</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${data.currentStreak}</div>
                  <div>Day Streak</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${data.newLevel}</div>
                  <div>Level</div>
                </div>
              </div>
              <p>Keep up the fantastic work! You're ${data.progressToGoal}% closer to your goal!</p>
              <a href="${data.dashboardLink}" class="button">View Full Dashboard</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Weekly Progress: ${data.workoutsCompleted} workouts, ${data.caloriesBurned} calories, ${data.currentStreak} day streak, Level ${data.newLevel}. View dashboard: ${data.dashboardLink}`
  })
};

// Main send email function
const sendEmail = async ({ to, subject, template, data, attachments = [] }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email configuration missing, skipping email send');
      return { success: false, message: 'Email configuration missing' };
    }

    const transporter = createTransporter();
    
    // Get template content
    const templateContent = templates[template] ? templates[template](data) : null;
    
    if (!templateContent) {
      throw new Error(`Template '${template}' not found`);
    }

    const mailOptions = {
      from: `"Health & Wellness Companion" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: templateContent.text,
      html: templateContent.html,
      attachments
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Send bulk emails (for notifications)
const sendBulkEmails = async (emails) => {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.push({ ...email, success: true, result });
    } catch (error) {
      results.push({ ...email, success: false, error: error.message });
    }
  }
  
  return results;
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration test failed:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  testEmailConfig
};