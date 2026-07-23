const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Create an 'uploads' directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Configure multer to save files to the 'uploads' directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Save with a timestamp to avoid overwriting files with the same name
    cb(null, Date.now() + '-' + file.originalname)
  }
});

// upload.any() accepts files sent under any field name
const upload = multer({ storage: storage }); 

// The endpoint that matches your screenshot ('/ingest')
app.post('/ingest', upload.any(), (req, res) => {
  console.log('\n--- New Request Received on /ingest ---');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body); // For text fields
  
  if (req.files && req.files.length > 0) {
      console.log('Files:', req.files);
      console.log(`✅ Success! Received ${req.files.length} file(s). Saved to /uploads folder.`);
  } else {
      console.log(`⚠️ Warning: Request received, but no files were found.`);
  }

  // Respond to the other website so it knows it was successful
  res.status(200).json({ success: true, message: 'Data received successfully' });
});

app.listen(port, () => {
  console.log(`\n🚀 Test API listening at http://localhost:${port}`);
  console.log(`Waiting for POST requests on /ingest...\n`);
});
