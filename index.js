var moment = require('moment')

function parseInterval(intervalStr) {
	var parts = intervalStr.match(/P((\d+)Y)?((\d+)M)?((\d+)D)?T?((\d+)H)?((\d+)M)?((\d+)S)?/);
		
	var interval = NaN;
	
	if (parts) {
		interval = {
			years: parseInt(parts[2]) || 0,
			months: parseInt(parts[4]) || 0,
			days: parseInt(parts[6]) || 0,
			hours: parseInt(parts[8]) || 0,
			minutes: parseInt(parts[10]) || 0,
			seconds: parseInt(parts[12]) || 0
		}
	}
	
	return interval;
}

function IsoFactory(conf) {
	this.start_date = conf.start_date;
	this.end_date = conf.end_date;
	this.interval = conf.interval;
	this.repeats = conf.repeats;
}

IsoFactory.prototype.next = function(timestamp) {
	if (typeof this.interval !== 'object') {
		return NaN;
	}
	
	var ret = moment(timestamp);
	
	if (ret.isValid() === false || ret > this.end_date) {
		return NaN;
	}
	
	ret.add(this.interval.years, 'years');
	ret.add(this.interval.months, 'months');
	ret.add(this.interval.days, 'days');
	ret.add(this.interval.hours, 'hours');
	ret.add(this.interval.minutes, 'minutes');
	ret.add(this.interval.seconds, 'seconds');
	
	if (ret > this.end_date) { 
		return NaN;
	}

	return ret.unix();
};

IsoFactory.prototype.previous = function(timestamp) {
	if (typeof this.interval !== 'object') {
		return NaN;
	}
	
	var ret = moment(timestamp);
	
	if (ret.isValid() === false || ret < this.start_date) {
		return NaN;
	}
	
	ret.subtract(this.interval.years, 'years');
	ret.subtract(this.interval.months, 'months');
	ret.subtract(this.interval.days, 'days');
	ret.subtract(this.interval.hours, 'hours');
	ret.subtract(this.interval.minutes, 'minutes');
	ret.subtract(this.interval.seconds, 'seconds');
	
	if (ret < this.start_date) { 
		return NaN;
	}
	
	return ret.unix();
};

module.exports = function(interval) {
	var pieces = [];
	
	if (typeof interval === 'string') {
		pieces = interval.split('/');
	}
	
	// validate proper formatting
	if (pieces.length > 3 || pieces.length < 2 || pieces[0].charAt(0) !== 'R') {
		return IsoFactory({ interval: NaN });
	}
	
	var repeat = pieces[0].match(/R(\d+)/);
	
	if (repeat) {
		repeat = repeat.pop();
	} else {
		repeat = 0;
	}
	
	var start_date = 0
	  , end_date = Infinity
	  , interval = NaN;
	  
	if (pieces.length === 2 && pieces[1].charAt(0) === 'P') {
		interval = parseInterval(pieces[1]);
	} else if (pieces.length === 3 && pieces[1].charAt(0) === 'P') {
		interval = parseInterval(pieces[1]);
		end_date = moment(pieces[2]);
	} else if (pieces.length === 3 && pieces[2].charAt(0) === 'P') {
		interval = parseInterval(pieces[2]);
		start_date = moment(pieces[1]);
	}
	
	return new IsoFactory({
		start_date: start_date,
		end_date: end_date,
		interval: interval,
		repeats: repeat
	});
};
