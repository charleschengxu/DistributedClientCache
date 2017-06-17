const express = require('express');
const router = express.Router();
const schedule = require('node-schedule');
const _ = require('lodash')
const utils = require('./utils.js');
const config = require('./config.json');

const PREFIX_LEN = Number(process.argv[2]);
const USING_INVALIDATION_MODE = 
	(config.notification_mode == 'INVALIDATION');
global.muteClients = new Set();
global.updateMsgCount = 0;

global.kvstore = {};
global.subscriptions = {}; // prefix -> new Set();
global.prefixBuffers = {}; // timestamp -> key;

/**
 * {
 * 	 principalIdAlice: {
 * 		 buf: {},
 * 		 res: res object from client,
 *   },
 * 	 principalIdBob: {
 * 		 buf: {},
 * 		 res: res object from client,
 *   },  ...
 * }
 */
global.connectionPool = {};

function _reply(principalId) {
	// console.log('>> reply to ' + principalId);
	let conn = connectionPool[principalId];
	if (conn.res && !muteClients.has(principalId)) {
		conn.res.json(conn.buf)
	}
	conn.buf = {};
	conn.res = undefined;
}

/**
 * GET the value given the key in request PATH.
 * @return {Oject} a json object as the key-value pair
 */
router.get('/:key/:principalId', (req, res) => {
	let key = String(req.params.key);
	// reply immediately
	res.json(utils.buildJson(key, kvstore[key]));
	// put client to subscription list
	let prefix = key.substring(0, PREFIX_LEN);
	let readerId = req.params.principalId;
	if (!subscriptions[prefix])
		subscriptions[prefix] = new Set();
	if (!subscriptions[prefix].has(readerId))
		subscriptions[prefix].add(readerId);
	// utils.log('read', req.body);
});

/**
 * PUT a key-value pair from the request BODY into the kv store.
 * Override old value if key already exists.
 * @return {Oject} a json object as the key-value pair
 */
router.put('/:principalId', (req, res) => {
	let key = String(req.body.key);
	kvstore[key] = req.body.value;
	// reply immediately
	res.json(utils.buildJson(key, kvstore[key]));
	// invalidate subscribers cache
	let prefix = key.substring(0, PREFIX_LEN);
	// put the writer on subscription list
	let writerId = req.params.principalId;
	if (!subscriptions[prefix])
		subscriptions[prefix] = new Set();
	if (!subscriptions[prefix].has(writerId))
		subscriptions[prefix].add(writerId);
	// notify stale clients
	if (subscriptions[prefix]) {
		subscriptions[prefix].forEach(function(readerId) {
			if (writerId == readerId) return;
			updateMsgCount++;
			if (USING_INVALIDATION_MODE) {
				connectionPool[readerId].buf[key] = 'INVALIDATION';
			} else { // update mode, push new values to clients
				connectionPool[readerId].buf[key] = kvstore[key];
			}
			// used for fast recovery
			if (!prefixBuffers[prefix]) prefixBuffers[prefix] = {};
			prefixBuffers[prefix][req.body.value.timeStamp] = key;
			_reply(readerId);
		});
	}
	// utils.log('write', req.body);
});

function buildRecoveryResponse(prefix, timeLatestWriteKnown, response) {
	let pbuf = prefixBuffers[prefix];
	for (let t in pbuf) {
		if (t < timeLatestWriteKnown) continue;
		let k = pbuf[t];
		response[k] = kvstore[k];
	}
}

/**
 * Renew session lease. Implemented as open rpc.
 * @return {Oject} a json object as the key-value pair
 */
router.post('/lease', (req, res) => {
	let id = req.body.principalId;
	let recoveryMode = req.body.recoveryMode;
	if (!connectionPool[id]) {
		connectionPool[id] = {
			buf: {},
			res: res,
		};
	} else if (_.isEmpty(connectionPool[id].buf)) {
		connectionPool[id].res = res;
		// if (recoveryMode && req.body.prefixCached) {
		// 	let response = {};
		// 	for(let prefix in req.body.prefixCached) {
		// 		buildRecoveryResponse(prefix, req.body.timeLatestWriteKnown, response);
		// 	}
		// 	connectionPool[id].buf = response;
		// 	_reply(id);
		// }
	} else {
		_reply(id);
		return
	}
	// reply in half the session lease
	let expiration = new Date();
	expiration.setSeconds(expiration.getSeconds() + config.session_timeout_sec / 2);
	schedule.scheduleJob(expiration, () => _reply(id));
});

router.post('/mute/:clientId', (req, res) => {
	let id = req.params.clientId
	if (!muteClients.has(id))
		muteClients.add(id);
	res.json('Done')
})

router.post('/unmute/:clientId', (req, res) => {
	let id = req.params.clientId
	if (muteClients.has(id))
		muteClients.delete(id);
	res.json('Done')
})

router.post('/clientPurge', (req, res) => {
	let cache = req.body;
	let ret = {};
	for (let k in cache) {
		ret[k] = kvstore[k];
	}
	res.json(ret)
})

router.get('/stat', (req, res) => {
	let subsptnNumEntries = 0;
	for (let prefix in subscriptions) {
		subsptnNumEntries += subscriptions[prefix].size;
	}
	res.json({
		subsptnNumEntries: subsptnNumEntries,
		updateMsgCount: updateMsgCount,
	})
})

module.exports = router;
