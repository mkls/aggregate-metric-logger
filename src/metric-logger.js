'use strict';

const uuid = require('uuid/v4');
const loggerFactory = require('@emartech/json-logger');
const { getSeconds, startOfMinute, addSeconds } = require('date-fns');
const { omit, pick, fromPairs, toPairs } = require('lodash');
const stringify = require('json-stable-stringify');
const util = require('util');

module.exports = ({
  enabled = true,
  namespace = 'aggregate-metric-logger',
  inProgressMeasurementWarningLimit = 10000
} = {}) => {
  const logger = loggerFactory(namespace);

  const thresholdsByTag = {};
  let measurements = {};
  let metrics = {};
  let initialized = false;

  const flush = () => {
    logMetrics();
    if (Object.keys(measurements).length > inProgressMeasurementWarningLimit) {
      logger.warn('too-many-in-progress-metric-log-measurments');
    }
    metrics = {};
    setupNextFlush();
  };

  const setupNextFlush = () => {
    const secondsInCurrentMinute = getSeconds(new Date());
    const flushOffset = secondsInCurrentMinute >= 30 ? 90 : 30;
    const targetFlushtime = addSeconds(startOfMinute(new Date()), flushOffset);
    const timeout = targetFlushtime - Date.now();
    setTimeout(flush, timeout);
  };

  const incrementThresholdCount = (tag, value, countsSoFar) => {
    const thresholds = thresholdsByTag[tag];
    if (!thresholds) return countsSoFar;

    return fromPairs(thresholds.map(threshold => {
      const previousCount = countsSoFar[threshold] || 0;
      const newCount = value > threshold ? previousCount + 1 : previousCount;
      return [threshold, newCount];
    }));
  };

  const addMeasurement = ({ tag, value, params, method = 'info', countOnly = false }) => {
    if (!enabled) return;

    if (!initialized) {
      setupNextFlush();
      initialized = true;
    }

    const key = `${tag}_${stringify(params)}`;
    if (!metrics[key]) {
      const metricForKey = { method, tag, ...params, count: 1 };
      if (!countOnly) {
        metricForKey.min = metricForKey.max = metricForKey.sum = metricForKey.average = value;
        metricForKey.thresholdCounts = incrementThresholdCount(tag, value, {});
      }
      metrics[key] = metricForKey;
    } else {
      const metricsSoFar = metrics[key];
      metrics[key].count = metricsSoFar.count + 1;
      if (!countOnly) {
        metrics[key].min = Math.min(metricsSoFar.min, value);
        metrics[key].max = Math.max(metricsSoFar.max, value);
        metrics[key].sum = metricsSoFar.sum + value;
        metrics[key].average = metrics[key].sum / metrics[key].count;
        metrics[key].thresholdCounts = incrementThresholdCount(
          tag,
          value,
          metricsSoFar.thresholdCounts
        );
      }
    }
  };

  const logMetrics = () => {
    Object.values(metrics).forEach(metrics => {
      const params = {
        is_metric: true,
        ...omit(metrics, ['tag', 'method', 'thresholdCounts']),
        ...fromPairs(
          toPairs(metrics.thresholdCounts).map(([limit, count]) => [`above_${limit}`, count])
        )
      };
      logger[metrics.method](metrics.tag, params);
    });
  };

  return {
    setThresholds(tag, thresholds) {
      thresholdsByTag[tag] = thresholds;
    },
    measure(tag, value, params = {}) {
      addMeasurement({ tag, value, params });
    },
    count: util.deprecate(
      (tag, value, params = {}) => addMeasurement({ tag, value, params }),
      'count method is deprecated, use measure instead'
    ),
    trace(tag, params = {}) {
      addMeasurement({ method: 'trace', tag, params, value: 1, countOnly: true });
    },
    debug(tag, params = {}) {
      addMeasurement({ method: 'debug', tag, params, value: 1, countOnly: true });
    },
    info(tag, params = {}) {
      addMeasurement({ method: 'info', tag, params, value: 1, countOnly: true });
    },
    warn(tag, params = {}) {
      addMeasurement({ method: 'warn', tag, params, value: 1, countOnly: true });
    },
    error(tag, params = {}) {
      addMeasurement({ method: 'error', tag, params, value: 1, countOnly: true });
    },
    fatal(tag, params = {}) {
      addMeasurement({ method: 'fatal', tag, params, value: 1, countOnly: true });
    },
    start(tag, params = {}) {
      const id = uuid();
      measurements[id] = { tag, params, start: Date.now() };
      return id;
    },
    stop(measurementId) {
      const measurement = measurements[measurementId];
      if (!measurement) return;

      addMeasurement({
        ...pick(measurement, ['tag', 'params']),
        value: Date.now() - measurement.start
      });
      delete measurements[measurementId];
    },
    cancel(measurementId) {
      delete measurements[measurementId];
    }
  };
};
