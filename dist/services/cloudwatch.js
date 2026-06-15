"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSESMetrics = getSESMetrics;
exports.getSESSummary = getSESSummary;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const config_1 = require("../config");
const client = new client_cloudwatch_1.CloudWatchClient({
    region: config_1.config.aws.region,
    ...(config_1.config.aws.accessKeyId && {
        credentials: {
            accessKeyId: config_1.config.aws.accessKeyId,
            secretAccessKey: config_1.config.aws.secretAccessKey,
        },
    }),
});
const METRICS = ['Send', 'Delivery', 'Bounce', 'Complaint', 'Reject', 'Open', 'Click'];
async function getSESMetrics(days) {
    const now = new Date();
    const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const period = days <= 1 ? 3600 : 86400;
    const command = new client_cloudwatch_1.GetMetricDataCommand({
        StartTime: startTime,
        EndTime: now,
        MetricDataQueries: METRICS.map(name => ({
            Id: name.toLowerCase(),
            MetricStat: {
                Metric: {
                    Namespace: 'AWS/SES',
                    MetricName: name,
                    Dimensions: [{ Name: 'ses:configuration-set', Value: config_1.config.ses.configSet }],
                },
                Period: period,
                Stat: 'Sum',
            },
            ReturnData: true,
        })),
    });
    const response = await client.send(command);
    const result = {};
    for (const metric of response.MetricDataResults || []) {
        const pairs = (metric.Timestamps || []).map((t, i) => ({
            t: t.toISOString(),
            v: (metric.Values || [])[i] ?? 0,
        }));
        pairs.sort((a, b) => a.t.localeCompare(b.t));
        result[metric.Id] = {
            timestamps: pairs.map(p => p.t),
            values: pairs.map(p => p.v),
        };
    }
    return result;
}
async function getSESSummary(days) {
    const metrics = await getSESMetrics(days);
    return Object.fromEntries(Object.entries(metrics).map(([key, data]) => [
        key,
        data.values.reduce((sum, v) => sum + v, 0),
    ]));
}
