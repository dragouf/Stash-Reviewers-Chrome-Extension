
storage.load(function(data) {
	if(data) {
		var pageCode = "var jsonGroups = " + data + ";";
		// reviewers list
		var script = document.createElement('script');
		script.textContent = pageCode;
		(document.head||document.documentElement).appendChild(script);
		script.parentNode.removeChild(script);

		// UI injector
		var s = document.createElement('script');
		s.src = chrome.extension.getURL('js/stash_page_injector.js');
		s.onload = function() {
		    this.parentNode.removeChild(this);
		};
		(document.head||document.documentElement).appendChild(s);
	}
	else {
		console.log("reviewers plugin: no data");
	}
});