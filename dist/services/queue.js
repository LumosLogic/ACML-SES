"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = exports.redisOptions = void 0;
const bullmq_1 = require("bullmq");
const config_1 = require("../config");
// Parse Redis URL into host/port options for BullMQ's bundled ioredis
function parseRedisUrl(url) {
    const u = new URL(url);
    return {
        host: u.hostname || 'localhost',
        port: parseInt(u.port || '6379'),
        ...(u.password && { password: decodeURIComponent(u.password) }),
        maxRetriesPerRequest: null,
    };
}
exports.redisOptions = parseRedisUrl(config_1.config.redis.url);
exports.emailQueue = new bullmq_1.Queue('email-bulk', {
    connection: exports.redisOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 24 * 3600 }, // keep completed jobs for 24h
        removeOnFail: { age: 7 * 24 * 3600 }, // keep failed jobs for 7d
    },
});
