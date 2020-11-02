document.getElementById('save_user_hosts').addEventListener('click', (event) => {

    let hostsTextarea = document.getElementById('user_defined_hosts');
    let hosts = hostsTextarea.value.
		replace(/,/g, ' ').
		replace(/;/g, ' ').
		replace(/\t+/g, ' ').
		replace(/\r+/g, ' ').
        replace(/\n+/g, ' ').
        trim().
        split(' ').
        filter(host => {
            return !!host; // This removes empty hosts
        });

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

