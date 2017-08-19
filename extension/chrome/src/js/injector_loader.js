let isBitbucket = false;
const extensionId = chrome.runtime.id || 'stashFF';

function injectEngine(){
	const groupDef = $.Deferred();
	const hipchatDef = $.Deferred();
	const templateDef = $.Deferred();
	const notifStateDef = $.Deferred();
	const notifTypeDef = $.Deferred();
	const repomapDef = $.Deferred();
	const featuresDef = $.Deferred();

	const manifest = chrome.runtime.getManifest();
	createInlineScript("var stashRGEVersion = '" + manifest.version + "'; var chromeExtId='" + extensionId + "'; stashIcon='"+chrome.extension.getURL('img/stash128.png')+"';");

	extensionStorage.loadGroupsArray(function(data) {
		groupDef.resolve();
		if(data) {
			createInlineScript("var jsonGroups = {groups: " + JSON.stringify(data) + "};");
		}
		else {
			console.warn("reviewers plugin: no data");
			const code = ["require('aui/flag')({",
				"type: 'info',",
				"title: 'Bitbucket Browser Extension',",
				"body: '<p>Please define groups for button to appear</p>',",
				"close: 'auto'",
				"});"].join('\n');
			createInlineScript(code);
		}
	});

	extensionStorage.loadHipChatUsername(function(username){
		hipchatDef.resolve();
		createInlineScript("var hipchatUsername = '" + (username || '') + "';");
	});

	extensionStorage.loadTemplate(function(response) {
		templateDef.resolve();
		createInlineScript('var template = "' + response.join(',') + '";');
	});

	extensionStorage.loadNotificationState(function(response) {
		notifStateDef.resolve();
		const val = (!response || response.toString() === extensionStorage.notificationStates.enable.toString()) ? 1 : 0; // notificationStates.enable by default
		createInlineScript('var notificationState = "' + val + '";');
	});

	extensionStorage.loadNotificationType(function(response) {
		notifTypeDef.resolve();
		const val = (!response || response.toString() === extensionStorage.notificationTypes.prAndMentioned.toString()) ? 0 : 1; // prAndMentioned by default
		createInlineScript('var notificationType = "' + val + '";');
	});

	extensionStorage.loadRepoMap(function(response) {
		repomapDef.resolve();
		const val = response || [];
		createInlineScript('var repoMapArray = ' + JSON.stringify(val) + ';');
	});

	extensionStorage.loadFeatures(function(response) {
		featuresDef.resolve();
		const val = response || {};
		createInlineScript('var featuresData = ' + JSON.stringify(val) + ';');
	});

	$.when(groupDef, hipchatDef, templateDef, notifStateDef, notifTypeDef, repomapDef, featuresDef).then(function(){
		// UI injector
		injectScriptFile('js/stash_page.js');

		// css
		injectCssFile('css/page_injection.css');
	});
}

function injectBitbucketDetector() {
	injectScriptFile('js/stash_detector.js');
	// wait for a response
	window.addEventListener("message", function(ev) {
		if (ev.data.bitbucketDetected) {
			// it's a bitbucket page
			isBitbucket = true;
			// inject main script
			attachListener();
			injectEngine();
		}
	});
}

injectBitbucketDetector();

function attachListener() {
	// message sent from background.js
	chrome.runtime.onMessage.addListener(function(message) {
		// transfert it to injected page script
		if (message && message.action === 'ActivitiesRetrieved') {
			const data = { 'detail': {
				identifier: 'ActivitiesRetrieved',
				activities: message.activities,
				desktopNotification: message.desktopNotification } };

			// chrome
			const event = new CustomEvent('ActivitiesRetrieved', data);
			document.dispatchEvent(event);
			// ff
			window.postMessage(data, '*');
		}
		else if(message && message.action === 'ping') {
			chrome.runtime.sendMessage({ action: 'pong', url: getSiteBaseURl()  });
		}
	});

	// transfert message from webpage to background (firefox add on)
	window.addEventListener("message", function(ev) {
		if (ev.data.eventId && ev.data.extId && ev.data.extId == extensionId) {
			chrome.runtime.sendMessage(ev.data, function(res) {
				const data  = { backgroundResult: res, identifier: ev.data.eventId };
				window.postMessage(data, "*");
			});
		}
	});
}

// helpers
function getSiteBaseURl() {
	if(!isBitbucket)
		return;
	return location.protocol + '//' + location.host;
}

function createInlineScript(code) {
	// reviewers list
	const script = document.createElement('script');
	script.textContent = code;
	(document.head|| document.documentElement).appendChild(script);
	script.parentNode.removeChild(script);
}

function injectScriptFile(scriptPath) {
	const s = document.createElement('script');
	s.src = chrome.extension.getURL(scriptPath);
	s.onload = function() {
		this.parentNode.removeChild(this);
	};
	(document.head||document.documentElement).appendChild(s);
}

function injectCssFile(cssPath) {
	$('<link/>')
		.attr('rel', 'stylesheet')
		.attr('media', 'all')
		.attr('type', 'text/css')
		.attr('href', chrome.extension.getURL(cssPath))
		.appendTo("head");
}
