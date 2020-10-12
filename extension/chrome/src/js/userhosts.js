document.getElementById('save_user_hosts').addEventListener('click', (event) => {
	
	let hostsButton = document.getElementById('user_defined_hosts'),
		hosts = hostsButton.value.
		replace(/,/g, ' ').
		replace(/;/g, ' ').
		replace(/\r/g, ' ').
		replace(/\t/g, ' ').
		replace(/\n/g, ' ').
		split(' ');

	let fhosts = [];

	for(let host of hosts){
		if (host != "") {
			fhosts.push(host)
		}
	}
	hosts = fhosts
	if (hosts.length > 0) {
		chrome.storage.sync.get('user_defined_hosts', oldhosts => {
			chrome.storage.sync.set({'user_defined_hosts': (oldhosts.user_defined_hosts || []).concat(hosts)})
			chrome.extension.getBackgroundPage().handleUserDefinedHosts()
		});
		hostsButton.value = ''	
	}
})