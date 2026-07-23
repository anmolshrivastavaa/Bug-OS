const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

const uploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  cloudinaryUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  uploadedAt: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  requestIp: { type: String }
});

const TransformationUpload = mongoose.model('TransformationUpload', uploadSchema);

function generateSignature(params, apiSecret) {
  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + apiSecret;
  return crypto.createHash('sha1').update(stringToSign).digest('hex');
}

module.exports = function(io) {
  const router = express.Router();

  // Middleware to parse ALL body types as raw Buffer so we don't reject Cimplr's XML/Text
  router.use(express.raw({ type: '*/*', limit: '50mb' }));

  router.post('/upload', async (req, res) => {
    try {
      let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      let apiKey = process.env.CLOUDINARY_API_KEY;
      let apiSecret = process.env.CLOUDINARY_API_SECRET;

      // Fallback parsing from CLOUDINARY_URL if available
      const url = process.env.CLOUDINARY_URL;
      if (url && url.startsWith('cloudinary://')) {
        const parts = url.replace('cloudinary://', '').split('@');
        if (!cloudName) cloudName = parts[1];
        
        const auth = parts[0].split(':');
        if (!apiKey) apiKey = auth[0];
        if (!apiSecret) apiSecret = auth[1];
      }

      if (!cloudName || !apiKey || !apiSecret) {
        console.error("Cloudinary config missing.");
        return res.status(500).json({ success: false, error: 'Cloudinary configuration missing' });
      }

      // Check if it's empty body
      if (!req.body || req.body.length === 0) {
        if (!Buffer.isBuffer(req.body) && Object.keys(req.body || {}).length === 0) {
          return res.status(400).json({ success: false, error: 'Empty payload' });
        }
      }

      let buffer;
      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else {
        const jsonString = JSON.stringify(req.body, null, 2);
        buffer = Buffer.from(jsonString, 'utf-8');
      }
      
      const timestamp = Math.round((new Date()).getTime() / 1000);
      const fileId = `transformed_${Date.now()}`;
      const filename = `${fileId}.json`;
      const publicId = `bugos_uploads/${fileId}`;

      const paramsToSign = {
        timestamp: timestamp,
        public_id: publicId
      };

      const signature = generateSignature(paramsToSign, apiSecret);

      const formData = new FormData();
      formData.append('file', buffer, { filename: filename, contentType: 'application/json' });
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('public_id', publicId);
      formData.append('signature', signature);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
      
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      if (response.data && response.data.secure_url) {
        const doc = new TransformationUpload({
          filename: filename,
          cloudinaryUrl: response.data.secure_url,
          publicId: response.data.public_id,
          uploadedAt: new Date().toISOString(),
          size: response.data.bytes,
          mimeType: 'application/json',
          requestIp: req.ip || req.connection.remoteAddress
        });

        const saved = await doc.save();

        if (io) {
          io.emit('newTransformationUpload', saved);
        }

        return res.status(200).json({
          success: true,
          id: saved._id,
          url: saved.cloudinaryUrl,
          filename: saved.filename
        });
      } else {
        throw new Error('Cloudinary upload failed: no secure_url returned.');
      }
    } catch (error) {
      console.error('Upload Error:', error.response?.data || error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/uploads', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.search) {
        filter.filename = { $regex: req.query.search, $options: 'i' };
      }

      const total = await TransformationUpload.countDocuments(filter);
      const items = await TransformationUpload.find(filter)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit);

      res.json({
        success: true,
        data: items,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/uploads/:id', async (req, res) => {
    try {
      const item = await TransformationUpload.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, data: item });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/uploads/:id/download', async (req, res) => {
    try {
      const item = await TransformationUpload.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, error: 'Not found' });
      
      // Add fl_attachment to Cloudinary URL to force download
      let dlUrl = item.cloudinaryUrl;
      if (dlUrl.includes('/upload/')) {
        dlUrl = dlUrl.replace('/upload/', '/upload/fl_attachment/');
      }
      res.redirect(dlUrl);
    } catch (error) {
      res.status(500).send('Error processing download');
    }
  });

  router.delete('/uploads/:id', async (req, res) => {
    try {
      const item = await TransformationUpload.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, error: 'Not found' });

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || (process.env.CLOUDINARY_URL ? process.env.CLOUDINARY_URL.split('@')[1] : '');
      let apiKey = process.env.CLOUDINARY_API_KEY;
      let apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName) {
        const url = process.env.CLOUDINARY_URL;
        if (url && url.startsWith('cloudinary://')) {
          const parts = url.replace('cloudinary://', '').split('@');
          const auth = parts[0].split(':');
          apiKey = auth[0];
          apiSecret = auth[1];
        }
      }

      // Delete from Cloudinary
      const timestamp = Math.round((new Date()).getTime() / 1000);
      const paramsToSign = {
        timestamp: timestamp,
        public_id: item.publicId
      };
      const signature = generateSignature(paramsToSign, apiSecret);

      const formData = new FormData();
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('public_id', item.publicId);
      formData.append('signature', signature);

      const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`;
      
      try {
        await axios.post(destroyUrl, formData, {
          headers: { ...formData.getHeaders() }
        });
      } catch(cloudinaryErr) {
        console.error('Cloudinary destroy error:', cloudinaryErr.response?.data || cloudinaryErr.message);
      }

      await TransformationUpload.deleteOne({ _id: item._id });

      if (io) {
        io.emit('deletedTransformationUpload', item._id);
      }

      res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
