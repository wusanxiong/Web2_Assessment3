const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');  
const app = express();

app.use(cors());
app.use(express.json()); 

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
  
app.get('/fundraiser/:id', (req, res) => {
  const fundraiserId = req.params.id;
  const query = `
    SELECT f.*, d.donation_id, d.date, d.amount, d.giver
    FROM fundraisers f
    LEFT JOIN donation d ON f.fundraiser_id = d.fundraiser_id
    WHERE f.fundraiser_id = ?
  `;
  
  db.query(query, [fundraiserId], (err, results) => {
    if (err) return res.status(500).send('Database query error');
    if (!results.length) return res.status(404).send('Fundraiser not found');
    
    const fundraiser = {
      ...results[0],
      donations: results.map(row => ({
        donation_id: row.donation_id,
        date: row.date,
        amount: row.amount,
        giver: row.giver
      })).filter(donation => donation.donation_id !== null)
    };
    
    res.json(fundraiser);
  });
});

app.post('/donation', (req, res) => {
  const { date, amount, giver, fundraiser_id } = req.body;
  const query = 'INSERT INTO donation (date, amount, giver, fundraiser_id) VALUES (?, ?, ?, ?)';
  
  db.query(query, [date, amount, giver, fundraiser_id], (err, result) => {
    if (err) return res.status(500).send('Database insertion error');
    res.status(201).send(`Donation added with ID: ${result.insertId}`);
  });
});

app.post('/fundraiser', (req, res) => {
  const { organizer, title, target_funding, city, category_id } = req.body;
  const query = 'INSERT INTO fundraisers (organizer, title, target_funding, city, category_id) VALUES (?, ?, ?, ?, ?)';
  
  db.query(query, [organizer, title, target_funding, city, category_id], (err, result) => {
    if (err) return res.status(500).send('Database insertion error');
    res.status(201).send(`Fundraiser added with ID: ${result.insertId}`);
  });
});

app.put('/fundraiser/:id', (req, res) => {
  const fundraiserId = req.params.id;
  const { update_organizer, update_title, update_target_funding, update_city, update_category_id } = req.body;
  const query = 'UPDATE fundraisers SET organizer = ?, title = ?, target_funding = ?, city = ?, category_id = ? WHERE fundraiser_id = ?';
  
  db.query(query, [update_organizer, update_title, update_target_funding, update_city, update_category_id, fundraiserId], (err, result) => {
    if (err) {
      console.error('Database update error:', err); 
      return res.status(500).send('Database update error');
    }
    if (result.affectedRows === 0) return res.status(404).send('Fundraiser not found');
    res.send('Fundraiser updated successfully');
  });
});


app.delete('/fundraiser/:id', (req, res) => {
  const fundraiserId = req.params.id;
  const checkQuery = 'SELECT COUNT(*) AS donationCount FROM donation WHERE fundraiser_id = ?';
  
  db.query(checkQuery, [fundraiserId], (err, results) => {
    if (err) return res.status(500).send('Database query error');
    if (results[0].donationCount > 0) return res.status(400).send('Cannot delete fundraiser with donations');
    
    const deleteQuery = 'DELETE FROM fundraisers WHERE fundraiser_id = ?';
    db.query(deleteQuery, [fundraiserId], (err, result) => {
      if (err) return res.status(500).send('Database deletion error');
      if (result.affectedRows === 0) return res.status(404).send('Fundraiser not found');
      res.send('Fundraiser deleted successfully');
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
