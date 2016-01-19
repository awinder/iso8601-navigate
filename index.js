var moment = require('moment')

function callback(err, result, cb) {
  if (typeof err === 'string') {
    err = new Error(err);
  }
  if (cb) cb(err, result);
  return result;
};

function until(timestamp, start, duration, repeat) {
  var unlimited = repeat===Infinity
    , next = moment(start)
    , next_count = 0
    , prev
    , prev_count;

  if (start < timestamp) {
    while (timestamp > next && (unlimited || repeat > next_count)) {
      next_count++;
      prev = moment(next);
      next.add(duration);
    }

    if(timestamp > next) { // we hit our repeat count
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
}

function backuntil(timestamp, end, duration, repeat) {
  var unlimited = repeat===Infinity
    , prev = moment(end)
    , prev_count = repeat
    , next
    , next_count;

  if (timestamp < end) {
    while (timestamp < prev && (unlimited || prev_count > 0)) {
      prev_count--;
      next = moment(prev);
      prev.subtract(duration);
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
}

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

Navigator.prototype.next = function(timestamp, cb) {
  var ret = moment(timestamp);

  if (!this.duration.asSeconds()) {
    return callback(this.errors.invalid, NaN, cb);
  }

  if (ret.isValid() === false) {
    return callback(this.errors.bad_timestamp, NaN, cb);
  }

  ret.add(this.duration);

  if (ret > this.end_date) {
    return callback(this.errors.no_later, NaN, cb);
  }

  return callback(null, ret.unix(), cb);
};

Navigator.prototype.previous = function(timestamp, cb) {
  var ret = moment(timestamp);

  if (!this.duration.asSeconds()) {
    return callback(this.errors.invalid, NaN, cb);
  }

  if (ret.isValid() === false) {
    return callback(this.errors.bad_timestamp, NaN, cb);
  }

  ret.add(this.duration);

  if (ret < this.start_date) {
    return callback(this.errors.no_earlier, NaN, cb);
  }

  return callback(null, ret.unix(), cb);
};

Navigator.prototype.prev = Navigator.prototype.previous;

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
    , pieces;

  try {
    designator = interval.match(/--/) ? '--' : designator;
    pieces = interval.split(designator);
  } catch(e) {
    return callback(errors.iso_string_required, invalid_navigator, cb);
  }

  // validate proper formatting
  if (pieces.length > 3) {
    formatting_error = errors.too_many_separators;
  } else if(pieces.length < 2) {
    formatting_error = errors.too_few_separators;
  } else if(pieces[0].charAt(0) !== 'R') {
    formatting_error = errors.repeat_required;
  }

  if(formatting_error) {
    return callback(formatting_error, invalid_navigator, cb);
  }

  repeat_match = pieces[0].match(/R(\d+)/);

  if (repeat_match) {
    repeat = repeat_match[0];
  }

  if (pieces.length === 2) {
    if(pieces[1].charAt(0) === 'P') { // 4.5.1.b
      duration = moment.duration(pieces[1]);
    }
  } else if (pieces[1].charAt(0) === 'P') { // 4.5.1.d
    duration = moment.duration(pieces[1]);
    end_date = moment(pieces[2]);
  } else if (pieces[2].charAt(0) === 'P') { // 4.5.1.c
    start_date = moment(pieces[1]);
    duration = moment.duration(pieces[2]);
  } else { // 4.5.1.a
    start_date = moment(pieces[1]);
    duration = moment.duration(moment(pieces[2]) - start_date);
  }

  if(!duration || !duration.asSeconds()) {
    return callback(errors.parse_error, invalid_navigator, cb);
  }

  var navigator = new Navigator({
    start_date: start_date,
    end_date: end_date,
    duration: duration,
    repeats: repeat
  });

  return callback(null, navigator, cb);
};

module.exports = isoFactory;
