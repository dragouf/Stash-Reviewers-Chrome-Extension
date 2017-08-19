const extensionStorage = (function() { // eslint-disable-line no-unused-vars
	'use strict';

	const REVIEWERS_KEY = 'stashplugin.groups_reviewers';
	const REVIEWERS_ARRAY_KEY = 'stashplugin.reviewers_array';
	const REVIEWERS_URL_KEY = 'stashplugin.reviewers_url';
	const HIPCHAT_KEY = 'stashplugin.hipchat';
	const TEMPLATE_KEY = 'stashplugin.template';
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
	/**
		@method
		@memberof storage
		@see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.set}
	*/
	function saveGroups(string, callback) {
		const data = {};
		data[REVIEWERS_KEY] = string;
		cloudStorage.set(data, callback);
	}
	function loadGroups(callback) {
		cloudStorage.get(null, function(items) {
			if (callback) {
				const groups = items[REVIEWERS_KEY];
				const urls = items[REVIEWERS_URL_KEY];
				if(!groups && (!urls || urls.length === 0)) {
					$.get(chrome.extension.getURL('/js/default.json'), function(data) {
						callback(data);
					});
				}
				else {
					callback(groups);
				}
			}
		});
	}

	function saveGroupsArray(array, callback) {
		const data = {};
		data[REVIEWERS_ARRAY_KEY] = JSON.stringify(array);
		cloudStorage.set(data, callback);
	}
	function loadGroupsArray(callback) {
		cloudStorage.get(null, function(items) {
			if (callback) {
				const groups = items[REVIEWERS_ARRAY_KEY];
				if (!groups) {
					return callback([]);
				}
				callback(JSON.parse(groups));
			}
		});
	}

	function saveUrl(array, callback) {
		const data = {};
		data[REVIEWERS_URL_KEY] = JSON.stringify(array);
		cloudStorage.set(data, callback);
	}
	function loadUrl(callback) {
		cloudStorage.get(null, function(items) {
			if (callback) {
				const urls = JSON.parse(items[REVIEWERS_URL_KEY]);
				if(!urls) {
					return callback([]);
				}
				callback(urls);
			}
		});
	}

	function loadTemplate(callback) {
		cloudStorage.get(null, function(items) {
			if (callback) {
				const template = items[TEMPLATE_KEY];
				if (!template) {
					$.get(chrome.extension.getURL('/js/template.txt'), function(data) {
						callback(data.replace("\r", '').split("\n"));
					});
				} else {
					callback(template);
				}
			}
		});
	}
	function saveTemplate(string, callback) {
		const data = {};
		data[TEMPLATE_KEY] = string.split('\n');
		cloudStorage.set(data, callback);
	}

	function loadHipChatUsername(callback) {
		cloudStorage.get(null, function(items){
			if (callback) {
				callback(items[HIPCHAT_KEY]);
			}
		});
	}
	function saveHipChatUsername(string, callback) {
		const data = {};
		data[HIPCHAT_KEY] = string;
		cloudStorage.set(data, callback);
	}

	function loadBackgroundState(callback) {
		cloudStorage.get(null, function(items){
			if (callback) {
				callback(items[BACKGROUNDSTATE_KEY]);
			}
		});
	}
	function saveBackgroundState(string, callback) {
		const data = {};
		data[BACKGROUNDSTATE_KEY] = string;
		cloudStorage.set(data, callback);
	}


	function loadNotificationState(callback) {
		cloudStorage.get(null, function(items){
			if (callback) {
				callback(items[NOTIFSTATE_KEY]);
			}
		});
	}
	function saveNotificationState(string, callback) {
		const data = {};
		data[NOTIFSTATE_KEY] = string;
		cloudStorage.set(data, callback);
	}

	function loadNotificationType(callback) {
		cloudStorage.get(null, function(items){
			if (callback) {
				callback(items[NOTIFTYPE_KEY]);
			}
		});
	}
	function saveNotificationType(string, callback) {
		const data = {};
		data[NOTIFTYPE_KEY] = string;
		cloudStorage.set(data, callback);
	}

	function loadRepoMap(callback) {
		cloudStorage.get(null, function(items){
			if (callback) {
				callback(items[REPOMAP_KEY]);
			}
		});
	}
	function saveRepoMap(string, callback) {
		const data = {};
		data[REPOMAP_KEY] = string;
		cloudStorage.set(data, callback);
	}

	function loadFeatures(callback) {
		cloudStorage.get(null, function(items){
			if (callback) {
				callback(items[FEATURES_KEY] || defaultFeatures);
			}
		});
	}
	function saveFeatures(string, callback) {
		const data = {};
		data[FEATURES_KEY] = string;
		cloudStorage.set(data, callback);
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
