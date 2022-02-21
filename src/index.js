'use strict';

const metricLoggerFactory = require('./metric-logger');

const enabled = process.env.METRIC_LOGGER_ENABLED === 'true';
const inProgressMeasurementWarningLimit =
  parseInt(process.env.METRIC_LOGGER_IN_PROGRESS_MEASUREMENT_WARNING_LIMIT, 10) || 10000;

const exposedInstance = metricLoggerFactory({
  enabled,
  namespace: process.env.METRIC_LOGGER_NAMESPACE || 'aggregate-metric-logger',
  inProgressMeasurementWarningLimit
});
const exposedFactoryInstanceHybrid = namespace => metricLoggerFactory({ enabled, namespace });

exposedFactoryInstanceHybrid.setThresholds = exposedInstance.setThresholds;
exposedFactoryInstanceHybrid.measure = exposedInstance.measure;
exposedFactoryInstanceHybrid.count = exposedInstance.count;
exposedFactoryInstanceHybrid.trace = exposedInstance.trace;
exposedFactoryInstanceHybrid.debug = exposedInstance.debug;
exposedFactoryInstanceHybrid.info = exposedInstance.info;
exposedFactoryInstanceHybrid.warn = exposedInstance.warn;
exposedFactoryInstanceHybrid.error = exposedInstance.error;
exposedFactoryInstanceHybrid.fatal = exposedInstance.fatal;
exposedFactoryInstanceHybrid.start = exposedInstance.start;
exposedFactoryInstanceHybrid.stop = exposedInstance.stop;
exposedFactoryInstanceHybrid.cancel = exposedInstance.cancel;

module.exports = exposedFactoryInstanceHybrid;
