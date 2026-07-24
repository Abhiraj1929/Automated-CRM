const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const reportService = require('../services/reportService');

router.get('/pipeline', authenticate, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const result = await reportService.generatePipelineReport({ format });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/revenue', authenticate, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const result = await reportService.generateRevenueReport({
      format,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
    });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/activities', authenticate, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const result = await reportService.generateActivityReport({ format });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/lead-conversion', authenticate, async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const result = await reportService.generateLeadConversionReport({ format });
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scheduled reports
router.get('/scheduled', authenticate, async (req, res) => {
  try {
    const { data, error } = await reportService.getScheduledReports();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduled', authenticate, async (req, res) => {
  try {
    const { data, error } = await reportService.createScheduledReport(req.body);
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/scheduled/:id', authenticate, async (req, res) => {
  try {
    const { error } = await reportService.deleteScheduledReport(req.params.id);
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
