// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const SUBMIT_PASSWORD = process.env.SUBMIT_PASSWORD || 'exam123';

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory token store for reusable tokens
const validTokens = new Set();

// Endpoint to verify password and generate a reusable token
app.post('/verify-password', (req, res) => {
  const { password } = req.body;
  if (password === SUBMIT_PASSWORD) {
    const token = crypto.randomBytes(16).toString('hex');
    validTokens.add(token); // token valid for multiple submissions
    res.json({ ok: true, token });
  } else {
    res.json({ ok: false });
  }
});

// Store ongoing work (NOT final submissions)
const saveFile = path.join(__dirname, 'saves.json');

// SAVE (partial save)
app.post('/save', (req, res) => {
  const { token, name, questions } = req.body;
  if (!validTokens.has(token)) {
    return res.json({ ok: false, error: 'Invalid token' });
  }

  let saves = {};
  if (fs.existsSync(saveFile)) {
    saves = JSON.parse(fs.readFileSync(saveFile, 'utf8'));
  }

  // Merge existing + new
  if (!saves[token]) {
    saves[token] = { name, questions: {} };
  }

  saves[token].name = name;
  saves[token].questions = {
    ...saves[token].questions,
    ...questions
  };

  fs.writeFileSync(saveFile, JSON.stringify(saves, null, 2));

  res.json({ ok: true });
});

// GET saved work
app.get('/get', (req, res) => {
  const { token } = req.query;
  if (!validTokens.has(token)) {
    return res.json({ ok: false, error: 'Invalid token' });
  }

  if (!fs.existsSync(saveFile)) {
    return res.json({ ok: true, questions: {} });
  }

  const saves = JSON.parse(fs.readFileSync(saveFile, 'utf8'));
  const data = saves[token];

  res.json({
    ok: true,
    name: data?.name || "",
    questions: data?.questions || {}
  });
});

// Submit endpoint
app.post('/submit', (req, res) => {
  const { token, name, questions } = req.body;
  if (!validTokens.has(token)) return res.json({ ok: false, error: 'Invalid token' });

  // Save submission to submissions.json
  const submissionsFile = path.join(__dirname, 'submissions.json');
  let submissions = [];
  if (fs.existsSync(submissionsFile)) {
    submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
  }
  const entry = { name, time: new Date().toISOString(), questions };
  submissions.push(entry);
  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

  res.json({ ok: true });
});

// Admin endpoint to download submissions.json
app.get('/admin/download', (req, res) => {
  const submissionsFile = path.join(__dirname, 'submissions.json');
  if (!fs.existsSync(submissionsFile)) return res.status(404).send('No submissions yet');
  res.download(submissionsFile, 'submissions.json');
});

// Save endpoint
app.post('/save', (req, res) => {
  const { token, name, questions } = req.body;
  if (!validTokens.has(token)) return res.json({ ok: false, error: 'Invalid token' });

  // Save submission to submissions.json
  const savesFile = path.join(__dirname, 'saves.json');
  let saves = [];
  if (fs.existsSync(savesFile)) {
    saves = JSON.parse(fs.readFileSync(savesFile, 'utf8'));
  }
  const entry = { name, time: new Date().toISOString(), questions };
  saves.push(entry);
  fs.writeFileSync(savesFile, JSON.stringify(saves, null, 2));

  res.json({ ok: true });
});

// Admin endpoint to download saves.json
app.get('/admin/download-saves', (req, res) => {
  const savesFile = path.join(__dirname, 'saves.json');
  if (!fs.existsSync(savesFile)) return res.status(404).send('No saved work yet');
  res.download(savesFile, 'saves.json');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));