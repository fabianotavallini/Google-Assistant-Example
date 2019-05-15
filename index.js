'use strict';

// Globals
global.env              = require('./config.json');
const moment            = require('moment');
const functions         = require('firebase-functions');
const BasicIntents      = require('./lib/intents/BasicIntents');
// const ProductIntents      = require('./lib/intents/ProductIntents');
const i18n              = require('./lib/utils/i18n');

// Import the Dialogflow module from the Actions on Google client library
const { dialogflow } = require('actions-on-google');

// Instantiate the Dialogflow client
const app = dialogflow({
	debug: false, // Stampa i log di informazioni nella cloud function
	// clientId: global.env.ACTIONS_CLIENT_ID
});

// Locales config
i18n.configure({
	directory: `${__dirname}/locales`,
	defaultFile: `${__dirname}/locales/it-IT.json`,
	defaultLocale: 'it-IT',
}).use(app);

moment.locale('it');

// IMPORTANT NOTE: intents must be defined in Dialogflow first!

// Basic intents
app.intent('default-welcome',           BasicIntents.defaultWelcome);
app.intent('deep-link-fallback',        BasicIntents.deepLinkFallback);
app.intent('default-fallback',          BasicIntents.defaultFallback);
app.intent('default-conversation-exit', BasicIntents.defaultConversationExit);
app.intent('conversation-exit',         BasicIntents.conversationExit);

// Custom intents
// app.intent('search-product',            ProductIntents.searchProduct);

// Set the DialogflowApp object to handle the HTTPS POST request
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
