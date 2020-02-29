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

  const addMeasurement = ({ tag, value, params }) => {
    const key = `${tag}_${stringify(params)}`;
    if (!metrics[key]) {
      metrics[key] = {
        tag,
        ...params,
        min: value,
        max: value,
        sum: value,
        count: 1,
        avarage: value
      };
    } else {
      const metricsSoFar = metrics[key];
      metrics[key].min = Math.min(metricsSoFar.min, value);
      metrics[key].max = Math.max(metricsSoFar.max, value);
      metrics[key].sum = metricsSoFar.sum + value;
      metrics[key].count = metricsSoFar.count + 1;
      metrics[key].avarage = metrics[key].sum / metrics[key].count
    }
  };

  const logMetrics = () =>
    Object.values(metrics).forEach(metrics => logger.info(metrics.tag, omit(metrics, ['tag'])));

  return {
    count(tag, value, params) {
      if (!enabled) {
        return;
      }
      if (!initialized) {
        setupNextFlush();
        initialized = true;
      }
      addMeasurement({ tag, value, params });
    },
    start(tag, params) {
      if (!enabled) {
        return;
      }
      if (!initialized) {
        setupNextFlush();
        initialized = true;
      }

      const id = uuid();
      measurements[id] = { tag, params, start: Date.now() };
      return id;
    },
    stop(measurementId) {
      if (!enabled) {
        return;
      }
      const measurement = measurements[measurementId];
      if (!measurement) {
        return;
      }
      addMeasurement({
        ...pick(measurement, ['tag', 'params']),
        value: Date.now() - measurement.start
      });
      delete measurements[measurementId];
    }
  };
};

