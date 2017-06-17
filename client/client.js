const fetch = require('node-fetch');
const schedule = require('node-schedule');
const sha1 = require('sha1');
const utils = require('../utils.js');
const config = require('../config.json');

const URL = 'http://192.168.0.14:3000/api/';
// const URL = 'http://54.190.44.24:3000/api/';
const PREFIX_LEN = Number(config.prefix_len);
const USING_INVALIDATION_MODE = 
	(config.notification_mode == 'INVALIDATION');

const _HEADER = {
	'Accept': 'application/json',
	'Content-Type': 'application/json',
};

global.cache = {};
global.sessionExpire = true;
global.timeLatestWriteKnown = null;
var principalId = process.argv[2];

function _prefixesScan() {
	let ret = {};
	for (let k in cache) {
		let prefix = k.substring(0, PREFIX_LEN);
		ret[prefix] = true;
	}
	return ret;
}

function _renewLease(callback) {

	function recurse() {
		let retry = new Date();
		retry.setSeconds(retry.getSeconds() + config.retry_delay_sec);
		schedule.scheduleJob(retry, () => _renewLease() );
	}

	// console.log('Renewing lease');
	let body = {
		principalId: principalId,
		recoveryMode: sessionExpire,
		timeLatestWriteKnown: timeLatestWriteKnown,
		// prefixCached: _prefixesScan(),
	}
	// console.log(body);
	// if (sessionExpire) console.time('recovery')
	fetch(URL + 'lease', {
		method: 'POST',
		headers: _HEADER,
		body: JSON.stringify(body),
		timeout: Number(config.session_timeout_sec) * 1000,
	}).then(function(response) {
		response.json().then(function(responseJson) {
			// console.log(responseJson);
			// if (sessionExpire) console.timeEnd('recovery')
			for (let key in responseJson) {
				if (responseJson[key].timeStamp > timeLatestWriteKnown)
					timeLatestWriteKnown = responseJson[key].timeStamp;
				if (cache[key]) {
					if (USING_INVALIDATION_MODE) {
						cache[key] = undefined;
					} else { // update mode, server replier with updated values
						cache[key] = responseJson[key]; //{key: val, key2: valu2, ...}
					}
				}
			}
			sessionExpire = false;
			if (callback) callback();
			recurse();
		});
	}).catch(function(err) {
		console.log(err.message);
		sessionExpire = true;
		// retry after a while
		if (callback) callback();
		recurse();
	})
}

const external = {
	init: function(callback) {
		_renewLease(callback);
	},
	get: function(key) {
		key = sha1(key);
		// cache hit
		if (cache[key]) {
			let found = utils.buildJson(key, cache[key], sessionExpire);
			// utils.log('hit', found);
			return new Promise( (resolve, reject) => {
      	return resolve(found);
      });
		}
		// read from remote
		// console.log('>> miss ' + key);
		return fetch(URL + key + '/' + principalId, {
			method: 'GET',
			headers: _HEADER,
		}).then(function(response) {
			return response.json();
		}).then(function(responseJson) {
			cache[responseJson.key] = responseJson.value;
			return responseJson;
		});
	},
	put: function(key, value) {
		key = sha1(key);
		if (sessionExpire)
			throw new Error('Session broken')
		value = {
			value: value,
			timeStamp: new Date(),
		};
		cache[key] = value;
		let body = utils.buildJson(key, value);
		return fetch(URL + principalId, {
			method: 'PUT',
			body: JSON.stringify(body),
			headers: _HEADER,
		}).then(function(response) {
			return response.json();
		}).then(function(responseJson) {
			return responseJson;
		});
	},
	_cache: function() {
		console.log(cache);
	},
	_mute: function(principalId) {
		return fetch(URL + 'mute/' + principalId, {
			method: 'POST',
			headers: _HEADER,
		})
	},
	_unmute: function(principalId) {
		return fetch(URL + 'unmute/' + principalId, {
			method: 'POST',
			headers: _HEADER,
		})
	},
	_purgeAndRefresh: function() {
		var start = new Date();
		return fetch(URL + 'clientPurge', {
			method: 'POST',
			body: JSON.stringify(cache),
			headers: _HEADER,
		}).then(function(response) {
			return response.json();
		}).then(function(responseJson) {
			for (let k in responseJson) {
				cache[k] = responseJson[k];
			}
			var end = new Date() - start;
			console.info("Execution time: %dms", end);
			return responseJson;
		});
	},
};

module.exports = external;
