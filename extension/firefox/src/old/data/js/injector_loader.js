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

		createInlineScript("var jsonGroups = " + data + "; stashIcon='"+self.options.iconURl+"';");
		

		// UI injector
		var s = document.createElement('script');
		s.src = self.options.injectorUrl;
		s.onload = function() {
		    this.parentNode.removeChild(this);
		};
		(document.head||document.documentElement).appendChild(s);

		// css
		$('<link/>')
		.attr('rel', 'stylesheet')
		.attr('media', 'all')
		.attr('type', 'text/css')
		.attr('href', self.options.cssUrl)
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