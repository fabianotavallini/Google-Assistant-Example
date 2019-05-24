const _  = require('lodash');
const he = require('he');
const {
	BasicCard,
	Button,
	Suggestions,
	List,
	Carousel,
	BrowseCarousel,
	BrowseCarouselItem,
	Image
} = require('actions-on-google');

const SELECTABLE_LIST      = 'selectable_list';
const SELECTABLE_CAROUSEL  = 'selectable_carousel';
const BROWSE_CAROUSEL      = 'browse_carousel';

const SELECTION_KEY_PREFIX = 'SELECTION_KEY_';

const SELECTABLE_LIST_MAX_TILES     = 30;
const SELECTABLE_CAROUSEL_MAX_TILES = 10;

class Utils {

	/**
	 * Decide in base al dispositivo se pronunciare o mostrare visivamente i
	 * risultati all'utente
	 * @param  {Array<Object>} results risultati non formattati
	 * @param  {Object} conv    conversation
	 */
	static promptResult(conv, options) {
		if (_.isObject(options) && !options.results) {
			options = { results: options };
		}
		options = _.defaults(options || {}, {
			results:      null,
			previousText: null,
			afterText:    null,
			listType:     null
		})
		let results      = options.results;
		let previousText = options.previousText;
		let afterText    = options.afterText;
		if (!results || results.length == 0) return;
		if (!Array.isArray(results)) results = [results];

		if (this.hasScreen(conv)) {
			if (previousText) this.ask(conv, previousText);
			let assistantResults = results.map(r => _.isFunction(r.toAssistantResult) ? r.toAssistantResult() : r);
			this.showResult(conv, assistantResults, options.listType);
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
	static showResult(conv, results, listType = SELECTABLE_LIST) {
		if (!results || results.length == 0) {
			let msg = [
				conv.__('SHOW_RESULT_ERROR_01'),
				conv.__('SHOW_RESULT_ERROR_02'),
				conv.__('SHOW_RESULT_ERROR_03')
			];
			return this.ask(conv, this.pickFrom(msg));
		}
		if (results.length == 1) {
			let result = results[0];
			let basicCard = this.createBasicCard(result);
			return conv.ask(basicCard);
		}

		let list;
		switch(listType) {
			case SELECTABLE_LIST:     list = this.createSelectableList(results);     break;
			case SELECTABLE_CAROUSEL: list = this.createSelectableCarousel(results); break;
			case BROWSE_CAROUSEL:     list = this.createBrowseCarousel(results);     break;
		}
		if (list) {
			return conv.ask(list);
		}
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
		const defaults = {
			title:       '',
			subtitle:    '',
			text:        '',
			imageUrl:    global.env.DEFAULT_IMAGE_URL,
			imageText:   '',
			// buttonTitle: '',
			// buttonUrl:   global.env.SITE_URL
		};
		options = _.pick(options || {}, _.keys(defaults).concat(['buttonTitle', 'buttonUrl']));
		options = _.defaults(options || {}, defaults);
		let cardOptions = {
			title:    options.title,
			subtitle: options.subtitle,
			text:     options.text,
			image: {
				url:               options.imageUrl,
				accessibilityText: options.imageText || options.title,
			},
			display:  'CROPPED'
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
	 * Genera un risultato visivo per più risultati navigabili
	 * @param  {Object} options opzioni per costruire la card
	 * @return {BasicCard}
	 */
	static createBrowseCarousel(results) {
		let items = [];
		_.forEach(results, (aResult) => {
			let browseCarouselItem = this.createBrowseCarouselItem(aResult);
			items.push(browseCarouselItem);
		});
		this.makeTitlesUnique(items);
		return new BrowseCarousel({ items });
	}

	/**
	 * Genera un componente di un carosello di risultati navigabili
	 * @param  {Object} options opzioni per costruire il componente
	 * @return {BrowseCarouselItem}
	 */
	static createBrowseCarouselItem(options) {
		const defaults = {
			title:       '',
			url:         global.env.SITE_URL,
			description: '',
			imageUrl:    global.env.DEFAULT_IMAGE_URL,
			imageText:   '',
			footer:      ''
		};
		options = _.pick(options || {}, _.keys(defaults));
		options = _.defaults(options || {}, defaults);
		return new BrowseCarouselItem({
			title:       options.title,
			url:         options.url,
			description: options.description,
			image:       new Image({
							url: options.imageUrl,
							alt: options.imageText || options.title
						 }),
			footer:      options.footer
		});
	}

	/**
	 * Genera una lista per più risultati selezionabili
	 * @param  {Object} options opzioni per costruire la lista
	 * @return {List}
	 */
	static createSelectableList(results) {
		let items = {};
		results = (results || []).slice(0, SELECTABLE_LIST_MAX_TILES);
		_.forEach(results, (aResult) => {
			let selectableListItem = this.createSelectableItem(aResult);
			items = _.extend(items, selectableListItem);
		});
		this.makeTitlesUnique(items);
		return new List({ items });
	}

	/**
	 * Genera un carosello per più risultati selezionabili
	 * @param  {Object} options opzioni per costruire la lista
	 * @return {Carousel}
	 */
	static createSelectableCarousel(results) {
		let items = {};
		results = (results || []).slice(0, SELECTABLE_CAROUSEL_MAX_TILES);
		_.forEach(results, (aResult) => {
			let selectableListItem = this.createSelectableItem(aResult);
			items = _.extend(items, selectableListItem);
		});
		this.makeTitlesUnique(items);
		return new Carousel({ items });
	}

	/**
	 * Genera un componente di una lista di risultati selezionabili
	 * @param  {Object} options opzioni per costruire il componente
	 * @return {BrowseCarouselItem}
	 */
	static createSelectableItem(options) {
		let keyAttribute = options.id || options.code || options.title || '';
		const itemKey = SELECTION_KEY_PREFIX + (keyAttribute + '').toUpperCase().replace(/ /g, '_');
		const defaults = {
			title:       '',
			description: '',
			imageUrl:    global.env.DEFAULT_IMAGE_URL,
			imageText:   ''
		};
		options = _.pick(options || {}, _.keys(defaults));
		options = _.defaults(options || {}, defaults);
		const itemValue = {
			title:       options.title,
			description: options.description,
			image:       new Image({
							url: options.imageUrl,
							alt: options.imageText || options.title
						 })
		};
		return { [itemKey]: itemValue }
	}

	static parseSelectionKey(selectionKey) {
		return (selectionKey || '').replace(SELECTION_KEY_PREFIX, '');
	}

	static makeTitlesUnique(items) {
		_.forEach(items, (anItem) => {
			let match = _.filter(items, (it) => it.title == anItem.title);
			if (match.length > 1) {
				console.warn(`Not unique titles found prompting resuts, a numeric identifier has been added to prevent crash. \n Title: "${anItem.title}""`);
				_.forEach(match, (aMatch, i) => {
					aMatch.title += ` (${i+1})`;
				});
			}
		});
		return items;
	}

	/**
	 * Presenta i suggerimenti sulle funzioni a disposizione. In base al dispositivo
	 * genera dell'audio o dei suggerimenti visisvi.
	 * @param  {Object}  conv       conversation
	 * @param  {Boolean} [explain=false] flag per spiegare il contesto o meno
	 */
	static promptSuggestions(conv, explain = false) {
		let msg = '';

		if (explain) {
			let desc = this.pickFrom([
				conv.__('SUGGESTION_DESCRIPTION_01'),
				conv.__('SUGGESTION_DESCRIPTION_02'),
				conv.__('SUGGESTION_DESCRIPTION_03'),
			]);
			msg += `<prosody rate="95%">${desc}</prosody>`;
			// this.ask(conv, desc, 105);
		}

		let ask = this.pickFrom([
			conv.__('SUGGESTION_ASK_01'),
			conv.__('SUGGESTION_ASK_02'),
			conv.__('SUGGESTION_ASK_03'),
		]);
		msg += ask;
		// msg += `<prosody rate="110%">${ask}</prosody>`;
		// conv.ask(`<speak>${msg}</speak>`);
		this.ask(conv, msg, 110);

		// Device with screen
		if (this.hasScreen(conv)) {
			conv.ask(new Suggestions([conv.__('PROMPT_SUGGESTION_CHIP')]));
		}
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
			subtitle:    global.env.DISPLAY_SITE_URL,
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
	static sanitize(input, decodeHTML = true) {
		let result = this.stripTags((input || '').replace(/(<br>|< br>|<br >|<br \/>|<br\/>)/g, '\n'));
		if (decodeHTML) result = he.decode(result);
		return result;
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
		msg = msg.replace(/il viaggiator goloso/gi, '<sub alias="Il viaggia thoor goloso">Il Viaggiator Goloso</sub>');
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
Utils.SELECTABLE_LIST     = SELECTABLE_LIST;
Utils.SELECTABLE_CAROUSEL = SELECTABLE_CAROUSEL;
Utils.BROWSE_CAROUSEL     = BROWSE_CAROUSEL;
