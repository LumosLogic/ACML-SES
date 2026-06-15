"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3000'),
    smtp: {
        host: process.env.SES_SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com',
        port: parseInt(process.env.SES_SMTP_PORT || '465'),
        secure: true,
        user: process.env.SES_SMTP_USER || '',
        pass: process.env.SES_SMTP_PASS || '',
    },
    ses: {
        configSet: process.env.SES_CONFIG_SET || 'recruitx-config',
        defaultFrom: process.env.SES_DEFAULT_FROM || '',
        sendRate: parseInt(process.env.SES_SEND_RATE || '14'),
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        region: process.env.AWS_REGION || 'ap-south-1',
    },
};
