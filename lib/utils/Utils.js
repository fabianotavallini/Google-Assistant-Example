const _ = require('underscore');
const {
	BasicCard,
	Button,
	Suggestions,
	List,
	BrowseCarouselItem,
	Image
} = require('actions-on-google');

class Utils {

	/**
	 * Decide in base al dispositivo se pronunciare o mostrare visivamente i
	 * risultati all'utente
	 * @param  {Array<Object>} results risultati non formattati
	 * @param  {Object} conv    conversation
	 */
	static promptResult(conv, results, previousText, afterText) {
		if (!results || results.length == 0) return;
		if (!Array.isArray(results)) results = [results];

		if (this.hasScreen(conv)) {
			if (previousText) this.ask(conv, previousText);
			let assistantResults = results.map(r => _.isFunction(r.toAssistantResult) ? r.toAssistantResult() : r);
			this.showResult(conv, assistantResults);
			if (afterText) this.ask(conv, afterText);
		} else {
			let vocalResults = results.map(r => _.isFunction(r.toVocal) ? r.toVocal() : r);
			return this.sayResult(conv, vocalResults, previousText, afterText);
		}
	}

	/**
	 * Mostra i risultati formattati all'utente
	 * @param  {Array<Object>} results risultati formattati
	 * @param  {Object} conv    conversation
	 */
	static showResult(conv, results) {
		if (results.length == 1) {
			let el = results[0];
			let basicCard = this.createBasicCard(_.pick(el,
				'title',
				'subtitle',
				'text',
				'imageUrl',
				'imageText',
				'buttonUrl',
				'buttonTitle'
			));
			return conv.ask(basicCard);
		}

		let result = results[0];

		if (result.items.length == 0) {
			let msg = [
				conv.__('SHOW_RESULT_ERROR_01'),
				conv.__('SHOW_RESULT_ERROR_02'),
				conv.__('SHOW_RESULT_ERROR_03')
			];
			return this.ask(conv, this.pickFrom(msg));
		}

		return conv.ask(new List(result));
	}

	/**
	 * Pronuncia i risultati formattati all'utente
	 * @param  {Array<Object>} results risultati formattati
	 * @param  {Object} conv    conversation
	 */
	static sayResult(conv, results, previousText, afterText) {
		let msg = '';

		if (results.length == 1) {
			let el = results[0];
			if (el) msg += el;
		} else {
			_.forEach(results, (el) => {
				msg += el;
			});
		}

		if (previousText) msg = previousText + '\n' + msg;
		msg = `<speak>${msg}</speak>`;
		conv.ask(msg);
		if (afterText) this.ask(conv, afterText);
	}

	/**
	 * Genera un risultato visivo per un risultato singolo
	 * @param  {Object} options opzioni per costruire la card
	 * @return {BasicCard}
	 */
	static createBasicCard(options) {
		options = _.defaults(options || {}, {
			title:       '',
			subtitle:    '',
			text:        '',
			imageUrl:    global.env.DEFAULT_IMAGE_URL,
			imageText:   '',
			// buttonTitle: 'Apri su Unieuro',
			// buttonUrl:   global.env.SITE_URL
		});
		let cardOptions = {
			title: options.title,
			subtitle: options.subtitle,
			text: options.text,
			image: {
				url: options.imageUrl,
				accessibilityText: options.imageText || options.title,
			},
			display: 'CROPPED'
		};

		if (options.buttonTitle && options.buttonUrl &&
			options.buttonTitle.length > 3 && options.buttonUrl.length > 3) {
			cardOptions['buttons'] = new Button({
				title: options.buttonTitle,
				url: options.buttonUrl,
			});
		}
		return new BasicCard(cardOptions);
	}

	/**
	 * Genera un risultato visivo per più risultati
	 * @param  {Object} options opzioni per costruire il carosello/lista
	 * @return {BrowseCarouselItem}
	 */
	static createBrowseCarouselItem(options) {
		options = _.defaults(options || {}, {
			title:       '',
			url:         global.env.SITE_URL,
			description: '',
			imageUrl:    global.env.DEFAULT_IMAGE_URL,
			imageText:   '',
			footer:      ''
		});
		return new BrowseCarouselItem({
			title: options.title,
			url: options.url,
			description: options.description,
			image: new Image({
				url: options.imageUrl,
				alt: options.imageText || options.title
			}),
			footer: options.footer
		});
	}

	/**
	 * Presenta i suggerimenti sulle funzioni a disposizione. In base al dispositivo
	 * genera dell'audio o dei suggerimenti visisvi. Il parametro ask determina se
	 * deve anche fare la domanda per presentare le opzioni. Se ask è false allora
	 * non viene fatta la domanda e sui dispositivi con display vengono mostrati
	 * solo i suggerimenti rapidi.
	 * @param  {Object}  conv       conversation
	 * @param  {Boolean} [ask=true] flag per fare la domanda o meno
	 */
	static promptSuggestions(conv, ask = true) {
		let msg = '';

		let desc = this.pickFrom([
			conv.__('SUGGESTION_DESCRIPTION_01'),
			conv.__('SUGGESTION_DESCRIPTION_02'),
			conv.__('SUGGESTION_DESCRIPTION_03'),
		]);
		msg += `<prosody rate="115%">${desc}</prosody>`;

		if (ask) {
			let question = this.pickFrom([
				conv.__('IDENTIFY_CALLER_01'),
				conv.__('IDENTIFY_CALLER_02'),
				conv.__('IDENTIFY_CALLER_03')
			]);
			msg += `<prosody rate="110%">${question}</prosody>`;
			// msg += ' \n';
		}

		conv.contexts.set('identify-caller', 1);

		conv.ask(`<speak>${msg}</speak>`);

		// Device with screen
		// if (this.hasScreen(conv)) {
		// 	conv.ask(new Suggestions([conv.__('PROMPT_SUGGESTION_CHIP')]));
		// }
	}

	/**
	 * Presenta i suggerimenti per le interazioni alla fine della conversazione
	 * @param  {Object} conv conversation
	 */
	static promptEndingSuggestions(conv) {
		// Device with screen
		if (this.hasScreen(conv)) {
			conv.ask(new Suggestions([
				conv.__('PROMPT_SUGGESTION_CHIP_ANOTHER_INCIDENT'),
				conv.__('PROMPT_SUGGESTION_CHIP_EXIT')
			]));
		}
	}

	/**
	 * Presenta il messaggio da parametro affiancato da una domanda aggiuntiva
	 * per invitare l'utente a proseguire la navigazione sul sito o sull'app.
	 * Presenta inoltre una card con il link al sito.
	 * @param  {Object}  conv       conversation
	 */
	static promptNavigateToEcommerce(conv, msg) {
		if (!msg || !_.isString(msg)) msg = '';
		else msg += ' ';

		msg += this.pickFrom([
			conv.__('PROMPT_NAVIGATE_TO_ECOMMERCE_01'),
			conv.__('PROMPT_NAVIGATE_TO_ECOMMERCE_02'),
			conv.__('PROMPT_NAVIGATE_TO_ECOMMERCE_03')
		]);
		let basicCard = Utils.createBasicCard({
			title:       conv.__('PROMPT_NAVIGATE_TO_ECOMMERCE_TITLE'),
			subtitle:    'www.soprasteria.it',
			imageUrl:    global.env.DEFAULT_IMAGE_URL,
			buttonTitle: conv.__('PROMPT_NAVIGATE_TO_ECOMMERCE_MESSAGE'),
			buttonUrl:   global.env.SITE_URL
		});

		this.ask(conv, msg);
		return conv.ask(basicCard);
	}

	/**
	 * Indica se il dispositivo è provvisto di display
	 * @param  {Object}  conv conversation
	 * @return {Boolean}
	 */
	static hasScreen(conv) {
		return conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT');
	}

	/**
	 * Rimuove i tag da una stringa
	 * @param  {String} input
	 * @param  {String} allowed
	 * @return {String}
	 */
	static stripTags(input, allowed) {
		// making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
		allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('')

		var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi
		var commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi

		return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
			return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : ''
		});
	}

	/**
	 * Rimuove gli spazi creati con tag <br> da una stringa da presentare a video
	 * @param  {String} input stringa di partenza
	 * @return {String}       stringa ripulita
	 */
	static sanitize(input) {
		return this.stripTags((input || '').replace(/(<br>|< br>|<br >|<br \/>|<br\/>)/g, '\n'));
	}

	/**
	 * Restituisce la porzione di SSML da inserire in un tag <speak>
	 * @param  {String} tts text to speech in SSML
	 * @return {String}     SSML senza <speak>
	 */
	static getVocalFromSSML(tts) {
		return (tts || '').replace(/(<speak>|<\/speak>)/g, '');
	}

	/**
	 * Esegue la funzione conv.ask() aggiungendo una velocità di pronuncia
	 * @param  {Object} conv       conversation
	 * @param  {String} msg        messaggio iniziale
	 * @param  {Number} [rate=110] velocità di pronuncia in percentuale, default 100
	 */
	static ask(conv, msg, rate = 110) {
		if (!conv || !conv.ask) return console.error('Conversation object not fount in function Utils.ask(conv, msg, rate)');
		return conv.ask(`<speak><prosody rate="${rate}%">${msg}</prosody></speak>`);
	}

	/**
	 * Esegue la funzione conv.close() aggiungendo una velocità di pronuncia
	 * @param  {Object} conv       conversation
	 * @param  {String} msg        messaggio iniziale
	 * @param  {Number} [rate=110] velocità di pronuncia in percentuale, default 100
	 */
	static close(conv, msg, rate = 110) {
		return conv.close(`<speak><prosody rate="${rate}%">${msg}</prosody></speak>`);
	}

	/**
	 * Concatena la base di un url con un url parziale per ottenere una risorsa
	 * @param  {String} url1 url di base
	 * @param  {String} url2 percorso della risorsa
	 * @return {String}      url completo
	 */
	static composeUrl(url1, url2) {
		if (url1.charAt(url1.length - 1) != '/' && url2.charAt(0) != '/') {
			url1 += '/'; // Add a '/' between if necessary
		}
		return (url1 + url2).replace(/[^:]\/{2}/g, '/'); // Replace double '/' except from 'https://'
	}

	/**
	 * Sceglie casualmente un messaggio da un array di stringhe
	 * @param  {Array<String>} messages array dei messaggi possibili
	 * @return {String}                 messaggio scelto casualmente
	 */
	static pickFrom(messages) {
		return messages[Math.floor(Math.random() * messages.length)];
	}
}

module.exports = Utils;
