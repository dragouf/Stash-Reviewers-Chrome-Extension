function createInlineScript(code) {
	// reviewers list
	var script = document.createElement('script');
	script.textContent = code;
	(document.head||document.documentElement).appendChild(script);
	script.parentNode.removeChild(script);
}

storage.loadGroups(function(data) {
	if(data) {
		storage.loadHipChatUsername(function(username){
	    	createInlineScript("var hipchatUsername = '" + (username || '') + "';");
	    });

		createInlineScript("var jsonGroups = " + data + "; var chromeExtId='" + chrome.runtime.id + "'; stashIcon='"+chrome.extension.getURL('img/stash128.png')+"';");
		

		// UI injector
		var s = document.createElement('script');
		s.src = chrome.extension.getURL('js/stash_page_injector.js');
		s.onload = function() {
		    this.parentNode.removeChild(this);
		};
		(document.head||document.documentElement).appendChild(s);

		// css
		$('<link/>')
		.attr('rel', 'stylesheet')
		.attr('media', 'all')
		.attr('type', 'text/css')
		.attr('href', chrome.extension.getURL('css/page_injection.css'))
		.appendTo("head");
	}
	else {
		console.log("reviewers plugin: no data");
		var code = ["require('aui/flag')({",
						"type: 'info',",
						"title: 'Stash Browser Extension',",
						"body: '<p>Please define groups for extension to load</p>',",
						"close: 'auto'",
					"});"].join('\n');
		createInlineScript(code);
	}
});

function getSiteBaseURl() {
	return location.protocol + '//' + location.host;
}

// message sent from background.js
chrome.runtime.onMessage.addListener(function(message) {
	// transfert it to injected page script
	if (message && message.action === 'ActivitiesRetrieved') {
		var event = new CustomEvent('ActivitiesRetrieved', { 'detail': { activities: message.activities, desktopNotification: message.desktopNotification } });
        document.dispatchEvent(event);
	}
	else if(message && message.action === 'ping') {
		chrome.runtime.sendMessage({ action: 'pong', url: getSiteBaseURl()  });
	}
});