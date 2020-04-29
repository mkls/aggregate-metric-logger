'use strict';

const metricLoggerFactory = require('./metric-logger');

const enabled = process.env.METRIC_LOGGER_ENABLED === 'true';
const exposedInstance = metricLoggerFactory({
  enabled,
  namespace: process.env.METRIC_LOGGER_NAMESPACE || 'aggregate-metric-logger'
});
const exposedFactoryInstanceHybrid = namespace => metricLoggerFactory({ enabled, namespace });

exposedFactoryInstanceHybrid.setThresholds = exposedInstance.setThresholds;
exposedFactoryInstanceHybrid.measure = exposedInstance.measure;
exposedFactoryInstanceHybrid.count = exposedInstance.count;
exposedFactoryInstanceHybrid.trace = exposedInstance.trace;
exposedFactoryInstanceHybrid.debug = exposedInstance.debug;
exposedFactoryInstanceHybrid.debug = exposedInstance.info;
exposedFactoryInstanceHybrid.debug = exposedInstance.warn;
exposedFactoryInstanceHybrid.debug = exposedInstance.error;
exposedFactoryInstanceHybrid.debug = exposedInstance.fatal;
exposedFactoryInstanceHybrid.debug = exposedInstance.start;
exposedFactoryInstanceHybrid.debug = exposedInstance.stop;

module.exports = exposedFactoryInstanceHybrid;
