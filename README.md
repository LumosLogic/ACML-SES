# ACML-SES — AWS SES Email API

A production-ready Node.js backend for sending emails via AWS SES SMTP with bulk job queuing and CloudWatch metrics.

---

## Architecture

```
Client App
   ↓  POST /api/send-email  (JSON payload)
Your Backend API  (Node.js / Express / TypeScript)
   ↓  SMTP connection (nodemailer)
AWS SES SMTP endpoint  (email-smtp.ap-south-1.amazonaws.com:465)
   ↓  sends email + fires events to Configuration Set
Recipient's inbox
```

### Bulk Send Flow

```
Client POSTs 10,000 recipients
         ↓
API validates, queues job → returns job_id immediately
         ↓
BullMQ worker processes list (rate-limited to 14 emails/sec)
         ↓
Client polls GET /api/job-status/:job_id for progress
         ↓
GET /api/metrics pulls Send / Delivery / Bounce from CloudWatch
```

---

## Project Structure

```
ACML-SES/
├── src/
│   ├── index.ts                  ← Express entry + starts worker in-process
│   ├── config.ts                 ← All env vars in one place
│   ├── types/index.ts            ← Shared TypeScript interfaces
│   ├── services/
│   │   ├── mailer.ts             ← nodemailer → SES SMTP (lazy singleton)
│   │   ├── queue.ts              ← BullMQ queue + Redis connection options
│   │   └── cloudwatch.ts        ← GetMetricData for all 7 SES metrics
│   ├── workers/
│   │   └── emailWorker.ts       ← Rate-limited bulk processor (14 emails/sec)
│   └── routes/
│       ├── email.ts              ← /send-email, /send-bulk, /send-bulk/csv
│       ├── jobs.ts               ← /job-status/:id, /jobs
│       └── metrics.ts           ← /metrics
├── dist/                         ← Compiled JS (npm run build)
├── docker-compose.yml            ← Redis for local dev
├── .env.example                  ← Copy to .env and fill in credentials
└── package.json
```

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express v4 |
| Email transport | Nodemailer → AWS SES SMTP |
| Job queue | BullMQ v5 |
| Queue backend | Redis (Docker locally, ElastiCache on AWS) |
| Metrics | AWS CloudWatch `GetMetricData` |
| CSV parsing | csv-parse |
| Validation | Zod |
| Deployment | Hostinger VPS / AWS EC2 |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
PORT=3000

# AWS SES SMTP Credentials (from SES → SMTP Settings → Create SMTP Credentials)
SES_SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SES_SMTP_PORT=465
SES_SMTP_USER=your_smtp_username_from_aws
SES_SMTP_PASS=your_smtp_password_from_aws

# AWS Credentials (for CloudWatch metrics API)
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=ap-south-1

# SES Config
SES_CONFIG_SET=recruitx-config
SES_DEFAULT_FROM=info@mail.recruitx-ai.com
SES_SEND_RATE=14          # emails per second (SES production default)

# Redis
REDIS_URL=redis://localhost:6379
```

### 3. Start Redis (local dev)

```bash
docker-compose up -d
```

### 4. Run the server

```bash
# Development (ts-node, hot-ish)
npm run dev

# Production
npm run build
npm start
```

---

## API Reference

### Health Check

```
GET /health
```

**Response:**
```json
{ "status": "ok", "timestamp": "2026-06-15T10:00:00.000Z" }
```

---

### Send Email (immediate)

Best for single emails or small batches (< 50 recipients). Sends synchronously and returns results.

```
POST /api/send-email
Content-Type: application/json
```

**Request body:**

```json
{
  "to": ["user1@example.com", "user2@example.com"],
  "subject": "Hello from RecruitX",
  "body": "<h1>Hi there</h1>",
  "from": "info@mail.recruitx-ai.com",
  "replyTo": "support@recruitx-ai.com",
  "isHtml": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | `string \| string[]` | Yes | One or more recipient emails |
| `subject` | `string` | Yes | Email subject |
| `body` | `string` | Yes | Email content (HTML or plain text) |
| `from` | `string` | No | Sender address (defaults to `SES_DEFAULT_FROM`) |
| `replyTo` | `string` | No | Reply-to address |
| `isHtml` | `boolean` | No | `true` by default |

**Response:**
```json
{
  "sent": 2,
  "failed": 0,
  "results": [
    { "email": "user1@example.com", "status": "sent" },
    { "email": "user2@example.com", "status": "sent" }
  ]
}
```

---

### Send Bulk — JSON (queued)

For large lists. Returns immediately with a `job_id`. Worker sends in the background respecting SES rate limits.

```
POST /api/send-bulk
Content-Type: application/json
```

**Request body:**

```json
{
  "recipients": ["a@x.com", "b@x.com", "...10000 more"],
  "subject": "Campaign Subject",
  "body": "<h1>Hello!</h1>",
  "from": "info@mail.recruitx-ai.com",
  "isHtml": true
}
```

**Response `202 Accepted`:**
```json
{
  "job_id": "1",
  "total_recipients": 10000,
  "status": "queued",
  "poll_url": "/api/job-status/1"
}
```

---

### Send Bulk — CSV Upload (queued)

Upload a `.csv` file. The CSV must have an `email` column (case-insensitive). All other fields are sent as form fields.

```
POST /api/send-bulk/csv
Content-Type: multipart/form-data
```

**Form fields:**

| Field | Required | Description |
|---|---|---|
| `file` | Yes | `.csv` file with an `email` column |
| `subject` | Yes | Email subject |
| `body` | Yes | HTML or plain text body |
| `from` | No | Sender address |
| `replyTo` | No | Reply-to address |
| `isHtml` | No | `"true"` (default) or `"false"` |

**Example CSV format:**
```csv
email,name
alice@example.com,Alice
bob@example.com,Bob
```

**Response `202 Accepted`:**
```json
{
  "job_id": "2",
  "total_recipients": 5000,
  "status": "queued",
  "poll_url": "/api/job-status/2"
}
```

---

### Job Status (poll)

Poll this after a bulk send to track progress.

```
GET /api/job-status/:jobId
```

**Response (in progress):**
```json
{
  "job_id": "1",
  "status": "active",
  "total": 10000,
  "sent": 450,
  "failed": 2,
  "progress_percent": 5
}
```

**Response (completed):**
```json
{
  "job_id": "1",
  "status": "completed",
  "total": 10000,
  "sent": 9997,
  "failed": 3,
  "progress_percent": 100,
  "failed_emails": ["bad@example.com", "..."]
}
```

**Job status values:** `waiting` → `active` → `completed` | `failed`

---

### Jobs Queue Overview

```
GET /api/jobs
```

**Response:**
```json
{
  "queue": { "active": 1, "waiting": 0 },
  "recent_completed": [
    { "job_id": "1", "total": 1000, "sent": 998, "failed": 2 }
  ],
  "recent_failed": []
}
```

---

### Metrics (CloudWatch)

Pulls SES event data from CloudWatch. Requires the Configuration Set to be set up with CloudWatch event destination.

```
GET /api/metrics?days=7&format=summary
GET /api/metrics?days=7&format=timeseries
```

| Param | Default | Description |
|---|---|---|
| `days` | `7` | Lookback window — 1 to 90 |
| `format` | `summary` | `summary` for totals, `timeseries` for per-day arrays |

**Summary response:**
```json
{
  "period_days": 7,
  "summary": {
    "sent": 15000,
    "delivered": 14850,
    "bounced": 120,
    "complained": 5,
    "rejected": 25,
    "opened": 7200,
    "clicked": 1800
  },
  "rates": {
    "delivery_rate_percent": 99.0,
    "bounce_rate_percent": 0.8,
    "open_rate_percent": 48.0,
    "click_rate_percent": 12.0
  }
}
```

**Timeseries response:**
```json
{
  "period_days": 7,
  "metrics": {
    "send":     { "timestamps": ["2026-06-09T00:00:00Z", "..."], "values": [2100, 2300] },
    "delivery": { "timestamps": ["2026-06-09T00:00:00Z", "..."], "values": [2080, 2290] },
    "bounce":   { "timestamps": ["..."], "values": [20, 10] },
    "open":     { "timestamps": ["..."], "values": [980, 1100] },
    "click":    { "timestamps": ["..."], "values": [240, 280] }
  }
}
```

> **Note:** `open` and `click` metrics require enabling Open and Click tracking in SES → Configuration Sets → `recruitx-config` → Event Destinations.

---

## CloudWatch Metrics Available

| Metric | What it means |
|---|---|
| `Send` | Emails attempted |
| `Delivery` | Successfully delivered to recipient's server |
| `Bounce` | Failed to deliver (bad / full mailbox) |
| `Complaint` | Marked as spam by recipient |
| `Reject` | Rejected by SES before sending |
| `Open` | Email opened (requires tracking pixel enabled) |
| `Click` | Link clicked inside email (requires click tracking enabled) |

---

## Rate Limiting

SES production access defaults to **14 emails/second**. The worker enforces this automatically using a per-email delay:

```
delay = 1000ms / SES_SEND_RATE = ~71ms between emails
```

To increase throughput, request a sending limit increase in the AWS SES console, then update `SES_SEND_RATE` in `.env`.

---

## Deployment Notes

### Hostinger VPS / AWS EC2

1. Install Node.js 20+, Redis
2. Copy project, run `npm install && npm run build`
3. Use PM2 to keep the process alive:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name acml-ses
   pm2 save
   ```

### AWS (recommended for production)

- **App:** EC2 or ECS Fargate
- **Redis:** ElastiCache (Serverless Redis) — set `REDIS_URL` to the ElastiCache endpoint
- **Credentials:** Use IAM instance role instead of `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (remove those from `.env` and IAM handles auth automatically)

---

## What's Not Built Yet (add later)

- **SNS bounce/complaint webhooks** — SES fires events to SNS → your endpoint → suppress bad emails from future sends
- **API key authentication** — middleware to protect all `/api/*` routes
- **Per-job email templating** — dynamic variables in body (`{{name}}`, etc.)
- **Unsubscribe handling** — one-click unsubscribe header + suppression list
