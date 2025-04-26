const fetch = require('node-fetch');
require('dotenv').config();

// Single n8n webhook URL - this should be set in environment variables in production
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/zimmr-notifications';

// Notification types for routing in n8n
const NOTIFICATION_TYPES = {
  APPOINTMENT_APPROVED: 'appointment_approved',
  APPOINTMENT_REJECTED: 'appointment_rejected',
  APPOINTMENT_COMPLETED: 'appointment_completed',
  NEW_APPOINTMENT: 'new_appointment',
  INVOICE_GENERATED: 'invoice_generated',
  INVOICE_OVERDUE: 'invoice_overdue'
};

/**
 * Send data to n8n webhook
 * @param {string} notificationType - The type of notification for routing
 * @param {Object} data - The data to send
 * @returns {Promise<boolean>} - True if webhook call was successful, false otherwise
 */
const callWebhook = async (notificationType, data) => {
  try {
    console.log(`Calling webhook for notification type: ${notificationType}`);
    
    // Add notification type to the data
    const webhookData = {
      notification_type: notificationType,
      ...data,
      timestamp: new Date().toISOString()
    };
    
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook call failed: ${response.status} ${response.statusText}`);
      console.error('Error details:', errorText);
      return false;
    }
    
    console.log(`Webhook call successful: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error calling webhook:', error);
    return false;
  }
};

/**
 * Send appointment approval notification via n8n webhook
 * @param {Object} appointment - The appointment object with customer and craftsman details
 * @returns {Promise<boolean>} - True if webhook call was successful, false otherwise
 */
const sendAppointmentApprovalEmail = async (appointment) => {
  try {
    // Format the date and time for the webhook data
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
    
    // Prepare data for the webhook
    const webhookData = {
      customer_name: appointment.customer_name,
      customer_email: appointment.customer_email,
      craftsman_name: appointment.craftsman_name,
      craftsman_phone: appointment.craftsman_phone,
      appointment_id: appointment.id,
      scheduled_at: appointment.scheduled_at,
      formatted_date: formattedDate,
      formatted_time: formattedTime,
      duration: appointment.duration,
      location: appointment.location || 'To be determined',
      notes: appointment.notes || ''
    };
    
    // Call the webhook
    return await callWebhook(NOTIFICATION_TYPES.APPOINTMENT_APPROVED, webhookData);
  } catch (error) {
    console.error('Error sending appointment approval webhook:', error);
    return false;
  }
};

/**
 * Send new appointment notification to craftsman via n8n webhook
 * @param {Object} appointment - The appointment object with customer and craftsman details
 * @returns {Promise<boolean>} - True if webhook call was successful, false otherwise
 */
const sendNewAppointmentNotificationEmail = async (appointment) => {
  try {
    // Format the date and time for the webhook data
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
    
    // Prepare data for the webhook
    const webhookData = {
      customer_name: appointment.customer_name,
      customer_email: appointment.customer_email,
      customer_phone: appointment.customer_phone,
      craftsman_name: appointment.craftsman_name,
      craftsman_email: appointment.craftsman_email,
      appointment_id: appointment.id,
      scheduled_at: appointment.scheduled_at,
      formatted_date: formattedDate,
      formatted_time: formattedTime,
      duration: appointment.duration,
      location: appointment.location || 'Not specified',
      notes: appointment.notes || 'None'
    };
    
    // Call the webhook with the new appointment notification type
    return await callWebhook(NOTIFICATION_TYPES.NEW_APPOINTMENT, webhookData);
  } catch (error) {
    console.error('Error sending new appointment notification webhook:', error);
    return false;
  }
};

/**
 * Send appointment rejection notification via n8n webhook
 * @param {Object} appointment - The appointment object with customer and craftsman details
 * @param {string} reason - The reason for rejection
 * @returns {Promise<boolean>} - True if webhook call was successful, false otherwise
 */
const sendAppointmentRejectionEmail = async (appointment, reason) => {
  try {
    // Format the date and time for the webhook data
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
    
    // Prepare data for the webhook
    const webhookData = {
      customer_name: appointment.customer_name,
      customer_email: appointment.customer_email,
      craftsman_name: appointment.craftsman_name,
      appointment_id: appointment.id,
      scheduled_at: appointment.scheduled_at,
      formatted_date: formattedDate,
      formatted_time: formattedTime,
      reason: reason || 'No reason provided'
    };
    
    // Call the webhook with the rejection notification type
    return await callWebhook(NOTIFICATION_TYPES.APPOINTMENT_REJECTED, webhookData);
  } catch (error) {
    console.error('Error sending appointment rejection webhook:', error);
    return false;
  }
};

/**
 * Send appointment completion notification via n8n webhook
 * @param {Object} appointment - The appointment object with customer and craftsman details
 * @returns {Promise<boolean>} - True if webhook call was successful, false otherwise
 */
const sendAppointmentCompletionEmail = async (appointment) => {
  try {
    // Format the date and time for the webhook data
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
    
    // Prepare data for the webhook
    const webhookData = {
      customer_name: appointment.customer_name,
      customer_email: appointment.customer_email,
      craftsman_name: appointment.craftsman_name,
      craftsman_phone: appointment.craftsman_phone,
      appointment_id: appointment.id,
      scheduled_at: appointment.scheduled_at,
      formatted_date: formattedDate,
      formatted_time: formattedTime,
      completed_at: new Date().toISOString(),
      notes: appointment.notes || ''
    };
    
    // Call the webhook
    return await callWebhook(NOTIFICATION_TYPES.APPOINTMENT_COMPLETED, webhookData);
  } catch (error) {
    console.error('Error sending appointment completion webhook:', error);
    return false;
  }
};

/**
 * Send invoice PDF to customer via n8n webhook
 * @param {Object} invoice - The invoice object with customer and craftsman details
 * @param {Object} pdfData - The PDF data object containing path and filename
 * @returns {Promise<boolean>} - True if webhook call was successful, false otherwise
 */
const sendInvoicePdfEmail = async (invoice, pdfData) => {
  try {
    if (!invoice) {
      console.error('Missing invoice data');
      return false;
    }

    // Format dates for the webhook data
    const invoiceDate = new Date(invoice.created_at);
    const formattedDate = invoiceDate.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Not specified';

    // Prepare data for the webhook
    const webhookData = {
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
      craftsman_name: invoice.craftsman_name,
      craftsman_phone: invoice.craftsman_phone,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      created_at: invoice.created_at,
      due_date: invoice.due_date,
      formatted_date: formattedDate,
      formatted_due_date: dueDate,
      amount: invoice.amount,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      pdf_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/pdfs/${pdfData.filename}`,
      notes: invoice.notes || ''
    };
    
    // Call the webhook
    return await callWebhook(NOTIFICATION_TYPES.INVOICE_GENERATED, webhookData);
  } catch (error) {
    console.error('Error sending invoice PDF webhook:', error);
    return false;
  }
};

/**
 * Send overdue invoice notification via n8n webhook
 * @param {Object} invoice - The invoice object with customer and craftsman details
 * @returns {Promise<boolean>} - True if webhook call was successful, false otherwise
 */
const sendInvoiceOverdueEmail = async (invoice) => {
  try {
    if (!invoice) {
      console.error('Missing invoice data');
      return false;
    }

    // Format dates for the webhook data
    const invoiceDate = new Date(invoice.created_at);
    const formattedDate = invoiceDate.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    const formattedDueDate = dueDate ? dueDate.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Not specified';
    
    // Calculate days overdue
    const daysOverdue = dueDate ? Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24)) : 0;

    // Prepare data for the webhook
    const webhookData = {
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
      craftsman_name: invoice.craftsman_name,
      craftsman_phone: invoice.craftsman_phone,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      created_at: invoice.created_at,
      due_date: invoice.due_date,
      formatted_date: formattedDate,
      formatted_due_date: formattedDueDate,
      amount: invoice.amount,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      days_overdue: daysOverdue,
      pdf_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/pdfs/invoice-${invoice.invoice_number}.pdf`,
      notes: invoice.notes || ''
    };
    
    // Call the webhook
    return await callWebhook(NOTIFICATION_TYPES.INVOICE_OVERDUE, webhookData);
  } catch (error) {
    console.error('Error sending overdue invoice webhook:', error);
    return false;
  }
};

/**
 * Test the webhook connection
 * @param {string} testEmail - Email address for test data
 * @returns {Promise<object>} - Result of the test
 */
const testWebhookConnection = async (testEmail) => {
  try {
    if (!testEmail) {
      return { success: false, message: 'Test email address is required' };
    }
    
    // Test data
    const testData = {
      customer_name: 'Test Customer',
      customer_email: testEmail,
      message: 'This is a test webhook call',
      timestamp: new Date().toISOString()
    };
    
    // Try to call webhook with each notification type
    const results = {};
    for (const [name, type] of Object.entries(NOTIFICATION_TYPES)) {
      try {
        const success = await callWebhook(type, testData);
        results[name] = { success, type };
      } catch (err) {
        results[name] = { success: false, error: err.message, type };
      }
    }
    
    return {
      success: Object.values(results).some(r => r.success),
      message: 'Webhook test completed',
      results
    };
  } catch (error) {
    console.error('Error testing webhooks:', error);
    return { 
      success: false, 
      message: 'Failed to test webhooks', 
      error: error.message 
    };
  }
};

module.exports = {
  sendAppointmentApprovalEmail,
  sendNewAppointmentNotificationEmail,
  sendAppointmentRejectionEmail,
  sendAppointmentCompletionEmail,
  sendInvoicePdfEmail,
  sendInvoiceOverdueEmail,
  testWebhookConnection,
  NOTIFICATION_TYPES
};
