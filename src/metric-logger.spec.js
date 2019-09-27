'use strict';

const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));
const expect = chai.expect;
afterEach(() => sinon.restore());

const metricLoggerFactory = require('./metric-logger');
const Logger = require('@emartech/json-logger').Logger;

let metricLogger;
beforeEach(() => (metricLogger = metricLoggerFactory()));

describe('metricLogger', () => {
  describe('count', () => {
    it('should log a single measurement at the next flush period', () => {
      const clock = sinon.useFakeTimers();
      sinon.stub(Logger.prototype, 'info');

      metricLogger.count('elfogyasztot-tap', 4);

      clock.tick(60 * 1000 + 1);
      expect(Logger.prototype.info).to.have.been.calledWith('elfogyasztot-tap', {
        min: 4,
        max: 4,
        count: 1,
        sum: 4,
        avarage: 4
      });
    });

    it('should aggregate measurements withing a flush period', () => {
      const clock = sinon.useFakeTimers();
      sinon.stub(Logger.prototype, 'info');

      metricLogger.count('elfogyasztot-tap', 4);
      metricLogger.count('elfogyasztot-tap', 8);
      metricLogger.count('kacsa-cucc', 18);

      clock.tick(60 * 1000 + 1);
      expect(Logger.prototype.info).to.have.been.calledWith('elfogyasztot-tap', {
        min: 4,
        max: 8,
        count: 2,
        sum: 12,
        avarage: 6
      });
      expect(Logger.prototype.info).to.have.been.calledWith('kacsa-cucc', {
        min: 18,
        max: 18,
        count: 1,
        sum: 18,
        avarage: 18
      });
    });
  });

  describe('start/stop', () => {
    it('should log min, max, count and sum when log was called only once', () => {
      const clock = sinon.useFakeTimers();
      sinon.stub(Logger.prototype, 'info');

      const measurementId = metricLogger.start('utlegeles');
      clock.tick(50);
      metricLogger.stop(measurementId);

      clock.tick(60 * 1000);
      expect(Logger.prototype.info).to.have.been.calledWith('utlegeles', {
        min: 50,
        max: 50,
        count: 1,
        sum: 50,
        avarage: 50
      });
    });

    it('should aggregate metrics for two measurements and log after a timeout', () => {
      const clock = sinon.useFakeTimers();
      sinon.stub(Logger.prototype, 'info');

      const measurement1Id = metricLogger.start('utlegeles');
      const measurement2Id = metricLogger.start('utlegeles');
      clock.tick(50);
      metricLogger.stop(measurement1Id);
      clock.tick(20);
      metricLogger.stop(measurement2Id);

      clock.tick(60 * 1000);
      expect(Logger.prototype.info).to.have.been.calledWith('utlegeles', {
        min: 50,
        max: 70,
        sum: 120,
        count: 2,
        avarage: 60
      });
    });

    it('should flush results at the closes minute:30', () => {
      const clock = sinon.useFakeTimers(10 * 1000);
      sinon.stub(Logger.prototype, 'info');

      const measurementId = metricLogger.start('utlegeles');
      metricLogger.stop(measurementId);

      clock.tick(19 * 1000 + 999);
      expect(Logger.prototype.info).not.to.have.been.called;
      clock.tick(1 * 1000);
      expect(Logger.prototype.info).to.have.been.calledWith('utlegeles');
    });

    it('should flush at next minute:30 if we are after 30 in current minute', () => {
      const clock = sinon.useFakeTimers(45 * 1000);
      sinon.stub(Logger.prototype, 'info');

      const measurementId = metricLogger.start('utlegeles');
      metricLogger.stop(measurementId);

      clock.tick(44 * 1000);
      expect(Logger.prototype.info).not.to.have.been.called;
      clock.tick(1 * 1000);
      expect(Logger.prototype.info).to.have.been.calledWith('utlegeles');
    });

    it('should periodically log measuerments', () => {
      const clock = sinon.useFakeTimers(0);
      sinon.stub(Logger.prototype, 'info');

      const measurement1 = metricLogger.start('utlegeles');
      const measurement2 = metricLogger.start('utlegeles');
      clock.tick(10 * 1000);
      const measurement3 = metricLogger.start('utlegeles');
      metricLogger.stop(measurement1);

      clock.tick(21 * 1000);
      expect(Logger.prototype.info).to.have.been.calledWith('utlegeles', {
        count: 1,
        max: 10000,
        min: 10000,
        sum: 10000,
        avarage: 10000
      });

      metricLogger.stop(measurement2);
      metricLogger.stop(measurement3);
      clock.tick(60 * 1000);
      expect(Logger.prototype.info).to.have.been.calledWith('utlegeles', {
        count: 2,
        max: 31000,
        min: 21000,
        sum: 52000,
        avarage: 26000
      });
    });

    it('should log measurements for multiple tags', () => {
      const clock = sinon.useFakeTimers(0);
      sinon.stub(Logger.prototype, 'info');

      const measurement1 = metricLogger.start('utlegeles');
      const measurement2 = metricLogger.start('nyavogas');
      clock.tick(10 * 1000);
      metricLogger.stop(measurement1);
      clock.tick(5 * 1000);
      metricLogger.stop(measurement2);
      clock.tick(15 * 1000);

      expect(Logger.prototype.info).to.have.been.calledWith('utlegeles', {
        count: 1,
        max: 10000,
        min: 10000,
        sum: 10000,
        avarage: 10000
      });
      expect(Logger.prototype.info).to.have.been.calledWith('nyavogas', {
        count: 1,
        max: 15000,
        min: 15000,
        sum: 15000,
        avarage: 15000
      });
    });
  });
});
