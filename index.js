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
	this.config = conf;
}

IsoFactory.prototype.next = function(timestamp) {
	if (typeof this.config.interval !== 'object') {
		return NaN;
	}
	
	var ret = moment(timestamp);	
	
	if (ret.isValid() === false || ret > this.config.end_date) {
		return NaN;
	}
	
	ret.add(this.config.years, 'years');
	ret.add(this.config.months, 'months');
	ret.add(this.config.days, 'days');
	ret.add(this.config.hours, 'hours');
	ret.add(this.config.minutes, 'minutes');
	ret.add(this.config.seconds, 'seconds');
	
	if (ret > this.config.end_date) { 
		return NaN;
	}
	
	return ret.unix();
};

IsoFactory.prototype.previous = function(timestamp) {
	if (typeof this.config.interval !== 'object') {
		return NaN;
	}
	
	var ret = moment(timestamp);
	
	if (ret.isValid() === false || ret < this.config.start_date) {
		return NaN;
	}
	
	ret.subtract(this.config.years, 'years');
	ret.subtract(this.config.months, 'months');
	ret.subtract(this.config.days, 'days');
	ret.subtract(this.config.hours, 'hours');
	ret.subtract(this.config.minutes, 'minutes');
	ret.subtract(this.config.seconds, 'seconds');
	
	if (ret < this.config.start_date) { 
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
