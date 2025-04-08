const nodemailer = require('nodemailer');
require('dotenv').config();

// Configure the email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

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
    await transporter.sendMail({
      from: `"Extern Service" <${process.env.EMAIL_FROM}>`,
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
          
          <p>If you need to make any changes, please contact us directly at ${appointment.craftsman_phone || process.env.CONTACT_PHONE}.</p>
          
          <p>Thank you for choosing our service!</p>
          <p>The Extern Team</p>
        </div>
      `
    });
    
    console.log(`Approval email sent to customer: ${appointment.customer_email}`);
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
    await transporter.sendMail({
      from: `"Extern Service" <${process.env.EMAIL_FROM}>`,
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
            <a href="${process.env.FRONTEND_URL}/appointments" 
               style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </p>
          
          <p>Thank you,</p>
          <p>The Extern Team</p>
        </div>
      `
    });
    
    console.log(`Notification email sent to craftsman: ${appointment.craftsman_email}`);
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
    await transporter.sendMail({
      from: `"Extern Service" <${process.env.EMAIL_FROM}>`,
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
    
    console.log(`Rejection email sent to customer: ${appointment.customer_email}`);
    return true;
  } catch (error) {
    console.error('Error sending rejection email:', error);
    return false;
  }
};

// Test the email connection on service initialization
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
testEmailConnection();

module.exports = {
  sendAppointmentApprovalEmail,
  sendNewAppointmentNotificationEmail,
  sendAppointmentRejectionEmail
};
