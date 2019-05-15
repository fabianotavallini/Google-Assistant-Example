const _        = require('underscore');
const request  = require('request');
const Utils    = require('../utils/Utils');

class AuthController {

	static authUrl() {
		return Utils.composeUrl(global.env.SERVICE_URL, '/user');
	}

	/**
	 * Metodo che esegue fisicamente la chiamata REST ai servizi ServiceNow
	 * @return {Promise<Object>} Promise del cookie di autenticazione
	 */
	static retrieveAuthCookie() {
		return new Promise((resolve, reject) => {
			let url = this.authUrl();
			request.get({
				url: url,
				headers: {
 					'Accept': 'application/json'
 				},
				auth: {
					user: global.env.SERVICE_USERNAME,
					pass: global.env.SERVICE_PASSWORD
				},
 				qs: {
 					user_name: global.env.SERVICE_USERNAME,
					sysparm_fields: 'user_name,first_name,last_name,sys_id,last_login_time'
 				}
			}, (err, httpResponse, body) => {
				try {
					body = JSON.parse(body);
				} catch(exc) {
					return reject(exc);
				}
				if (err || body.error || body.errors) return reject(err || body.error || body.errors);
				if (!httpResponse.headers['set-cookie']) return reject("Authentication cookies not found in HTTP response headers from " + url);
				resolve(httpResponse.headers['set-cookie']);
			});
		});
	};

	/**
	 * Restituisce una promise che viene completata al termine della chiamata di
	 * login, quando la conversazione contiene i cookie di autenticazione per le
	 * chiamate successive
	 * @param  {Object} conv conversazione
	 * @return {Promise<void>}
	 */
	static login(conv) {
		return new Promise((resolve, reject) => {
			this.retrieveAuthCookie().then((cookie) => {
				conv.data.authCookie = cookie;
				// console.log("--> authCookie (conv.data):", conv.data.authCookie);
				resolve();
			}).catch(err => {
				conv.data.authCookie = null; // Svuoto l'authentication cookie
				console.error('Error in function getAnonymousCookie:');
				console.error(err || 'Unknown error retrieving authentication cookie');
				resolve();
			});
		})
	};
}

module.exports = AuthController;
