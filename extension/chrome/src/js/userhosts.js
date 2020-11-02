document.getElementById('save_user_hosts').addEventListener('click', (event) => {

	let hostsTextarea = document.getElementById('user_defined_hosts');
	let hosts = hostsTextarea.value.
		replace(/[,;\r\n\t]+/g, ' ').
		trim().
		split(' ').
		filter(Boolean);

	if (hosts.length > 0) {
		chrome.storage.sync.get('user_defined_hosts', oldhosts => {
			let uniqueHosts = [...new Set(hosts)];
			chrome.storage.sync.set({'user_defined_hosts': uniqueHosts});
			populateTextArea();
			chrome.extension.getBackgroundPage().handleUserDefinedHosts();
		});
	}
});

populateTextArea();
chrome.extension.getBackgroundPage().handleExtensionClick();

function populateTextArea() {
	let hostsTextarea = document.getElementById('user_defined_hosts');
	chrome.storage.sync.get('user_defined_hosts', oldhost => {
		hostsTextarea.value = [...new Set(oldhost.user_defined_hosts)].join("\r\n");
	});
}

