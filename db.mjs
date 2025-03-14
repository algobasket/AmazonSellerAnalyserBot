// db.mjs
import mysql from 'mysql2';

// Create a MySQL single connection
export const connection = mysql.createConnection({
  host: 'localhost',  // Replace with your MySQL host
  user: 'root',       // Replace with your MySQL username
  password: '',       // Replace with your MySQL password
  database: 'amazon-seller-analyser-bot'  // Replace with your database name  
});  

// Connect to the database 
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database');
});

// Create a MySQL connection pool for better scalability
export const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'amazon-seller-analyser-bot',  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export the connection for use in other files
export default connection;  