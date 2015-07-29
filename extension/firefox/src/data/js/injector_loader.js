
storage.load(function(data) {
	if(data) {
		var pageCode = "var jsonGroups = " + data + ";";
		// reviewers list
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.textContent = pageCode;
		document.body.appendChild(script);

		// UI injector
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.setAttribute('src',self.options.injectorUrl);
		document.body.appendChild(s);
	}
	else {
		console.log("reviewers plugin: no data");
	}
});
