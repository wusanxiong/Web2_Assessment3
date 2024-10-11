const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');  
const app = express();

app.use(cors());

const db = mysql.createConnection({
  host: '127.0.0.1',     
  user: 'root',          
  password: '12345678',  
  database: 'crowdfunding_db'  
});

db.connect((err) => {
  if (err) {
    console.error('Unable to connect to the database:', err);
    return;
  }
  console.log('Successfully connected to the database!');
});

app.get('/fundraisers', (req, res) => {
  const query = 'SELECT * FROM fundraisers WHERE is_active = TRUE';
  db.query(query, (err, results) => {
    if (err) return res.status(500).send('Database query error');
    res.json(results);
  });
});

app.get('/fundraisers/:id', (req, res) => {
  const fundraiserId = req.params.id;
  const query = 'SELECT * FROM fundraisers WHERE fundraiser_id = ?';
  
  db.query(query, [fundraiserId], (err, result) => {
    if (err) return res.status(500).send('Database query error');
    if (!result.length) return res.status(404).send('Fundraiser not found');
    res.json(result[0]);
  });
});

app.get('/search', (req, res) => {
    const { organizer, city, category } = req.query;
    const baseQuery = 'SELECT * FROM fundraisers WHERE is_active = TRUE';
    const conditions = [];
    const params = [];
  
    if (organizer) {
      conditions.push('organizer LIKE ?');
      params.push(`%${organizer}%`);
    }
  
    if (city) {
      conditions.push('city LIKE ?');
      params.push(`%${city}%`);
    }
  
    if (category) {
      conditions.push('category_id = ?');
      params.push(category);
    }
  
    const finalQuery = conditions.length ? `${baseQuery} AND ${conditions.join(' AND ')}` : baseQuery;
  
    db.query(finalQuery, params, (err, results) => {
      if (err) return res.status(500).send('Database query error');
      if (!results.length) return res.status(404).send('No matching fundraisers found');
      res.json(results);
    });
});
  
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
