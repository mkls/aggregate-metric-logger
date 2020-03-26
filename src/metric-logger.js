'use strict';

const uuid = require('uuid/v4');
const loggerFactory = require('@emartech/json-logger');
const { getSeconds, startOfMinute, addSeconds } = require('date-fns');
const { omit, pick } = require('lodash');
const stringify = require('json-stable-stringify');

module.exports = ({ enabled = true, namespace = 'aggregate-metric-logger' } = {}) => {
  const logger = loggerFactory(namespace);

  let measurements = {};
  let metrics = {};
  let initialized = false;

  const flush = () => {
    logMetrics();
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
        metricForKey.min = metricForKey.max = metricForKey.sum = metricForKey.avarage = value;
      }
      metrics[key] = metricForKey;
    } else {
      const metricsSoFar = metrics[key];
      metrics[key].count = metricsSoFar.count + 1;
      if (!countOnly) {
        metrics[key].min = Math.min(metricsSoFar.min, value);
        metrics[key].max = Math.max(metricsSoFar.max, value);
        metrics[key].sum = metricsSoFar.sum + value;
        metrics[key].avarage = metrics[key].sum / metrics[key].count;
      }
    }
  };

  const logMetrics = () => {
    Object.values(metrics).forEach(metrics =>
      logger[metrics.method](metrics.tag, omit(metrics, ['tag', 'method']))
    );
  };

  return {
    count(tag, value, params) {
      addMeasurement({ tag, value, params })
    },
    trace(tag, params) {
      addMeasurement({ method: 'trace', tag, params, value: 1, countOnly: true });
    },
    debug(tag, params) {
      addMeasurement({ method: 'debug', tag, params, value: 1, countOnly: true });
    },
    info(tag, params) {
      addMeasurement({ method: 'info', tag, params, value: 1, countOnly: true });
    },
    warn(tag, params) {
      addMeasurement({ method: 'warn', tag, params, value: 1, countOnly: true });
    },
    error(tag, params) {
      addMeasurement({ method: 'error', tag, params, value: 1, countOnly: true });
    },
    fatal(tag, params) {
      addMeasurement({ method: 'fatal', tag, params, value: 1, countOnly: true });
    },
    start(tag, params) {
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
    }
  };
};
