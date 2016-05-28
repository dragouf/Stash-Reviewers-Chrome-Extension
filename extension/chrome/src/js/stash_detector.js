if(typeof window.define !== 'undefined' && typeof window.require !== 'undefined' && typeof window.stash !== 'undefined') {
	// tell content script ok
	window.postMessage({ bitbucketDetected: true }, '*');
}
