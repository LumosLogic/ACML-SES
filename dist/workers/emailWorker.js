"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEmailWorker = startEmailWorker;
const bullmq_1 = require("bullmq");
const queue_1 = require("../services/queue");
const mailer_1 = require("../services/mailer");
const config_1 = require("../config");
// ms to wait between each email to stay within SES rate limit
const EMAIL_DELAY_MS = Math.ceil(1000 / config_1.config.ses.sendRate);
async function processEmailJob(job) {
    const { recipients, subject, body, from, replyTo, isHtml } = job.data;
    const progress = {
        sent: 0,
        failed: 0,
        total: recipients.length,
        failedEmails: [],
    };
    await job.updateProgress({ ...progress });
    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        try {
            await (0, mailer_1.sendEmail)({ to: recipient, from, subject, body, isHtml, replyTo });
            progress.sent++;
        }
        catch (err) {
            progress.failed++;
            progress.failedEmails.push(recipient);
            console.error(`[worker] failed → ${recipient}:`, err.message);
        }
        await job.updateProgress({ ...progress });
        if (i < recipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, EMAIL_DELAY_MS));
        }
    }
    return progress;
}
function startEmailWorker() {
    const worker = new bullmq_1.Worker('email-bulk', processEmailJob, {
        connection: queue_1.redisOptions,
        concurrency: 1,
    });
    worker.on('completed', (job, result) => {
        console.log(`[worker] job ${job.id} done — sent: ${result.sent}, failed: ${result.failed}`);
    });
    worker.on('failed', (job, err) => {
        console.error(`[worker] job ${job?.id} failed:`, err.message);
    });
    console.log(`[worker] started — rate limit: ${config_1.config.ses.sendRate} emails/sec`);
    return worker;
}
