const nodemailer = require('nodemailer');
require('dotenv').config();

// Check if we're in test mode
const isTestMode = process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST;

// Configure the email transporter
let transporter;

// Create a test account for development
const createTestAccount = async () => {
  try {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('Created Ethereal test account:');
    console.log('- Email:', testAccount.user);
    console.log('- Password:', testAccount.pass);
    console.log('- Preview URL will be shown after sending emails');
    
    // Create a testing transporter
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (error) {
    console.error('Failed to create test account:', error);
    // Fallback to console logging
    return {
      sendMail: (mailOptions) => {
        console.log('Email would have been sent:');
        console.log('- From:', mailOptions.from);
        console.log('- To:', mailOptions.to);
        console.log('- Subject:', mailOptions.subject);
        console.log('- Content:', mailOptions.html ? '[HTML Content]' : mailOptions.text);
        return Promise.resolve({ messageId: 'test-message-id' });
      },
      verify: () => Promise.resolve(true)
    };
  }
};

// Initialize the transporter
const initTransporter = async () => {
  if (isTestMode) {
    transporter = await createTestAccount();
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
};

/**
 * Send an email notification to a customer when their appointment is approved
 * @param {Object} appointment - The appointment object with customer and craftsman details
 * @returns {Promise<boolean>} - True if email was sent successfully, false otherwise
 */
const sendAppointmentApprovalEmail = async (appointment) => {
  try {
    // Format the date and time for the email
    const appointmentDate = new Date(appointment.scheduled_at);
    const formattedDate = appointmentDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = appointmentDate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Send email to customer
    const info = await transporter.sendMail({
      from: `"Extern Service" <${process.env.EMAIL_FROM || 'test@example.com'}>`,
      to: appointment.customer_email,
      subject: 'Your Appointment Has Been Confirmed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0070f3;">Appointment Confirmed</h2>
          <p>Hello ${appointment.customer_name},</p>
          <p>Your appointment with ${appointment.craftsman_name} has been confirmed for:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${appointment.location || 'To be determined'}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${appointment.duration} minutes</p>
          </div>
          
          <p>If you need to make any changes, please contact us directly at ${appointment.craftsman_phone || process.env.CONTACT_PHONE || '+49123456789'}.</p>
          
          <p>Thank you for choosing our service!</p>
          <p>The Extern Team</p>
        </div>
      `
    });
    
    if (isTestMode && info.messageId) {
      console.log(`Approval email sent to customer: ${appointment.customer_email}`);
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`Approval email sent to customer: ${appointment.customer_email}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    return false;
  }
};

/**
 * Send an email notification to a craftsman when a new appointment is created
 * @param {Object} appointment - The appointment object with customer and craftsman details
 * @returns {Promise<boolean>} - True if email was sent successfully, false otherwise
 */
const sendNewAppointmentNotificationEmail = async (appointment) => {
  try {
    // Format the date and time for the email
    const appointmentDate = new Date(appointment.scheduled_at);
    const formattedDate = appointmentDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = appointmentDate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Send email to craftsman
    const info = await transporter.sendMail({
      from: `"Extern Service" <${process.env.EMAIL_FROM || 'test@example.com'}>`,
      to: appointment.craftsman_email,
      subject: 'New Appointment Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0070f3;">New Appointment Request</h2>
          <p>Hello ${appointment.craftsman_name},</p>
          <p>You have a new appointment request from ${appointment.customer_name}:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Customer:</strong> ${appointment.customer_name}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${appointment.customer_phone || 'Not provided'}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${appointment.duration} minutes</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${appointment.location || 'Not specified'}</p>
            <p style="margin: 5px 0;"><strong>Notes:</strong> ${appointment.notes || 'None'}</p>
          </div>
          
          <p>Please log in to your dashboard to approve or reject this appointment:</p>
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/appointments" 
               style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </p>
          
          <p>Thank you,</p>
          <p>The Extern Team</p>
        </div>
      `
    });
    
    if (isTestMode && info.messageId) {
      console.log(`Notification email sent to craftsman: ${appointment.craftsman_email}`);
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`Notification email sent to craftsman: ${appointment.craftsman_email}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending notification email:', error);
    return false;
  }
};

/**
 * Send an email notification to a customer when their appointment is rejected
 * @param {Object} appointment - The appointment object with customer and craftsman details
 * @param {string} reason - The reason for rejection
 * @returns {Promise<boolean>} - True if email was sent successfully, false otherwise
 */
const sendAppointmentRejectionEmail = async (appointment, reason) => {
  try {
    // Format the date and time for the email
    const appointmentDate = new Date(appointment.scheduled_at);
    const formattedDate = appointmentDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = appointmentDate.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Send email to customer
    const info = await transporter.sendMail({
      from: `"Extern Service" <${process.env.EMAIL_FROM || 'test@example.com'}>`,
      to: appointment.customer_email,
      subject: 'Appointment Request Cannot Be Accommodated',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e91e63;">Appointment Request Update</h2>
          <p>Hello ${appointment.customer_name},</p>
          <p>We regret to inform you that your appointment request with ${appointment.craftsman_name} for ${formattedDate} at ${formattedTime} cannot be accommodated at this time.</p>
          
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          
          <p>Please contact us to schedule an alternative time that works for you.</p>
          
          <p>We apologize for any inconvenience this may cause.</p>
          
          <p>The Extern Team</p>
        </div>
      `
    });
    
    if (isTestMode && info.messageId) {
      console.log(`Rejection email sent to customer: ${appointment.customer_email}`);
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`Rejection email sent to customer: ${appointment.customer_email}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending rejection email:', error);
    return false;
  }
};

/**
 * Test the email connection and send a test email
 * @param {string} testEmail - Email address to send test email to
 * @returns {Promise<object>} - Result of the test
 */
const sendTestEmail = async (testEmail) => {
  try {
    if (!testEmail) {
      return { success: false, message: 'Test email address is required' };
    }
    
    const info = await transporter.sendMail({
      from: `"Extern Service" <${process.env.EMAIL_FROM || 'test@example.com'}>`,
      to: testEmail,
      subject: 'Extern Email Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0070f3;">Email Service Test</h2>
          <p>This is a test email from the Extern appointment system.</p>
          <p>If you're receiving this, the email service is configured correctly!</p>
          <p>Time sent: ${new Date().toLocaleString()}</p>
        </div>
      `
    });
    
    const result = {
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId
    };
    
    if (isTestMode) {
      result.previewUrl = nodemailer.getTestMessageUrl(info);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending test email:', error);
    return { 
      success: false, 
      message: 'Failed to send test email', 
      error: error.message 
    };
  }
};

/**
 * Test the email connection
 * @returns {Promise<boolean>} - True if email service is ready, false otherwise
 */
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email service configuration error:', error);
    return false;
  }
};

// Initialize the email service when this module is loaded
(async () => {
  await initTransporter();
  await testEmailConnection();
})();

module.exports = {
  sendAppointmentApprovalEmail,
  sendNewAppointmentNotificationEmail,
  sendAppointmentRejectionEmail,
  testEmailConnection,
  sendTestEmail
};
