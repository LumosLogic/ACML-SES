"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cloudwatch_1 = require("../services/cloudwatch");
const router = (0, express_1.Router)();
// GET /api/metrics?days=7&format=summary
// GET /api/metrics?days=7&format=timeseries
router.get('/metrics', async (req, res) => {
    const days = parseInt(req.query.days || '7');
    const format = req.query.format || 'summary';
    if (isNaN(days) || days < 1 || days > 90) {
        res.status(400).json({ error: 'days must be between 1 and 90' });
        return;
    }
    try {
        if (format === 'timeseries') {
            const data = await (0, cloudwatch_1.getSESMetrics)(days);
            res.json({ period_days: days, metrics: data });
            return;
        }
        const summary = await (0, cloudwatch_1.getSESSummary)(days);
        const send = summary.send || 0;
        res.json({
            period_days: days,
            summary: {
                sent: send,
                delivered: summary.delivery || 0,
                bounced: summary.bounce || 0,
                complained: summary.complaint || 0,
                rejected: summary.reject || 0,
                opened: summary.open || 0,
                clicked: summary.click || 0,
            },
            rates: {
                delivery_rate_percent: send > 0 ? +((summary.delivery / send) * 100).toFixed(1) : 0,
                bounce_rate_percent: send > 0 ? +((summary.bounce / send) * 100).toFixed(1) : 0,
                open_rate_percent: send > 0 ? +((summary.open / send) * 100).toFixed(1) : 0,
                click_rate_percent: send > 0 ? +((summary.click / send) * 100).toFixed(1) : 0,
            },
        });
    }
    catch (err) {
        console.error('[metrics] CloudWatch error:', err);
        res.status(500).json({ error: 'Failed to fetch metrics from CloudWatch' });
    }
});
exports.default = router;
