'use strict';

const uuid = require('uuid/v4');
const loggerFactory = require('@emartech/json-logger');
const { getSeconds, startOfMinute, addSeconds } = require('date-fns');

module.exports = ({ enabled = true, namespace = 'aggregate-metric-logger' } = {}) => {
  const logger = loggerFactory(namespace);

  let measurements = {};
  let metricsByTag = {};
  let initialized = false;

  const flush = () => {
    logMetrics();
    metricsByTag = {};
    setupNextFlush();
  };

  const setupNextFlush = () => {
    const secondsInCurrentMinute = getSeconds(new Date());
    const flushOffset = secondsInCurrentMinute >= 30 ? 90 : 30;
    const targetFlushtime = addSeconds(startOfMinute(new Date()), flushOffset);
    const timeout = targetFlushtime - Date.now();
    setTimeout(flush, timeout);
  };

  const addMeasurement = ({ tag, value }) => {
    if (!metricsByTag[tag]) {
      metricsByTag[tag] = {
        min: value,
        max: value,
        sum: value,
        count: 1,
        avarage: value
      };
    } else {
      const metricsSoFar = metricsByTag[tag];
      metricsByTag[tag].min = Math.min(metricsSoFar.min, value);
      metricsByTag[tag].max = Math.max(metricsSoFar.max, value);
      metricsByTag[tag].sum = metricsSoFar.sum + value;
      metricsByTag[tag].count = metricsSoFar.count + 1;
      metricsByTag[tag].avarage = metricsByTag[tag].sum / metricsByTag[tag].count
    }
  };

  const logMetrics = () =>
    Object.entries(metricsByTag).forEach(([tag, metrics]) => logger.info(tag, metrics));

  return {
    count(tag, value) {
      if (!enabled) {
        return;
      }
      if (!initialized) {
        setupNextFlush();
        initialized = true;
      }
      addMeasurement({ tag, value });
    },
    start(tag) {
      if (!enabled) {
        return;
      }
      if (!initialized) {
        setupNextFlush();
        initialized = true;
      }

      const id = uuid();
      measurements[id] = { tag, start: Date.now() };
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
      addMeasurement({ tag: measurement.tag, value: Date.now() - measurement.start });
      delete measurements[measurementId];
    }
  };
};

