const AuthController = require('../controllers/AuthController');
const Utils          = require('../utils/Utils');

class BasicIntents {

	static defaultWelcome(conv) {
		return AuthController.login(conv).then(() => {
			let msg = conv.user.last.seen ? conv.__('WELCOME_USER_COMEBACK') : conv.__('WELCOME_USER_DEFAULT');
			// <emphasis level="strong">${msg}</emphasis>
			conv.ask(`<speak>
				<prosody rate="105%" pitch="+10%">${msg}</prosody>
				</speak>`);
			Utils.promptSuggestions(conv);
		});
	}

	static deepLinkFallback(conv, { any })  {
		let msg = Utils.pickFrom([
			conv.__('DEEP_LINK_FALLBACK_01', { any }),
			conv.__('DEEP_LINK_FALLBACK_02', { any }),
			conv.__('DEEP_LINK_FALLBACK_03')
		]);
		Utils.ask(conv, msg);
		Utils.promptSuggestions(conv);
	}

	static defaultFallback(conv) {
		let msg = Utils.pickFrom([
			conv.__('DEFAULT_FALLBACK_01'),
			conv.__('DEFAULT_FALLBACK_02'),
			conv.__('DEFAULT_FALLBACK_03')
		]);
		Utils.ask(conv, msg);
		Utils.promptSuggestions(conv);
	}

	static defaultConversationExit(conv) {
		let msg = Utils.pickFrom([
			conv.__('DEFAULT_CONVERSATION_EXIT_01'),
			conv.__('DEFAULT_CONVERSATION_EXIT_02'),
			conv.__('DEFAULT_CONVERSATION_EXIT_03')
		]);
		return Utils.close(conv, msg);
	}

	static conversationExit(conv) {
		let basicCard = Utils.createBasicCard({
			title:       conv.__('CONVERSATION_EXIT_TITLE'),
			subtitle:    'www.leroymerlin.it',
			imageUrl:    global.env.DEFAULT_IMAGE_URL,
			buttonTitle: conv.__('CONVERSATION_EXIT_BUTTON'),
			buttonUrl:   global.env.SITE_URL
		});
		let msg = Utils.pickFrom([
			conv.__('CONVERSATION_EXIT_MESSAGE_01'),
			conv.__('CONVERSATION_EXIT_MESSAGE_02'),
			conv.__('CONVERSATION_EXIT_MESSAGE_03')
		]);
		Utils.ask(conv, msg);
		return conv.close(basicCard);
	}
}

module.exports = BasicIntents;
