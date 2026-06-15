import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { config } from '../config';

const client = new CloudWatchClient({
  region: config.aws.region,
  ...(config.aws.accessKeyId && {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  }),
});

const METRICS = ['Send', 'Delivery', 'Bounce', 'Complaint', 'Reject', 'Open', 'Click'] as const;

export async function getSESMetrics(
  days: number
): Promise<Record<string, { timestamps: string[]; values: number[] }>> {
  const now = new Date();
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const period = days <= 1 ? 3600 : 86400;

  const command = new GetMetricDataCommand({
    StartTime: startTime,
    EndTime: now,
    MetricDataQueries: METRICS.map(name => ({
      Id: name.toLowerCase(),
      MetricStat: {
        Metric: {
          Namespace: 'AWS/SES',
          MetricName: name,
          Dimensions: [{ Name: 'ses:configuration-set', Value: config.ses.configSet }],
        },
        Period: period,
        Stat: 'Sum',
      },
      ReturnData: true,
    })),
  });

  const response = await client.send(command);
  const result: Record<string, { timestamps: string[]; values: number[] }> = {};

  for (const metric of response.MetricDataResults || []) {
    const pairs = (metric.Timestamps || []).map((t, i) => ({
      t: t.toISOString(),
      v: (metric.Values || [])[i] ?? 0,
    }));
    pairs.sort((a, b) => a.t.localeCompare(b.t));

    result[metric.Id!] = {
      timestamps: pairs.map(p => p.t),
      values: pairs.map(p => p.v),
    };
  }

  return result;
}

export async function getSESSummary(days: number): Promise<Record<string, number>> {
  const metrics = await getSESMetrics(days);
  return Object.fromEntries(
    Object.entries(metrics).map(([key, data]) => [
      key,
      data.values.reduce((sum, v) => sum + v, 0),
    ])
  );
}
