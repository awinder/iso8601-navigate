var assert = require('chai').assert
  , factory = require('../index')
  , moment = require('moment')
  , designators = ['/', '--']
  , repeats = [Infinity, 0, 1, 2, 5]
  , starts = ['2016-01-20T00:00:00Z', '2015-01-20T00:00:00Z']
  , periods = ['P2D', 'P1W', 'PT3H45M', 'P1DT12H']
  , ends = ['2016-01-22T00:00:00Z', '2016-01-23T12:00:00Z']
  , cases = [];

designators.forEach(function(designator) {
  var start = null
    , end = null
    , period = null
    , interval;
  repeats.forEach(function(repeat) {
    var R = repeat===Infinity ? 'R' : 'R' + repeat;
    starts.forEach(function(start) {
      ends.forEach(function(end) {
        interval = [R, start, end].join(designator);
        cases.push(build_test_case(interval, period, start, end, repeat));
      });
      periods.forEach(function(period) {
        interval = [R, start, period].join(designator);
        cases.push(build_test_case(interval, period, start, end, repeat));
      });
    });
    ends.forEach(function(end) {
      periods.forEach(function(period) {
        interval = [R, period, end].join(designator);
        cases.push(build_test_case(interval, period, start, end, repeat));
      });
    });
    periods.forEach(function(period) {
      interval = [R, period].join(designator);
      cases.push(build_test_case(interval, period, start, end, repeat));
    });
  });
});

function build_test_case(interval, period, start, end, repeat) {
  var millis, period_seconds, half, test_case
    , cases = [];

  if(!period) {
    millis = moment(end).diff(moment(start));
    period = moment.duration(millis).toISOString();
    end = null; // if there was no period, then the end is just a period marker
  }

  period_seconds = moment.duration(period).asSeconds();
  period_far_seconds = period_seconds * Math.floor(Math.random() * 1000);

  test_case = {
    test: interval,
    repeats: repeat,

    period: period,
    period_human: moment.duration(period).toISOString(),
    period_seconds: period_seconds,
    period_far_seconds: period_far_seconds
  };

  far_seconds = test_case.period_seconds_far

  if(start!==null) {
    var start_seconds = moment(start).unix();
    test_case.start = start;
    test_case.start_seconds = start_seconds;
    if(repeat===Infinity) {
      cases = cases.concat(build_triples(start_seconds + period_far_seconds, period_seconds));
    }
  }

  if(end!==null) {
    var end_seconds = moment(end).unix();
    test_case.end = end;
    test_case.end_seconds = end_seconds;
    if(repeat===Infinity) {
      cases = cases.concat(build_triples(end_seconds - period_far_seconds, period_seconds));
    }
  }

  test_case.cases = cases;

  return test_case;
}

function build_triples(base, period, edge, recurrences) {
  var triples = []
    , bump = 1 // 1s
    , half = Math.floor(period*0.5)
    , halfAgain = Math.floor(period*1.5);
  if(recurrences===0) {
    // these are all the cases we can test for this
    return [[undefined, base-bump, base],
            [undefined, base, base],
            [base, base+bump, undefined],
            [undefined, base-half, base],
            [undefined, base, base],
            [base, base+half, undefined]];
  }

  if(edge==='upper') {
    triples = [[base-period, base-bump, base],
               [base-period, base,   base],
               [base,        base+bump, undefined]];
    if(recurrences===1) {
      triples.concat([[undefined, base-halfAgain, base],
                      [base,      base+halfAgain, undefined]]);
    }
  } else if (edge==='lower') {
    triples = [[undefined, base-bump, base],
               [undefined, base,   base],
               [base,      base+bump, base+period]];
    if(recurrences===1) {
      triples.concat([[undefined,   base-halfAgain, base],
                      [base+period, base+halfAgain, undefined]]);
    }
  } else {
    triples = [[base-period, base-bump, base],
               [base-period, base,   base],
               [base,        base+bump, base+period]];
  }

  return triples;
}

function momentize(timestamp) {
  if(timestamp===undefined) {
    return undefined;
  }
  return moment.unix(timestamp);
}

// turn seconds into milliseconds DRYly
function m(seconds) {
  return seconds * 1000;
}

function is_a_navigator(nav) {
  assert.isObject(nav);
  assert.isObject(nav.errors);
  assert.isFunction(nav.next);
  assert.isFunction(nav.prev);
  assert.isFunction(nav.previous);
  assert.isObject(nav.duration);
  if(nav.start_date !== undefined) {
    assert.isObject(nav.start_date);
  }
  if(nav.end_date !== undefined) {
    assert.isObject(nav.end_date);
  }
  assert.isNumber(nav.repeats);
  return nav;
}


cases.forEach(function(test) {
  var nav, cb_nav;
  describe('Navigator', function() {
    describe('factory', function () {
      it('should return and callback the same valid navigator for '+test.test, function(done) {
        nav = factory(test.test, function(err, result) {
          assert.notOk(err);
          cb_nav = result;
          is_a_navigator(cb_nav);
          done();
        })
        nav = is_a_navigator(nav);
      });

      after(function() {
        assert.equal(cb_nav, nav);
      });
    });

    describe('duration', function() {
      it('should have a duration of '+test.period_human, function() {
        assert.isFunction(nav.duration.asSeconds);
        assert.equal(nav.duration.asSeconds(), test.period_seconds);
      });
    });

    if(test.start) {
      describe('start_date', function() {
        it('should have a start_date of '+test.start, function() {
          assert.isFunction(nav.start_date.unix);
          assert.equal(nav.start_date.unix(), test.start_seconds);
          assert.isUndefined(nav.end_date);
        });
      });
    }

    if(test.end) {
      describe('end_date', function() {
        it('should have a end_date of '+test.end, function() {
          assert.isFunction(nav.end_date.unix);
          assert.equal(nav.end_date.unix(), test.end_seconds);
          assert.isUndefined(nav.start_date);
        });
      });
    }

    describe('repeats', function() {
      it('should have a repeats of '+test.repeats, function() {
        assert.equal(nav.repeats, test.repeats);
      });
    });
    test.cases.forEach(function(triple) {
      var triple = triple
        , prev = triple[0]//===undefined ? triple[0] : triple[0].unix()
        , base = triple[1]//===undefined ? triple[1] : triple[1].unix()
        , next = triple[2]//===undefined ? triple[2] : triple[2].unix()
        , prev_human = prev===undefined ? 'undefined' : momentize(triple[0]).toISOString()
        , base_human = momentize(triple[1]).toISOString()
        , next_human = next===undefined ? 'undefined' : momentize(triple[2]).toISOString();
      describe('next('+base+') '+base_human, function() {
        it('should return and callback '+next+' ('+next_human+')', function(done) {
          var returned = nav.next(m(base), function(err, result) {
            assert.notOk(err);
            assert.equal(result, next);
            done();
          });
          //assert.equal(returned, next);
        });
      });

      describe('prev('+base+' s) '+base_human, function() {
        it('should return and callback '+prev+' ('+prev_human+')', function(done) {
          var returned = nav.prev(m(base), function(err, result) {
            assert.notOk(err);
            assert.equal(result, prev);
            done();
          });
          assert.equal(returned, prev);
        });
      });
    });
  });

/*


should return a valid navigator with all four types of recurrence interval

in the case of a start_date
 should return no previous before that start_date
 in the case of a repeat, should return no next after (start_date + (period * repeats))

in the case of an end_date
 should return no next after that end_date
 in the case of a repeat, should return no previous before (end_date - (period * repeats))








*/


});
