'use strict';

const metricLoggerFactory = require('./metric-logger');

module.exports = metricLoggerFactory({
  enabled: process.env.METRIC_LOGGER_ENABLED === 'true',
  namespace: process.env.METRIC_LOGGER_NAMESPACE || 'aggregate-metric-logger'
});
