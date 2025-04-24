import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate a PDF for an invoice using jsPDF and html2canvas
 * This function renders the invoice to a hidden div, captures it as an image,
 * and then creates a downloadable PDF
 * 
 * @param {Object} invoice - The invoice data
 * @param {Object} craftsmanData - Optional craftsman data
 * @returns {Promise<void>}
 */
export const generateInvoicePdf = async (invoice, craftsmanData = {}) => {
  try {
    // Create a temporary container for rendering the invoice
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '794px'; // A4 width in pixels at 96 DPI
    container.style.backgroundColor = 'white';
    container.style.color = 'black';
    container.style.padding = '40px';
    container.style.fontFamily = 'Arial, sans-serif';
    
    // Populate the container with invoice content
    container.innerHTML = `
      <div style="margin-bottom: 30px; text-align: center;">
        <h1 style="color: #132f4c; font-size: 24px; margin-bottom: 5px;">INVOICE</h1>
        <p style="color: #666; font-size: 14px; margin: 0;">Invoice #${invoice.invoice_number || invoice.id}</p>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <h3 style="color: #132f4c; font-size: 16px; margin-bottom: 10px;">From:</h3>
          <p style="margin: 0; font-size: 14px;">${craftsmanData.name || 'ZIMMR Craftsman'}</p>
          <p style="margin: 0; font-size: 14px;">${craftsmanData.address || ''}</p>
          <p style="margin: 0; font-size: 14px;">${craftsmanData.email || ''}</p>
          <p style="margin: 0; font-size: 14px;">${craftsmanData.phone || ''}</p>
          ${craftsmanData.tax_id ? `<p style="margin: 0; font-size: 14px;">Tax ID: ${craftsmanData.tax_id}</p>` : ''}
        </div>
        
        <div>
          <h3 style="color: #132f4c; font-size: 16px; margin-bottom: 10px;">To:</h3>
          <p style="margin: 0; font-size: 14px;">${invoice.customer_name || 'Customer'}</p>
          <p style="margin: 0; font-size: 14px;">${invoice.customer_address || ''}</p>
          <p style="margin: 0; font-size: 14px;">${invoice.customer_email || ''}</p>
          <p style="margin: 0; font-size: 14px;">${invoice.customer_phone || ''}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #132f4c; font-size: 16px; margin-bottom: 10px;">Invoice Details:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f2f2f2;">
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Date</th>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Due Date</th>
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Status</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${new Date(invoice.created_at).toLocaleDateString()}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${invoice.status || 'Pending'}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3 style="color: #132f4c; font-size: 16px; margin-bottom: 10px;">Summary:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f2f2f2;">
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Description</th>
            <th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Amount</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${invoice.notes || 'Services rendered'}</td>
            <td style="text-align: right; padding: 10px; border: 1px solid #ddd;">€${parseFloat(invoice.amount || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 10px; border: 1px solid #ddd; font-weight: bold;">Tax (19%):</td>
            <td style="text-align: right; padding: 10px; border: 1px solid #ddd;">€${parseFloat(invoice.tax_amount || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 10px; border: 1px solid #ddd; font-weight: bold;">Total:</td>
            <td style="text-align: right; padding: 10px; border: 1px solid #ddd; font-weight: bold;">€${parseFloat(invoice.total_amount || 0).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 50px; font-size: 14px; color: #666;">
        <p style="margin-bottom: 5px;"><strong>Payment Terms:</strong> Due within 16 days of receipt</p>
        <p style="margin-bottom: 5px;"><strong>Payment Method:</strong> Bank Transfer</p>
        <p style="margin-bottom: 5px;">Thank you for your business!</p>
      </div>
      
      <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
        <p>This invoice was generated by ZIMMR - Platform for Craftsmen in Germany</p>
      </div>
    `;
    
    // Add the container to the document body
    document.body.appendChild(container);
    
    // Use html2canvas to capture the invoice as an image
    const canvas = await html2canvas(container, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    // Create a new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add the canvas image to the PDF
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Generate a filename
    const filename = `invoice_${invoice.invoice_number || invoice.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Download the PDF
    pdf.save(filename);
    
    // Clean up - remove the temporary container
    document.body.removeChild(container);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generate a simple invoice PDF with minimal styling
 * This is a lighter alternative that doesn't require rendering to HTML first
 * 
 * @param {Object} invoice - The invoice data
 * @param {Object} craftsmanData - Optional craftsman data
 * @returns {Promise<void>}
 */
export const generateSimpleInvoicePdf = (invoice, craftsmanData = {}) => {
  try {
    // Create a new PDF document
    const pdf = new jsPDF();
    
    // Set font size and add title
    pdf.setFontSize(20);
    pdf.text('INVOICE', 105, 20, { align: 'center' });
    
    // Add invoice number
    pdf.setFontSize(12);
    pdf.text(`Invoice #${invoice.invoice_number || invoice.id}`, 105, 30, { align: 'center' });
    
    // Add craftsman details
    pdf.setFontSize(10);
    pdf.text('From:', 20, 50);
    pdf.text(`${craftsmanData.name || 'ZIMMR Craftsman'}`, 20, 55);
    if (craftsmanData.address) pdf.text(craftsmanData.address, 20, 60);
    if (craftsmanData.email) pdf.text(craftsmanData.email, 20, 65);
    if (craftsmanData.phone) pdf.text(craftsmanData.phone, 20, 70);
    
    // Add customer details
    pdf.text('To:', 120, 50);
    pdf.text(`${invoice.customer_name || 'Customer'}`, 120, 55);
    if (invoice.customer_address) pdf.text(invoice.customer_address, 120, 60);
    if (invoice.customer_email) pdf.text(invoice.customer_email, 120, 65);
    if (invoice.customer_phone) pdf.text(invoice.customer_phone, 120, 70);
    
    // Add invoice details
    pdf.text('Invoice Details:', 20, 90);
    pdf.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 95);
    pdf.text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`, 20, 100);
    pdf.text(`Status: ${invoice.status || 'Pending'}`, 20, 105);
    
    // Add summary
    pdf.text('Summary:', 20, 120);
    pdf.text(`Description: ${invoice.notes || 'Services rendered'}`, 20, 125);
    pdf.text(`Amount: €${parseFloat(invoice.amount || 0).toFixed(2)}`, 20, 130);
    pdf.text(`Tax (19%): €${parseFloat(invoice.tax_amount || 0).toFixed(2)}`, 20, 135);
    pdf.text(`Total: €${parseFloat(invoice.total_amount || 0).toFixed(2)}`, 20, 140);
    
    // Add payment terms
    pdf.text('Payment Terms: Due within 16 days of receipt', 20, 160);
    pdf.text('Payment Method: Bank Transfer', 20, 165);
    pdf.text('Thank you for your business!', 20, 170);
    
    // Add footer
    pdf.setFontSize(8);
    pdf.text('This invoice was generated by ZIMMR - Platform for Craftsmen in Germany', 105, 280, { align: 'center' });
    
    // Generate a filename
    const filename = `invoice_${invoice.invoice_number || invoice.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Download the PDF
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error generating simple PDF:', error);
    throw error;
  }
};

export default {
  generateInvoicePdf,
  generateSimpleInvoicePdf
};
