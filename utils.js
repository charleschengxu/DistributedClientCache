const utils = {
	/**
	 * Build a standard response json object from arguments
	 * @param  {Object} key
	 * @param  {String} value
	 * @param  {Boolean} sessionExpire
	 * @return {Object} json
	 */
	buildJson: function(key, value, sessionExpire) {
		return {
			key: key,
			value: value,
			sessionExpire: sessionExpire,
		};
	},
	/**
	 * @param  {Number} min lowerbound
	 * @param  {Number} max upperbound
	 * @return {Integer} min <= return < max
	 */
	getRandomInt: function (min, max) {
	  min = Math.ceil(min);
	  max = Math.floor(max);
	  return Math.floor(Math.random() * (max - min)) + min;
	},
	/**
	 * Logs an action on either server or client side
	 * @param  {String} verb    describes the action performed
	 * @param  {Object} jsonObj argument of the action
	 */
	log: function (verb, jsonObj) {
		console.log('>> ' + verb + ' ' + JSON.stringify(jsonObj));
	}
};

module.exports = utils;
