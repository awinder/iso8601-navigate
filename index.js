var moment = require('moment')

function Navigator(conf) {
  this.start_date = conf.start_date;
  this.end_date = conf.end_date;
  this.duration = conf.duration;
  this.repeats = conf.repeats;

  errors = {
    invalid: 'ISO8601 navigator interval is not valid',
    bad_timestamp: 'Given timestamp is invalid',
    too_many_separators: 'ISO8601: too many interval designators',
    too_few_separators: 'ISO8601: not enough interval designators',
    repeat_required: 'ISO8601 repeating interval must start with `R`',
    iso_string_required: 'An ISO8601-formatted string is required',
    parse_error: 'Unable to parse interval'
  };

  if (this.end_date && this.end_date.isValid()) {
    errors.no_later = 'No recurrence after ' + this.end_date.toISOString();
  }

  if (this.start_date && this.start_date.isValid()) {
    errors.no_earlier = 'No recurrence after ' + this.start_date.toISOString();
  }

  this.errors = errors;
}

Navigator.prototype.step = function(timestamp, back) {
  var next = gmt(timestamp)
    , prev = gmt(timestamp)
    , next_count = 1
    , prev_count = 0;

  if (back) {
    prev.subtract(this.duration);
  } else {
    next.add(this.duration);
  }

  return {next: next,
          next_count: next_count,
          prev: prev,
          prev_count: prev_count};
};

Navigator.prototype.until = function(timestamp) {
  var unlimited = this.repeats===Infinity
    , next = gmt(this.start_date)
    , next_count = 0
    , prev
    , prev_count;

  if (this.start_date < timestamp) {
    while (timestamp > next && (unlimited || this.repeats > next_count)) {
      next_count++;
      prev = gmt(next);
      next.add(this.duration);
    }

    if (timestamp > next) { // we hit our repeat count
      prev = next;
      next = undefined;
    }

    prev_count = prev===undefined ? undefined : next_count - 1;
    next_count = next===undefined ? undefined : next_count;
  }

  return {next: next,
          next_count: next_count,
          prev: prev,
          prev_count: prev_count};
};

Navigator.prototype.backuntil = function(timestamp) {
  var unlimited = this.repeats===Infinity
    , prev = gmt(this.end_date)
    , prev_count = this.repeats
    , next
    , next_count;

  if (timestamp < this.end_date) {
    while (timestamp <= prev && (unlimited || prev_count > 0)) {
      prev_count--;
      next = gmt(prev);
      prev.subtract(this.duration);
    }

    if (timestamp < prev) {
      next = prev;
      prev = undefined;
    }

    next_count = next===undefined ? undefined : prev_count + 1;
    prev_count = prev===undefined ? undefined : prev_count;
  }
  return {next: next,
          next_count: next_count,
          prev: prev,
          prev_count: prev_count};
};

Navigator.prototype.search = function(timestamp, direction, cb) {
  var ret = gmt(timestamp)
    , out_of_bounds
    , boxed;

  if(!ret.isValid()) {
    return callback(this.errors.bad_timestamp, NaN, cb);
  }

  if (direction === 'prev') {
    back = true;
    out_of_bounds = this.errors.no_earlier;
  } else {
    direction = 'next';
    back = false;
    out_of_bounds = this.errors.no_later;
  }

  if (this.duration === undefined || this.duration.asSeconds() === 0) {
    return callback(this.errors.invalid, NaN, cb);
  }

  if (ret.isValid() === false) {
    return callback(this.errors.bad_timestamp, NaN, cb);
  }

  if (this.start_date) {
    boxed = this.until(ret);
  } else if (this.end_date) {
    boxed = this.backuntil(ret);
  } else {
    boxed = this.step(ret, back);
  }
  if(this.flag===timestamp) console.dir(boxed);

  if (boxed[direction]) {
    return callback(null, boxed[direction].unix(), cb);
  } else {
    return callback(out_of_bounds, NaN, cb);
  }

};

Navigator.prototype.next = function(timestamp, cb) {
  return this.search(timestamp, 'next', cb);
};

Navigator.prototype.prev = function(timestamp, cb) {
  return this.search(timestamp, 'prev', cb);
};

Navigator.prototype.previous = Navigator.prototype.prev;

function callback(err, result, cb) {
  if (typeof err === 'string') {
    err = new Error(err);
  }
  if (cb) cb(err, result);
  return result;
};

function gmt(timestamp) {
  return moment(timestamp).utcOffset(0);
}

function isoFactory(interval, cb) {
  var invalid_navigator = new Navigator({ duration: moment(null) })
    , errors = invalid_navigator.errors
    , designator = '/'
    , repeat = Infinity
    , repeat_match
    , formatting_error
    , start_date
    , end_date
    , duration
    , pieces
    , nav;

  try {
    designator = interval.match(/--/) ? '--' : designator;
    pieces = interval.split(designator);
  } catch(e) {
    return callback(errors.iso_string_required, invalid_navigator, cb);
  }

  // validate proper formatting
  if (pieces.length > 3) {
    formatting_error = errors.too_many_separators;
  } else if (pieces.length < 2) {
    formatting_error = errors.too_few_separators;
  } else if (pieces[0].charAt(0) !== 'R') {
    formatting_error = errors.repeat_required;
  }

  if (formatting_error) {
    return callback(formatting_error, invalid_navigator, cb);
  }

  repeat_match = pieces[0].match(/R(\d+)/);

  if (repeat_match) {
    repeat = parseInt(repeat_match.pop(), 10);
  }

  if (pieces.length === 2) {
    if (pieces[1].charAt(0) === 'P') { // 4.5.1.b
      duration = moment.duration(pieces[1]);
    }
  } else if (pieces[1].charAt(0) === 'P') { // 4.5.1.d
    duration = moment.duration(pieces[1]);
    end_date = gmt(pieces[2]);
  } else if (pieces[2].charAt(0) === 'P') { // 4.5.1.c
    start_date = gmt(pieces[1]);
    duration = moment.duration(pieces[2]);
  } else { // 4.5.1.a
    start_date = gmt(pieces[1]);
    duration = moment.duration(gmt(pieces[2]) - start_date);
  }

  if (duration === undefined || duration.asSeconds() === 0) {
    return callback(errors.parse_error, invalid_navigator, cb);
  }

  nav = new Navigator({
    start_date: start_date,
    end_date: end_date,
    duration: duration,
    repeats: repeat
  });

  return callback(null, nav, cb);
};

module.exports = isoFactory;
