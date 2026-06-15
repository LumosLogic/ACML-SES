"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.verifyConnection = verifyConnection;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
let transporter = null;
function getTransporter() {
    if (!transporter) {
        transporter = nodemailer_1.default.createTransport({
            host: config_1.config.smtp.host,
            port: config_1.config.smtp.port,
            secure: config_1.config.smtp.secure,
            auth: {
                user: config_1.config.smtp.user,
                pass: config_1.config.smtp.pass,
            },
        });
    }
    return transporter;
}
async function sendEmail(params) {
    const transport = getTransporter();
    await transport.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        [params.isHtml ? 'html' : 'text']: params.body,
        replyTo: params.replyTo,
        headers: {
            'X-SES-CONFIGURATION-SET': config_1.config.ses.configSet,
        },
    });
}
async function verifyConnection() {
    try {
        await getTransporter().verify();
        return true;
    }
    catch {
        return false;
    }
}
