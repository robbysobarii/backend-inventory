const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 8000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MySQL Connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'inventorydb', // Replace with your database name
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to the MySQL database');
});

// Fetch products from the database
app.get('/products', (req, res) => {
  const query = 'SELECT * FROM products';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching products:', err);
      res.status(500).json({ error: 'Error fetching products' });
    } else {
      res.json({ data: results });
    }
  });
});

// Fetch skus for a specific product
app.get('/products/:idBarang/skus', (req, res) => {
  const idBarang = req.params.idBarang;
  const query = 'SELECT * FROM skus WHERE idBarang = ?';
  connection.query(query, [idBarang], (err, results) => {
    if (err) {
      console.error('Error fetching skus:', err);
      res.status(500).json({ error: 'Error fetching skus' });
    } else {
      if (results.length === 0) {
        // If no skus found for the given product ID, return an empty array
        res.json({ data: [] });
      } else {
        res.json({ data: results });
      }
    }
  });
});

// Route to fetch return items with product and SKU details
app.get('/return-items', (req, res) => {
  const query = `
    SELECT r.id, r.jumlah, r.alasan, p.nama AS nama_barang, s.skuCode
    FROM return_items r
    LEFT JOIN products p ON r.idBarang = p.idBarang
    LEFT JOIN skus s ON r.idSKU = s.idSKU
  `;
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching return items:', err);
      res.status(500).json({ error: 'Error fetching return items' });
    } else {
      res.json({ data: results });
    }
  });
});

// Add a new product or update an existing product
app.post('/products', (req, res) => {
  const newProduct = req.body;
  if (!newProduct.idBarang) {
    // If idBarang is not provided, it's a new product, so INSERT into products table
    const insertQuery = 'INSERT INTO products SET ?';
    connection.query(insertQuery, newProduct, (err, results) => {
      if (err) {
        console.error('Error adding new product:', err);
        res.status(500).json({ error: 'Error adding new product' });
      } else {
        const insertedProduct = { ...newProduct, idBarang: results.insertId };
        res.json({ message: 'Product added successfully', data: insertedProduct });
      }
    });
  } else {
    // If idBarang is provided, it's an existing product, so UPDATE the product in products table
    const idBarang = newProduct.idBarang;
    delete newProduct.idBarang; // Remove the idBarang from the newProduct object
    const updateQuery = 'UPDATE products SET ? WHERE idBarang = ?';
    connection.query(updateQuery, [newProduct, idBarang], (err, results) => {
      if (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Error updating product' });
      } else {
        res.json({ message: 'Product updated successfully', data: newProduct });
      }
    });
  }
});

// Route untuk menambahkan data pengembalian baru
app.post('/return-items', (req, res) => {
  const { idBarang, idSKU, jumlah, alasan } = req.body;

  // Periksa apakah SKU yang diberikan valid
  const checkSkuQuery = 'SELECT * FROM skus WHERE idSKU = ?';
  connection.query(checkSkuQuery, [idSKU], (err, skuResults) => {
    if (err) {
      console.error('Error checking SKU:', err);
      res.status(500).json({ error: 'Error checking SKU' });
      return;
    }

    if (skuResults.length === 0) {
      // Jika idSKU tidak valid, kembalikan pesan kesalahan
      res.status(404).json({ message: 'Invalid SKU' });
    } else {
      // Tambahkan data pengembalian ke dalam tabel return_items
      const insertQuery = 'INSERT INTO return_items (idBarang, idSKU, jumlah, alasan) VALUES (?, ?, ?, ?)';
      connection.query(insertQuery, [idBarang, idSKU, jumlah, alasan], (err, result) => {
        if (err) {
          console.error('Error adding return item:', err);
          res.status(500).json({ error: 'Error adding return item' });
        } else {
          const insertedItem = { id: result.insertId, idBarang, idSKU, jumlah, alasan };
          res.json({ message: 'Return item added successfully', data: insertedItem });
        }
      });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});