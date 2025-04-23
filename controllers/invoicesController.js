const pool = require('../db');
const { generateInvoicePdf } = require('../services/invoiceGenerator');
const fs = require('fs');
const path = require('path');

// Get all invoices with filtering options
const getAllInvoices = async (req, res) => {
  try {
    const { 
      craftsman_id, 
      customer_id, 
      status, 
      type, 
      search,
      from_date,
      to_date
    } = req.query;
    
    console.log('GET /invoices - Request query:', req.query);
    console.log('Craftsman ID from request:', craftsman_id);
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      console.log('Missing craftsman_id in request');
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    let queryText = `
      SELECT i.*, 
             a.scheduled_at, a.notes as appointment_notes,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cr.name as craftsman_name
      FROM invoices i
      LEFT JOIN appointments a ON i.appointment_id = a.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      WHERE i.craftsman_id = $1
    `;
    
    const queryParams = [craftsman_id];
    let paramIndex = 2;
    
    if (customer_id) {
      queryParams.push(customer_id);
      queryText += ` AND i.customer_id = $${paramIndex++}`;
    }
    
    if (status) {
      queryParams.push(status);
      queryText += ` AND i.status = $${paramIndex++}`;
    }
    
    // Add filter for invoice type (invoice/quote)
    if (type) {
      queryParams.push(type);
      queryText += ` AND i.type = $${paramIndex++}`;
    }
    
    // Add search functionality for customer name or invoice number
    if (search) {
      queryParams.push(`%${search}%`);
      queryParams.push(`%${search}%`);
      queryText += ` AND (c.name ILIKE $${paramIndex++} OR i.invoice_number ILIKE $${paramIndex++})`;
    }
    
    // Add date range filtering
    if (from_date) {
      queryParams.push(from_date);
      queryText += ` AND i.created_at >= $${paramIndex++}`;
    }
    
    if (to_date) {
      queryParams.push(to_date);
      queryText += ` AND i.created_at <= $${paramIndex++}`;
    }
    
    queryText += ` ORDER BY i.created_at DESC`;
    
    console.log('Executing SQL query:', queryText);
    console.log('Query parameters:', queryParams);
    
    const result = await pool.query(queryText, queryParams);
    console.log(`Found ${result.rows.length} invoices for craftsman_id ${craftsman_id}`);
    
    // For debugging, log the first few invoices if any
    if (result.rows.length > 0) {
      console.log('First invoice:', JSON.stringify(result.rows[0], null, 2));
    } else {
      // If no invoices found, let's check if the craftsman exists
      const craftsmanCheck = await pool.query('SELECT * FROM craftsmen WHERE id = $1', [craftsman_id]);
      if (craftsmanCheck.rows.length === 0) {
        console.log(`Craftsman with ID ${craftsman_id} does not exist in the database`);
      } else {
        console.log(`Craftsman with ID ${craftsman_id} exists, but has no invoices`);
      }
      
      // Let's also check if there are any invoices in the system at all
      const allInvoices = await pool.query('SELECT COUNT(*) as count FROM invoices');
      console.log(`Total invoices in the system: ${allInvoices.rows[0].count}`);
      
      // If there are invoices, let's check the distinct craftsman_ids
      if (parseInt(allInvoices.rows[0].count) > 0) {
        const distinctCraftsmen = await pool.query('SELECT DISTINCT craftsman_id FROM invoices');
        console.log('Distinct craftsman_ids with invoices:', distinctCraftsmen.rows.map(row => row.craftsman_id));
      }
    }
    
    // Get invoice items for each invoice
    const invoicesWithItems = await Promise.all(
      result.rows.map(async (invoice) => {
        const itemsResult = await pool.query(
          `SELECT * FROM invoice_items WHERE invoice_id = $1`,
          [invoice.id]
        );
        return {
          ...invoice,
          items: itemsResult.rows
        };
      })
    );
    
    res.json(invoicesWithItems);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Get invoice details
    const invoiceResult = await pool.query(`
      SELECT i.*, 
             a.scheduled_at, a.notes as appointment_notes,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cr.name as craftsman_name, cr.tax_id, cr.vat_id, cr.address as craftsman_address, cr.contact_info
      FROM invoices i
      LEFT JOIN appointments a ON i.appointment_id = a.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      WHERE i.id = $1 AND i.craftsman_id = $2
    `, [id, craftsman_id]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Get invoice items
    const itemsResult = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [id]
    );
    
    // Combine invoice with its items
    const invoice = {
      ...invoiceResult.rows[0],
      items: itemsResult.rows
    };
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new invoice
const createInvoice = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      appointment_id, 
      craftsman_id, 
      customer_id, 
      amount,
      tax_amount, 
      status,
      type = 'invoice', // Default to invoice if not specified
      payment_link, 
      due_date, 
      notes,
      service_date,
      location,
      vat_exempt = false,
      payment_deadline = '16 days',
      items = [] // Line items
    } = req.body;
    
    console.log('Creating invoice with data:', JSON.stringify(req.body, null, 2));
    console.log('Craftsman ID from request body:', craftsman_id);
    
    // Validate required fields
    if (!craftsman_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    if (!customer_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'customer_id is required' });
    }
    
    // Ensure craftsman_id and customer_id are integers
    const craftsmanIdInt = parseInt(craftsman_id, 10);
    const customerIdInt = parseInt(customer_id, 10);
    
    if (isNaN(craftsmanIdInt)) {
      console.error(`Invalid craftsman_id: ${craftsman_id} (not a number)`);
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'craftsman_id must be a valid number' });
    }
    
    if (isNaN(customerIdInt)) {
      console.error(`Invalid customer_id: ${customer_id} (not a number)`);
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'customer_id must be a valid number' });
    }
    
    // Calculate amounts based on line items if provided
    let calculatedAmount = 0;
    let calculatedTaxAmount = 0;
    
    if (items && items.length > 0) {
      // Calculate totals from line items
      for (const item of items) {
        const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
        calculatedAmount += itemSubtotal;
        
        if (!vat_exempt) {
          const itemTaxRate = parseFloat(item.tax_rate || 19.00);
          calculatedTaxAmount += (itemSubtotal * itemTaxRate) / 100;
        }
      }
    } else {
      // Use provided amounts if no line items
      calculatedAmount = parseFloat(amount || 0);
      calculatedTaxAmount = vat_exempt ? 0 : parseFloat(tax_amount || 0);
    }
    
    // Calculate total amount
    const totalAmount = calculatedAmount + calculatedTaxAmount;
    
    // Insert the invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        appointment_id, 
        craftsman_id, 
        customer_id, 
        invoice_number, 
        amount, 
        tax_amount,
        total_amount,
        status, 
        payment_link, 
        due_date, 
        notes,
        type,
        service_date,
        location,
        vat_exempt,
        payment_deadline
      )
      VALUES ($1, $2::integer, $3::integer, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      appointment_id || null, 
      craftsmanIdInt, 
      customerIdInt, 
      null, // Invoice number will be generated by database trigger
      calculatedAmount, 
      calculatedTaxAmount,
      totalAmount,
      status || 'pending', // Default to pending status
      payment_link || null, 
      due_date || null, 
      notes || null,
      type,
      service_date || null,
      location || null,
      vat_exempt,
      payment_deadline
    ]);
    
    const invoice = invoiceResult.rows[0];
    
    // Insert line items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id,
            description,
            quantity,
            unit_price,
            tax_rate,
            material_id,
            service_type,
            amount
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          invoice.id,
          item.description,
          item.quantity,
          item.unit_price,
          vat_exempt ? 0 : (item.tax_rate || 19.00),
          item.material_id || null,
          item.service_type || null,
          parseFloat(item.quantity) * parseFloat(item.unit_price)
        ]);
      }
    }
    
    // Get the complete invoice with items
    const completeInvoiceResult = await client.query(`
      SELECT i.*, 
             a.scheduled_at, a.notes as appointment_notes,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cr.name as craftsman_name
      FROM invoices i
      LEFT JOIN appointments a ON i.appointment_id = a.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      WHERE i.id = $1
    `, [invoice.id]);
    
    const itemsResult = await client.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [invoice.id]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      ...completeInvoiceResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Update invoice
const updateInvoice = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      craftsman_id,
      appointment_id,
      customer_id,
      amount,
      tax_amount,
      status,
      type,
      payment_link,
      due_date,
      notes,
      service_date,
      location,
      vat_exempt,
      payment_deadline,
      items
    } = req.body;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to the craftsman
    const checkResult = await client.query('SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2', [id, craftsman_id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to update it' });
    }
    
    const currentInvoice = checkResult.rows[0];
    
    // Calculate amounts based on line items if provided
    let calculatedAmount = undefined;
    let calculatedTaxAmount = undefined;
    
    if (items && items.length > 0) {
      calculatedAmount = 0;
      calculatedTaxAmount = 0;
      
      // Calculate totals from line items
      for (const item of items) {
        const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
        calculatedAmount += itemSubtotal;
        
        const isVatExempt = vat_exempt !== undefined ? vat_exempt : currentInvoice.vat_exempt;
        
        if (!isVatExempt) {
          const itemTaxRate = parseFloat(item.tax_rate || 19.00);
          calculatedTaxAmount += (itemSubtotal * itemTaxRate) / 100;
        }
      }
    } else if (amount !== undefined) {
      calculatedAmount = parseFloat(amount);
      
      const isVatExempt = vat_exempt !== undefined ? vat_exempt : currentInvoice.vat_exempt;
      
      if (tax_amount !== undefined) {
        calculatedTaxAmount = isVatExempt ? 0 : parseFloat(tax_amount);
      }
    }
    
    // Build dynamic update query
    let updateFields = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (appointment_id !== undefined) {
      updateFields.push(`appointment_id = $${paramIndex++}`);
      queryParams.push(appointment_id);
    }
    
    if (customer_id !== undefined) {
      updateFields.push(`customer_id = $${paramIndex++}`);
      queryParams.push(customer_id);
    }
    
    if (calculatedAmount !== undefined) {
      updateFields.push(`amount = $${paramIndex++}`);
      queryParams.push(calculatedAmount);
    }
    
    if (calculatedTaxAmount !== undefined) {
      updateFields.push(`tax_amount = $${paramIndex++}`);
      queryParams.push(calculatedTaxAmount);
    }
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }
    
    if (type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      queryParams.push(type);
    }
    
    if (payment_link !== undefined) {
      updateFields.push(`payment_link = $${paramIndex++}`);
      queryParams.push(payment_link);
    }
    
    if (due_date !== undefined) {
      updateFields.push(`due_date = $${paramIndex++}`);
      queryParams.push(due_date);
    }
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      queryParams.push(notes);
    }
    
    if (service_date !== undefined) {
      updateFields.push(`service_date = $${paramIndex++}`);
      queryParams.push(service_date);
    }
    
    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      queryParams.push(location);
    }
    
    if (vat_exempt !== undefined) {
      updateFields.push(`vat_exempt = $${paramIndex++}`);
      queryParams.push(vat_exempt);
    }
    
    if (payment_deadline !== undefined) {
      updateFields.push(`payment_deadline = $${paramIndex++}`);
      queryParams.push(payment_deadline);
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // If no fields to update, check if we need to update items
    if (updateFields.length === 1 && !items) {
      await client.query('ROLLBACK');
      return res.json(currentInvoice);
    }
    
    // Update the invoice if there are fields to update
    let updatedInvoice = currentInvoice;
    if (updateFields.length > 1) {
      // Add the id and craftsman_id parameters
      queryParams.push(id);
      queryParams.push(craftsman_id);
      
      // Execute the update query
      const result = await client.query(`
        UPDATE invoices
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND craftsman_id = $${paramIndex}
        RETURNING *
      `, queryParams);
      
      updatedInvoice = result.rows[0];
    }
    
    // Update invoice items if provided
    if (items && items.length > 0) {
      // Delete existing items
      await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
      
      // Insert new items
      for (const item of items) {
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id,
            description,
            quantity,
            unit_price,
            tax_rate,
            material_id,
            service_type,
            amount
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          id,
          item.description,
          item.quantity,
          item.unit_price,
          updatedInvoice.vat_exempt ? 0 : (item.tax_rate || 19.00),
          item.material_id || null,
          item.service_type || null,
          parseFloat(item.quantity) * parseFloat(item.unit_price)
        ]);
      }
    }
    
    // Get the complete updated invoice with items
    const completeInvoiceResult = await client.query(`
      SELECT i.*, 
             a.scheduled_at, a.notes as appointment_notes,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cr.name as craftsman_name
      FROM invoices i
      LEFT JOIN appointments a ON i.appointment_id = a.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      WHERE i.id = $1
    `, [id]);
    
    const itemsResult = await client.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      ...completeInvoiceResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Delete invoice
const deleteInvoice = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to the craftsman
    const checkResult = await client.query('SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2', [id, craftsman_id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to delete it' });
    }
    
    // Delete invoice items first (due to foreign key constraint)
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
    
    // Delete the invoice
    await client.query('DELETE FROM invoices WHERE id = $1 AND craftsman_id = $2', [id, craftsman_id]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Get invoice items
const getInvoiceItems = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const { craftsman_id } = req.query;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to the craftsman
    const checkResult = await pool.query('SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2', [invoice_id, craftsman_id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to view it' });
    }
    
    // Get invoice items
    const itemsResult = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [invoice_id]
    );
    
    res.json(itemsResult.rows);
  } catch (error) {
    console.error('Error fetching invoice items:', error);
    res.status(500).json({ error: error.message });
  }
};

// Convert quote to invoice
const convertQuoteToInvoice = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { craftsman_id } = req.body;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if quote exists and belongs to the craftsman
    const checkResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2 AND type = $3', 
      [id, craftsman_id, 'quote']
    );
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quote not found or you do not have permission to convert it' });
    }
    
    // Update the quote to be an invoice
    const result = await client.query(`
      UPDATE invoices
      SET type = 'invoice', 
          status = 'pending',
          updated_at = NOW()
      WHERE id = $1 AND craftsman_id = $2
      RETURNING *
    `, [id, craftsman_id]);
    
    // Get the complete invoice with items
    const completeInvoiceResult = await client.query(`
      SELECT i.*, 
             a.scheduled_at, a.notes as appointment_notes,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cr.name as craftsman_name
      FROM invoices i
      LEFT JOIN appointments a ON i.appointment_id = a.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN craftsmen cr ON i.craftsman_id = cr.id
      WHERE i.id = $1
    `, [id]);
    
    const itemsResult = await client.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      ...completeInvoiceResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error converting quote to invoice:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Generate PDF for invoice
const generatePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to the craftsman
    const checkResult = await pool.query('SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2', [id, craftsman_id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to access it' });
    }
    
    const invoice = checkResult.rows[0];
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate PDF with explicit output path
    const filename = `${invoice.type === 'invoice' ? 'Invoice' : 'Quote'}_${invoice.invoice_number.replace(/\//g, '-')}_${Date.now()}.pdf`;
    const pdfPath = path.join(tempDir, filename);
    
    console.log(`Generating PDF for invoice ${id} to path: ${pdfPath}`);
    
    try {
      // Generate the PDF and wait for it to complete
      await generateInvoicePdf({
        invoiceId: id,
        outputPath: pdfPath,
        stream: false
      });
      
      // Verify the file exists before sending
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file was not created at path: ${pdfPath}`);
      }
      
      const stats = fs.statSync(pdfPath);
      console.log(`PDF file size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error('PDF file was created but is empty');
      }
      
      // Set headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(pdfPath);
      
      // Handle file stream errors
      fileStream.on('error', (err) => {
        console.error('Error streaming PDF file:', err);
        // Only send error if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming PDF file' });
        }
      });
      
      // Pipe the file to the response
      fileStream.pipe(res);
      
      // Clean up the file after sending
      fileStream.on('end', () => {
        fs.unlink(pdfPath, (err) => {
          if (err) console.error('Error deleting temporary PDF file:', err);
        });
      });
    } catch (pdfError) {
      console.error('Error in PDF generation or streaming:', pdfError);
      return res.status(500).json({ error: pdfError.message });
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: error.message });
  }
};

// Preview PDF for invoice (returns URL to view PDF)
const previewPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { craftsman_id } = req.query;
    
    // Ensure craftsman_id is required for security
    if (!craftsman_id) {
      return res.status(400).json({ error: 'craftsman_id is required' });
    }
    
    // Check if invoice exists and belongs to the craftsman
    const checkResult = await pool.query('SELECT * FROM invoices WHERE id = $1 AND craftsman_id = $2', [id, craftsman_id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or you do not have permission to access it' });
    }
    
    const invoice = checkResult.rows[0];
    
    // Create public/temp directory if it doesn't exist
    const tempDir = 'public/temp';
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate PDF in public directory
    const filename = `${invoice.type === 'invoice' ? 'Invoice' : 'Quote'}_${invoice.invoice_number.replace(/\//g, '-')}_${Date.now()}.pdf`;
    const outputPath = path.join(tempDir, filename);
    
    console.log(`Generating PDF preview for invoice ${id} to path: ${outputPath}`);
    
    try {
      // Generate the PDF and wait for it to complete
      await generateInvoicePdf({
        invoiceId: id,
        outputPath,
        stream: false
      });
      
      // Verify the file exists before sending the URL
      if (!fs.existsSync(outputPath)) {
        throw new Error(`PDF file was not created at path: ${outputPath}`);
      }
      
      const stats = fs.statSync(outputPath);
      console.log(`PDF preview file size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error('PDF preview file was created but is empty');
      }
      
      // Return URL to view the PDF
      const pdfUrl = `/temp/${filename}`;
      res.json({ 
        url: pdfUrl,
        filename
      });
      
      // Set up cleanup after 5 minutes
      setTimeout(() => {
        fs.unlink(outputPath, (err) => {
          if (err) console.error('Error deleting temporary preview PDF file:', err);
        });
      }, 5 * 60 * 1000); // 5 minutes
    } catch (pdfError) {
      console.error('Error in PDF preview generation:', pdfError);
      return res.status(500).json({ error: pdfError.message });
    }
  } catch (error) {
    console.error('Error generating PDF preview:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceItems,
  convertQuoteToInvoice,
  generatePdf,
  previewPdf
};