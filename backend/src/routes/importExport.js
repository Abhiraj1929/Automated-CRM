const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const importExportService = require('../services/importExportService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ============ EXPORT ============

router.get('/export/leads', authenticate, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const result = await importExportService.exportLeads({
      format,
      filters: { owner_id: req.user.role === 'employee' ? req.user.id : undefined },
    });
    if (result.error) return res.status(500).json({ success: false, error: result.error.message });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export/contacts', authenticate, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const result = await importExportService.exportContacts({ format });
    if (result.error) return res.status(500).json({ success: false, error: result.error.message });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export/accounts', authenticate, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const result = await importExportService.exportAccounts({ format });
    if (result.error) return res.status(500).json({ success: false, error: result.error.message });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export/opportunities', authenticate, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const result = await importExportService.exportOpportunities({ format });
    if (result.error) return res.status(500).json({ success: false, error: result.error.message });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export/activities', authenticate, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const result = await importExportService.exportActivities({ format });
    if (result.error) return res.status(500).json({ success: false, error: result.error.message });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ IMPORT ============

router.post('/import/leads', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const rows = importExportService.parseImportFile(req.file);
    const result = await importExportService.importLeads(rows, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/import/contacts', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const rows = importExportService.parseImportFile(req.file);
    const result = await importExportService.importContacts(rows, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/import/accounts', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const rows = importExportService.parseImportFile(req.file);
    const result = await importExportService.importAccounts(rows, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
