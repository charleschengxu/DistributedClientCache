const client = require('./client.js');
const utils = require('../utils.js');
const config = require('../config.json');

const SIZE = 1000;
const VALUE_SPACE = 100000;
// const OFFSET = Number(config.offset);
const TEST_RUNS = 100;

// // init kvstore
// client.init(function() {
// 	for (let i = 0 + OFFSET; i < SIZE + OFFSET; i++) {
// 		client.put(i, utils.getRandomInt(0, VALUE_SPACE))
// 		.then(function(res) {
// 			if (i == SIZE + OFFSET - 1) {
// 				// client._purgeAndRefresh().then(function(res) {
// 					process.exit();
// 				// })
// 			}
// 		})
// 		.catch(function(err) {
// 			console.log(err.message);
// 		});
// 	}
// });

function run(total, current) {
	if (current == total) process.exit();
	client.put(current, utils.getRandomInt(0, VALUE_SPACE))
		.then( function(res) {
			return run(total, current + 1)
		})
		.catch(function(err) {
			console.log(err.message);
		});
}

// init kvstore
client.init(function() {
	run(TEST_RUNS, 0);
});

