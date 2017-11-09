let isBitbucket = false;
const extensionId = chrome.runtime.id || 'stashFF';

function injectEngine(){
	const manifest = chrome.runtime.getManifest();
	createInlineScript(`var stashRGEVersion = '${manifest.version}'; var chromeExtId='${extensionId}'; stashIcon='${chrome.extension.getURL('img/stash128.png')}';`);

	const groupDef = extensionStorage.loadGroupsArray().then(function(data) {
		if(data) {
			createInlineScript(`var jsonGroups = {groups: ${JSON.stringify(data)}};`);
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

	const hipchatDef = extensionStorage.loadHipChatUsername().then(function(username){
		createInlineScript(`var hipchatUsername = '${username || ''}';`);
	});

	const templateDef = extensionStorage.loadTemplate().then(function(response) {
		createInlineScript(`var template = "${response.join(',')}";`);
	});

	const notifStateDef = extensionStorage.loadNotificationState().then(function(response) {
		const val = (!response || response.toString() === extensionStorage.notificationStates.enable.toString()) ? 1 : 0; // notificationStates.enable by default
		createInlineScript(`var notificationState = "${val}";`);
	});

	const notifTypeDef = extensionStorage.loadNotificationType().then(function(response) {
		const val = (!response || response.toString() === extensionStorage.notificationTypes.prAndMentioned.toString()) ? 0 : 1; // prAndMentioned by default
		createInlineScript(`var notificationType = "${val}";`);
	});

	const repomapDef = extensionStorage.loadRepoMap().then(function(response) {
		const val = response || [];
		createInlineScript(`var repoMapArray = ${JSON.stringify(val)};`);
	});

	const featuresDef = extensionStorage.loadFeatures().then(function(response) {
		const val = response || {};
		createInlineScript(`var featuresData = ${JSON.stringify(val)};`);
	});

	Promise.all([groupDef, hipchatDef, templateDef, notifStateDef, notifTypeDef, repomapDef, featuresDef]).then(function(){
		// UI injector
		injectScriptFile('js/stash_page.js');

		// css
		injectCssFile('css/page_injection.css');
	}, console.error.bind(console, "Loading failed"));
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
			chrome.runtime.sendMessage({ action: 'pong', url: getSiteBaseURl()});
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
	return `${location.protocol}//${location.host}`;
}

function createInlineScript(code) {
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
	const link = document.createElement("link")
	link.setAttribute('rel', 'stylesheet')
	link.setAttribute('media', 'all')
	link.setAttribute('type', 'text/css')
	link.setAttribute('href', chrome.extension.getURL(cssPath))
	document.getElementsByTagName("head")[0].appendChild(link)
}
