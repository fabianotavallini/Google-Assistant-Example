const _      = require('underscore');
const moment = require('moment');
const Utils  = require('../utils/Utils');

class Product {

	constructor(options) {
		if (typeof options == 'string') {
			options = { name: options };
		}
		options = _.defaults(options || {}, {
			name: ''
		});
		_.forEach(options || {}, (opt, name) => this[name] = opt);
	}

	setName(name) {
		this.name = name;
	}

	getName() {
		return this.name;
	}
}

module.exports = Product;
