const client = require('./client.js');
const utils = require('../utils.js');
const randomstring = require("randomstring");

const VALUE_SPACE = 100000;
const TEST_RUNS = 1000;
var MOCK_VAL = randomstring.generate(1000); // 100000 seems to be the max payload allowed for http

var start;

function run(total, current, callback) {
	if (current == total) {
		return callback();
		// return;
	}
	let r = utils.getRandomInt(0, 100);
	if (r < 20) {
		client.put(current, MOCK_VAL)
			.then( function(res) {
				return run(total, current + 1, callback)
			})
	} else {
		client.get(current)
			.then( function(res) {
				return run(total, current + 1, callback)
			})
	}
}

// init kvstore
client.init(function() {
	console.log('First pass starts');
	run(TEST_RUNS, 0, () => {
		console.log('Second pass starts');
		start = new Date();
		run(TEST_RUNS, 0, function() {
			var end = new Date() - start;
			console.info("Execution time: %dms", end);
			process.exit();
		});
	});
});
