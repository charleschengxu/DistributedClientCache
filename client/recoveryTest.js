const client = require('./client.js');
const utils = require('../utils.js');
const config = require('../config.json');

const OFFSET = Number(config.offset);

function run(total, current) {
	if (current - OFFSET == total) return;
	client.get(current)
		.then(function(res) {
			return run(total, current + 1)
		})
}

// init kvstore
client.init(function() {
	run(1500, 0 + OFFSET);
});