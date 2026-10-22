#!/usr/bin/env python3
"""
Read-only: which Lambda functions in the account had errors or throttles in a time window?

  python3 scripts/lambdaErrors.py                                         last 60 minutes
  python3 scripts/lambdaErrors.py 2026-10-22T04:10:00Z 2026-10-22T04:30:00Z

Prints one line per function with errors, with the error count per 5-minute bucket.
Region comes from AWS_REGION (default us-east-2).
"""
import json, os, subprocess, sys, tempfile, datetime

REGION = os.environ.get('AWS_REGION', 'us-east-2')
if len(sys.argv) == 3:
    start, end = sys.argv[1], sys.argv[2]
else:
    now = datetime.datetime.now(datetime.timezone.utc)
    end = now.strftime('%Y-%m-%dT%H:%M:%SZ')
    start = (now - datetime.timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')


def search(metric):
    q = [{'Id': 'q', 'Expression': "SEARCH('{AWS/Lambda,FunctionName} MetricName=\"%s\"', 'Sum', 300)" % metric,
          'ReturnData': True}]
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(q, f)
    r = subprocess.run(['aws', '--region', REGION, '--cli-read-timeout', '90', 'cloudwatch', 'get-metric-data',
                        '--start-time', start, '--end-time', end,
                        '--metric-data-queries', 'file://' + f.name, '--output', 'json'],
                       capture_output=True, text=True)
    os.unlink(f.name)
    if r.returncode != 0:
        print('AWS ERROR:', r.stderr.strip()); sys.exit(1)
    return json.loads(r.stdout).get('MetricDataResults', [])


print('Window: %s  to  %s' % (start, end))
for metric in ('Errors', 'Throttles'):
    rows = [(x['Label'], x['Timestamps'], x['Values']) for x in search(metric) if sum(x.get('Values', [])) > 0]
    print('\n%s:' % metric)
    if not rows:
        print('  none')
    for label, ts, vals in sorted(rows, key=lambda r: -sum(r[2])):
        fn = label.split(' ')[0]
        detail = ', '.join('%s=%d' % (t[11:16], v) for t, v in sorted(zip(ts, vals)) if v)
        print('  %-70s total %-4d (%s)' % (fn, sum(vals), detail))
