/**
 * Script to link existing craftsmen to user accounts
 * 
 * This script finds craftsmen without user_id and attempts to link them
 * to matching user accounts or creates new user accounts if needed.
 */

const pool = require('../db');
const bcrypt = require('bcrypt');

const linkCraftsmenToUsers = async () => {
  try {
    // Begin transaction
    await pool.query('BEGIN');
    
    // Get all craftsmen without user_id
    const craftsmenResult = await pool.query(`
      SELECT * FROM craftsmen WHERE user_id IS NULL
    `);
    
    console.log(`Found ${craftsmenResult.rows.length} craftsmen without user_id`);
    
    // Process each craftsman
    for (const craftsman of craftsmenResult.rows) {
      console.log(`Processing craftsman: ${craftsman.name}`);
      
      // Try to find a matching user by name
      const userResult = await pool.query(`
        SELECT * FROM users WHERE username = $1 OR email = $2
      `, [craftsman.name, `${craftsman.name.replace(/\s+/g, '.')}@extern.de`]);
      
      let userId;
      
      if (userResult.rows.length > 0) {
        // User exists, update their role if needed
        userId = userResult.rows[0].id;
        console.log(`Found matching user with ID: ${userId}`);
        
        // Update user role if not already craftsman
        if (userResult.rows[0].role !== 'craftsman') {
          await pool.query(`
            UPDATE users SET role = 'craftsman' WHERE id = $1
          `, [userId]);
          console.log(`Updated user role to craftsman`);
        }
      } else {
        // Create a new user account for this craftsman
        console.log(`No matching user found, creating new user`);
        
        // Generate a secure password
        const password = Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create username from name (lowercase, no spaces)
        const username = craftsman.name.toLowerCase().replace(/\s+/g, '');
        const email = `${username}@extern.de`;
        
        // Insert new user
        const newUserResult = await pool.query(`
          INSERT INTO users (username, email, password, role)
          VALUES ($1, $2, $3, 'craftsman')
          RETURNING id
        `, [username, email, hashedPassword]);
        
        userId = newUserResult.rows[0].id;
        console.log(`Created new user with ID: ${userId}, username: ${username}, password: ${password}`);
        console.log(`IMPORTANT: Note down the password for user ${username}: ${password}`);
      }
      
      // Update craftsman with user_id
      await pool.query(`
        UPDATE craftsmen SET user_id = $1 WHERE id = $2
      `, [userId, craftsman.id]);
      
      console.log(`Updated craftsman ${craftsman.name} with user_id: ${userId}`);
      console.log('-----------------------------------');
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    console.log('All craftsmen have been linked to user accounts successfully!');
    
  } catch (error) {
    // Rollback in case of error
    await pool.query('ROLLBACK');
    console.error('Error linking craftsmen to users:', error);
  } finally {
    // Close the pool
    pool.end();
  }
};

// Run the script
linkCraftsmenToUsers();
