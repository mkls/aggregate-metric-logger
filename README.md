# aggregate-metric-logger
aggregate metrics in memory and log them every minute

## Setup

Set `METRIC_LOGGER_ENABLED` env variable to `true` for aggregate-metric-logger to
start collecting and logging measuremnts.

To change the default `aggregate-metric-logger` namespace used for logs, set
`METRIC_LOGGER_NAMESPACE` to a custom value.

## Usage

If you want aggregate measuremts about something you need to simply call the call method
for each value:

```js
const metrictLogger = require('aggregate-metric-logger')

metricLogger.count('thing-to-count', 14)
metricLogger.count('thing-to-count', 20)
```

Every minute metric logger will log `min`, `max`, `sum`, `count` and `avarage` aggregated metrics
for each measured tags. (Uses `@emartech/json-logger` behind the scenes for logging).

### Measuring durations

For duration measuremts, there are two convinience methods: `start`, and `stop`;

You start the measurement with `start`, the counted value for aggregation will be the duration
between this `start` and the matcing `stop` call;

```js
function exampleIOHeavyFunction() {
  const measurementId = metricLogger.start('tag-for-the-measuement');
  const result = db.findItems();
  metricLogger.stop(measurementId);
  return result;
}
```