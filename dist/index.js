"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const email_1 = __importDefault(require("./routes/email"));
const jobs_1 = __importDefault(require("./routes/jobs"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const emailWorker_1 = require("./workers/emailWorker");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api', email_1.default);
app.use('/api', jobs_1.default);
app.use('/api', metrics_1.default);
app.use((err, _req, res, _next) => {
    console.error('[error]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});
const worker = (0, emailWorker_1.startEmailWorker)();
const server = app.listen(config_1.config.port, () => {
    console.log(`Server running on port ${config_1.config.port}`);
});
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await worker.close();
    server.close();
});
exports.default = app;
