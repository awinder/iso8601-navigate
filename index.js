var moment = require('moment')


function Navigator(conf) {
	this.created = moment();
	this.start_date = conf.start_date || this.created;
	this.end_date = conf.end_date || Infinity;
	this.duration = conf.duration;
	this.repeats = conf.repeats;
}

Navigator.prototype.next = function(timestamp, cb) {
	if (!this.duration.asSeconds()) {
		if(cb) cb(new Error('ISO8601 navigator interval is not valid.'));
		return NaN;
	}

	var end = this.end_date,
		endString = end===Infinity ? 'Infinity' : end.toISOString(),
		noLaterErr = 'No occurence of this pattern after '+endString,
		invalidOrTooLateErr = 'Given timestamp is invalid or after '+
							  'ISO8601 navigator start date: '+endString,
		ret = moment(timestamp),
		unix;

	if (ret.isValid() === false || ret > end) {
		if(cb) cb(new Error(invalidOrTooLateErr));
		return NaN;
	}

	ret.add(this.duration);

	if (ret > end) {
		if(cb) cb(new Error(noLaterErr));
		return NaN;
	}

	unix = ret.unix();

	if(cb) cb(null, unix)
	return unix;
};

Navigator.prototype.previous = function(timestamp, cb) {
	if (!this.duration.asSeconds()) {
		if(cb) cb(new Error('ISO8601 navigator interval is not valid.'));
		return NaN;
	}
	var start = this.start_date,
		startString = start.toISOString(),
		noEarlierErr = 'No occurence of this pattern before '+startString,
		invalidOrTooEarlyErr = 'Given timestamp is invalid or before '+
							   'ISO8601 navigator start date: '+startString,
		ret = moment(timestamp),
		unix;

	if (ret.isValid() === false || ret < start) {
		if(cb) cb(new Error(invalidOrTooEarlyErr));
		return NaN;
	}

	ret.subtract(this.duration);

	if (ret < start) {
		if(cb) cb(new Error(noEarlierErr));
		return NaN;
	}

	unix = ret.unix();

	if(cb) cb(null, unix)
	return unix;
};

Navigator.prototype.prev = Navigator.prototype.previous;

function isoFactory(interval, cb) {
	var pieces = [],
		invalidNavigator = new Navigator({ duration: moment(null) }),
		tooManySeparators = 'ISO8601: too many interval designators',
		tooFewSeparators = 'ISO8601: not enough interval designators',
		repeatRequired = 'ISO8601 repeating interval must start with `R`',
		designator = interval.match(/--/) ? '--' : '/',
		formatting_error;

	if (typeof interval === 'string') {
		if(cb) cb(new Error('An ISO8601-formatted string is required'));
	}

	pieces = interval.split('/');
	// validate proper formatting
	if (pieces.length > 3) {
		formatting_error = tooManySeparators;
	} else if(pieces.length < 2) {
		formatting_error = tooFewSeparators;
	} else if(pieces[0].charAt(0) !== 'R') {
		formatting_error = repeatRequired;
	}

	if(formatting_error) {
		if(cb) cb(new Error(formatting_error));
		return invalidNavigator;
	}

	var repeat = pieces[0].match(/R(\d+)/);

	if (repeat) {
		repeat = repeat.pop();
	} else {
		repeat = 0;
	}

	var start_date = 0
	  , end_date = Infinity
	  , duration = NaN;

	if (pieces.length === 2 && pieces[1].charAt(0) === 'P') {
		duration = moment.duration(pieces[1]);
	} else if (pieces.length === 3 && pieces[1].charAt(0) === 'P') {
		duration = moment.duration(pieces[1]);
		end_date = moment(pieces[2]);
	} else if (pieces.length === 3 && pieces[2].charAt(0) === 'P') {
		duration = moment.duration(pieces[2]);
		start_date = moment(pieces[1]);
	}

	if(!duration.asSeconds()) {
		if(cb) cb(new Error('Unable to parse interval'));
		return invalidNavigator;
	}

	var navigator = new Navigator({
		start_date: start_date,
		end_date: end_date,
		duration: duration,
		repeats: repeat
	});

	if(cb) cb(null, navigator);
	return navigator;
};

module.exports = isoFactory;
