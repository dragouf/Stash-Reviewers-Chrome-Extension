if(typeof window.define !== 'undefined' && typeof window.require !== 'undefined' && typeof window.bitbucket !== 'undefined') {
	// tell content script ok
	window.postMessage({ bitbucketDetected: true }, '*');
}
