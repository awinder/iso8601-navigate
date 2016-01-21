var assert = require('chai').assert
  , factory = require('../index')
  , moment = require('moment')
  , recurrence1 = 'R/2016-01-20T00:00:00Z/P2D'
  , P2D_seconds = 172800
  , start_date_seconds = 1453248000
  , jan_26_2017 = 1485406800
  , jan_27_2017 = 1485493200
  , jan_28_2017 = 1485579600
  , jan_29_2017 = 1485666000
  , jan_30_2017 = 1485752400
  , navigator;

console.log(moment('2016-01-20T00:00:00Z').unix());

describe('Navigator', function() {
  describe('factory', function () {
    it('should return a valid navigator', function() {
      navigator = factory(recurrence1);
      assert.isObject(navigator);
      assert.isObject(navigator.errors);
      assert.isFunction(navigator.next);
      assert.isFunction(navigator.prev);
      assert.isObject(navigator.duration);
      assert.isObject(navigator.start_date);
      assert.isUndefined(navigator.end_date);
      assert.isNumber(navigator.repeats);
    });

  });

  describe('duration', function() {
    it('should have a duration of 2 days', function() {
      assert.isFunction(navigator.duration.asSeconds);
      assert.equal(navigator.duration.asSeconds(), P2D_seconds);
    });
  });

  describe('start_date', function() {
    it('should have a start_date of Jan 20, 2016', function() {
      assert.isFunction(navigator.start_date.unix);
      assert.equal(navigator.start_date.unix(), start_date_seconds);
    });
  });

  describe('repeats', function() {
    it('should have a repeats of Infinity', function() {
      assert.equal(navigator.repeats, Infinity);
    });
  });

  describe('next', function() {
    it('should return Jan 30, 2017 when given Jan 28, 2017', function() {
      assert.equal(navigator.next(jan_28_2017), jan_30_2017);
    });
    it('should return Jan 30, 2017 when given Jan 28, 2017', function() {
      assert.equal(navigator.next(jan_29_2017), jan_30_2017);
    });

    it('should callback Jan 30, 2017 when given Jan 28, 2017', function(done) {
      navigator.next(jan_28_2017, function(err, result) {
        assert.notOk(err);
        assert.equal(result, jan_30_2017);
        done();
      });
    });
    it('should callback Jan 30, 2017 when given Jan 28, 2017', function(done) {
      navigator.next(jan_29_2017, function(err, result) {
        assert.notOk(err);
        assert.equal(result, jan_30_2017);
        done();
      });
    });
  });

  describe('prev', function() {
    it('should return Jan 26, 2017 when given Jan 28, 2017', function() {
      assert.equal(navigator.prev(jan_28_2017), jan_26_2017);
    });
    it('should return Jan 26, 2017 when given Jan 27, 2017', function() {
      assert.equal(navigator.prev(jan_29_2017), jan_26_2017);
    });

    it('should callback Jan 26, 2017 when given Jan 28, 2017', function(done) {
      navigator.next(jan_28_2017, function(err, result) {
        assert.notOk(err);
        assert.equal(result, jan_26_2017);
        done();
      });
    });
    it('should callback Jan 26, 2017 when given Jan 27, 2017', function(done) {
      navigator.next(jan_27_2017, function(err, result) {
        assert.notOk(err);
        assert.equal(result, jan_26_2017);
        done();
      });
    });
  });

});
