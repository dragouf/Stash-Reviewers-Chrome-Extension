const extensionStorage = (function() { // eslint-disable-line no-unused-vars
	'use strict';

	const REVIEWERS_KEY = 'stashplugin.groups_reviewers';
	const REVIEWERS_ARRAY_KEY = 'stashplugin.reviewers_array';
	const REVIEWERS_URL_KEY = 'stashplugin.reviewers_url';
	const HIPCHAT_KEY = 'stashplugin.hipchat';
	const TEMPLATE_KEY = 'stashplugin.template';
	const TEMPLATE_URL_KEY = 'stashplugin.template_url';
	const BACKGROUNDSTATE_KEY = 'stashplugin.backgroundstate';
	const NOTIFSTATE_KEY = 'stashplugin.notifstate';
	const NOTIFTYPE_KEY = 'stashplugin.notiftype';
	const REPOMAP_KEY = 'stashplugin.repomap';
	const FEATURES_KEY = 'stashplugin.features';

	const defaultFeatures = {
		reviewersgroup: true,
		prfilters: true,
		notifIcon: true,
		checkout: true,
		clickbranch: true,
		sticker: true,
		build: false,
		pa: true,
		forkorigin: true,
		prtemplate: true,
		prconflicts: true,
		checkversion: true
	};

	let cloudStorage = chrome.storage.sync;
	// missing api in firefox
	if(typeof chrome === 'undefined' || typeof chrome.storage === 'undefined' || typeof chrome.storage.sync === 'undefined') {
		const store = typeof chrome === 'undefined' && typeof browser !== 'undefined' ? browser : chrome;
		cloudStorage = typeof store !== 'undefined' ? store.storage.local : typeof storage !== 'undefined' ? storage.local : null;
		if (typeof cloudStorage === 'undefined') {
			throw 'No storage available';
		}
	}

	const storagePromised = {
		set(items) {
			return new Promise((resolve, reject) => {
				cloudStorage.set(items, () => {
					const err = chrome.runtime.lastError
					if (err) {
						reject(err)
					} else {
						resolve(items)
					}
				})
			})
		},
		get(keys = null) {
			return new Promise((resolve, reject) => {
				cloudStorage.get(keys, (items) => {
					const err = chrome.runtime.lastError
					if (err) {
						reject(err)
					} else {
						resolve(items)
					}
				})
			})
		}
	}

	/**
		@method
		@memberof storage
		@see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.set}
	*/
	function saveGroups(string) {
		const data = {};
		data[REVIEWERS_KEY] = string;
		return storagePromised.set(data);
	}

	function loadDefaultGroups() {
		return fetch(chrome.extension.getURL('/js/default.json'))
			.then(res => res.text())
	}

	function loadGroups() {
		return storagePromised.get().then(function(items) {
			if (!items) {
				return loadDefaultGroups()
			}
			const groups = items[REVIEWERS_KEY];
			const urls = items[REVIEWERS_URL_KEY];
			if(!groups && (!urls || urls.length === 0)) {
				return loadDefaultGroups()
			}
			else {
				return groups;
			}
		})
	}

	function saveGroupsArray(array) {
		const data = {};
		data[REVIEWERS_ARRAY_KEY] = JSON.stringify(array);
		return storagePromised.set(data);
	}

	function loadGroupsArray() {
		return storagePromised.get()
			.then(function(items) {
				if (!items) {
					return [];
				}
				const groups = items[REVIEWERS_ARRAY_KEY];
				if (!groups) {
					return [];
				}
				try {
					return JSON.parse(groups);
				} catch (ex) {
					console.error("loadGroupsArray JSON parse failed", ex)
					return []
				}
			})
	}

	function saveUrl(array) {
		const data = {};
		data[REVIEWERS_URL_KEY] = JSON.stringify(array);
		return storagePromised.set(data);
	}

	function loadUrl() {
		return storagePromised.get()
			.then(function(items) {
				if (!items || !items[REVIEWERS_URL_KEY]) { return [] }
				let urls
				try {
					urls = JSON.parse(items[REVIEWERS_URL_KEY]);
				} catch (ex) {
					console.error("loadUrl JSON parse failed", ex)
					return []
				}
				if(!urls) {
					return [];
				}
				return urls;
			});
	}

	function loadDefaultTemplate() {
		return fetch(chrome.extension.getURL('/js/template.txt'))
			.then(res => res.text())
			.then(function(data) {
				return data.replace("\r", '').split("\n");
			})
	}

	function loadTemplate() {
		return storagePromised.get()
			.then(function(items) {
				if (!items) {
					return loadDefaultTemplate()
				}
				const templateUrl = items[TEMPLATE_URL_KEY];
				if (templateUrl) {
					return loadTemplateFromUrl(templateUrl)
				}
				const template = items[TEMPLATE_KEY];
				if (!template) {
					return loadDefaultTemplate()
				} else {
					return template;
				}
			});
	}

	function saveTemplate(string) {
		const data = {};
		data[TEMPLATE_KEY] = string.split('\n');
		return storagePromised.set(data);
	}

	function loadTemplateFromUrl(url) {
		if (!url) {
			return Promise.resolve()
		}
		return fetch(url)
			.then(res => {
				if (!res.ok) {
					return Promise.reject('Network response was not OK')
				}
				return res.text()
			})
			.then(data =>
				data.replace("\r", '').split("\n"))
			.catch(error => Promise.reject(`Error loading template ${error.toString()}`))
	}

	function loadTemplateUrl() {
		return storagePromised.get()
			.then(items => ((items && items[TEMPLATE_URL_KEY]) || ''));
	}

	function saveTemplateUrl(string) {
		const data = {};
		data[TEMPLATE_URL_KEY] = string;
		return storagePromised.set(data);
	}

	function loadHipChatUsername() {
		return storagePromised.get()
			.then(function(items){
				return items && items[HIPCHAT_KEY];
			})
	}

	function saveHipChatUsername(string) {
		const data = {};
		data[HIPCHAT_KEY] = string;
		return storagePromised.set(data);
	}

	function loadBackgroundState() {
		return storagePromised.get()
			.then(items => items && items[BACKGROUNDSTATE_KEY]);
	}

	function saveBackgroundState(string) {
		const data = {};
		data[BACKGROUNDSTATE_KEY] = string;
		return storagePromised.set(data);
	}

	function loadNotificationState() {
		return storagePromised.get()
			.then(function(items){
				return (items && items[NOTIFSTATE_KEY]);
			});
	}

	function saveNotificationState(string) {
		const data = {};
		data[NOTIFSTATE_KEY] = string;
		return storagePromised.set(data);
	}

	function loadNotificationType() {
		return storagePromised.get()
			.then(function(items){
				return (items && items[NOTIFTYPE_KEY]);
			});
	}
	function saveNotificationType(string) {
		const data = {};
		data[NOTIFTYPE_KEY] = string;
		return storagePromised.set(data);
	}

	function loadRepoMap() {
		return storagePromised.get()
			.then(function(items){
				return (items && items[REPOMAP_KEY]);
			});
	}

	function saveRepoMap(string) {
		const data = {};
		data[REPOMAP_KEY] = string;
		return storagePromised.set(data);
	}

	function loadFeatures() {
		return storagePromised.get()
			.then(function(items){
				return (items && items[FEATURES_KEY] || defaultFeatures);
			});
	}
	function saveFeatures(string) {
		const data = {};
		data[FEATURES_KEY] = string;
		return storagePromised.set(data);
	}

	return {
		saveGroups,
		loadGroups,
		saveGroupsArray,
		loadGroupsArray,
		saveUrl,
		loadUrl,
		loadTemplate,
		saveTemplate,
		loadTemplateFromUrl,
		loadTemplateUrl,
		saveTemplateUrl,
		loadHipChatUsername,
		saveHipChatUsername,
		loadBackgroundState,
		saveBackgroundState,
		loadNotificationState,
		saveNotificationState,
		loadNotificationType,
		saveNotificationType,
		loadRepoMap,
		saveRepoMap,
		loadFeatures,
		saveFeatures,
		backgroundStates: {
			enable:'1',
			disable:'0'
		},
		notificationStates: {
			enable:'1',
			disable:'0'
		},
		notificationTypes: {
			all:'1',
			prAndMentioned:'0'
		},
		defaultFeatures
	};
})();
