var assert = require('chai').assert
  , factory = require('../index')
  , moment = require('moment')
  , designators = ['/', '--']
  , repeats = [Infinity, 0, 1, 2, 5]
  , starts = ['2016-01-20T00:00:00Z', '2015-01-20T00:00:00Z']
  , periods = ['P2D', 'P1W', 'PT3H45M', 'P1DT12H']
  , ends = ['2016-01-22T00:00:00Z', '2016-01-23T12:00:00Z']
  , cases = [];

/*
Testing still needs a lot of love:

- all four recurrence formats
- missing, 0, 1, and one or more higher numbers for recurrence counts
  - special attention to 0 and 1
- bad examples of all of these that should produce errors

Currently we are testing validity of the navigator object for all good
examples of the input formats, broadly, but not all the different period
formats (mainly because we're handing those off to moment.duration anyway,
so it's not clear that it's useful to repeat tests they undoubtedly have).

We are also testing cases where the recurrence count is unspecified (Infinity),
and where we have a start and end date.

Things we still need to test:

- specified recurrence counts above 1
- recurrence count of 1
  - upper and lower bounds/edges of these...

- recurrence count of 0
  - start date:
    - next(start_date-1): start_date
    - next(start_date): start_date
    - next(start_date+1): NaN
    - prev(start_date-1): NaN
    - prev(start_date): NaN
    - prev(start_date+1): NaN
  - end date:
    - next( (end_date-period) - 1): end_date-period
    - next(end_date-period): end_date-period
    - next( (end_date-period) + 1): NaN
    - next(end_date): NaN
    - prev( (end_date-period) - 1): NaN
    - prev(end_date-period): NaN
    - prev((end_date-period) + 1): end_date-period
    - prev(end_date): end_date-period
  - neither:
    - next(given): given
    - prev(given): NaN
    - (this is consistent with how we're treating other recurrences, but has
      the odd effect that R0/P<anything> and R1/P<same anything> always mean
      the same thing for next/prev; later when we add some manipulation there
      will be a workflow like "var n = navigate(R1/P<anything>); ... n.next(now); n.fire(); n.to_iso_8601();"
      which turns R1/P... into R0/P... such that we can keep track of occurences
      without a start or end)

*/


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


// build_triples probably needs a little more subtlety before we
// can use it for all test cases.
function build_triples(base, period, edge, recurrences) {
  var triples = []
    , bump = 1 // 1s
    , half = Math.floor(period*0.5)
    , halfAgain = Math.floor(period*1.5);
  if(recurrences===0) {
    // these are all the cases we can test for this
    return [[NaN, base-bump, base],
            [NaN, base, base],
            [base, base+bump, NaN],
            [NaN, base-half, base],
            [NaN, base, base],
            [base, base+half, NaN]];
  }

  if(edge==='upper') {
    triples = [[base-period, base-bump, base],
               [base-period, base,   base],
               [base,        base+bump, NaN]];
    if(recurrences===1) {
      triples.concat([[undefined, base-halfAgain, base],
                      [base,      base+halfAgain, NaN]]);
    }
  } else if (edge==='lower') {
    triples = [[NaN, base-bump, base],
               [NaN, base,   base],
               [base,      base+bump, base+period]];
    if(recurrences===1) {
      triples.concat([[NaN,   base-halfAgain, base],
                      [base+period, base+halfAgain, NaN]]);
    }
  } else {
    triples = [[base-period, base-bump, base],
               [base-period, base,   base],
               [base,        base+bump, base+period]];
  }

  return triples;
}

function momentize(timestamp) {
  if(timestamp===NaN) {
    return NaN;
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
        , prev = triple[0]
        , prev_human = prev===NaN ? 'none' : momentize(prev).toISOString()
        , base = triple[1]
        , base_human = momentize(base).toISOString()
        , next = triple[2]
        , next_human = next===NaN ? 'none' : momentize(next).toISOString();
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
