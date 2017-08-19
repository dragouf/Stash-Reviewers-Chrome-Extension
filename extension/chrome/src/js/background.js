// ff webextensions workaround
chrome = chrome || browser; // eslint-disable-line no-global-assign
const onMessage = chrome.runtime.onMessageExternal || chrome.runtime.onMessage;

// Refresh every 6h
const REVIEWERS_LIST_REFRESH = 6 * 60 * 60 * 1000;


const reloadLists = function() {
	const promises = [];
	const arr = new Promise((resolve) => {
		const groupPromises = [];
		extensionStorage.loadUrl(urls => {
			urls.forEach(url => {
				const p = new Promise((resolve, reject) => {
					fetch(url)
						.then((res) => {
							return res.json();
						})
						.then((body) => {
							if (!body) {
								return reject({msg: 'Corrupt file', e: {}});
							}
							resolve(body);
						})
						.catch((err) => {
							reject({msg: err, e: err});
						});
				});
				groupPromises.push(p);
			});
			Promise.all(groupPromises).then(groups => {
				let joined = [];
				groups.forEach((group) => {
					if (group.groups) {
						joined = joined.concat(group.groups);
					}
				});
				resolve({groups: joined});
			});
		});
	});
	promises.push(arr);

	const str = new Promise((resolve) => {
		extensionStorage.loadGroups(groups => {
			if (!groups) {
				return resolve({groups: []});
			}
			resolve(JSON.parse(groups));
		});
	});
	promises.push(str);

	Promise.all(promises).then(values => {
		let joined = [];
		values.forEach((group) => {
			if (group.groups) {
				joined = joined.concat(group.groups);
			}
		});
		if (joined.length === 0) {
			throw({msg: 'Groups are empty', e: {}});
		}
		return new Promise((resolve) => {
			extensionStorage.saveGroupsArray(joined, () => {
				resolve(joined);
			});
		});
	}).then(groups => {
		jsonGroups = groups;
		console.info('Groups updated', groups);
	}).catch(console.error);
};

let tempTabList = [];
const extensionCommunicationCallback = function(request, sender, callback) {
	if (request.action == "xhttp") {
		const xhttp = new XMLHttpRequest();
		const method = request.method ? request.method.toUpperCase() : 'GET';

		xhttp.onreadystatechange = function () {
			if (xhttp.readyState == 4) {
				if(xhttp.status == 200)
					callback({status: xhttp.status, response: xhttp.response, redirect: this.getResponseHeader("Location") || request.url, httpObj: xhttp });
				else
					callback({status: xhttp.status, response: xhttp.response, httpObj: xhttp });
			}
		};

		xhttp.open(method, request.url, true);

		if (method == 'POST') {
			xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		}

		xhttp.send(request.data);

		return true; // prevents the callback from being called too early on return
	}
	else if (request.action === 'setUrl') {
		// done with ping/pong when alarm wake up background
		// The page was not calling all the time this method
		//currentStashBaseUrl = request.url;
	}
	else if (request.action === 'setBadgeCount') {
		chrome.browserAction.setBadgeBackgroundColor({ color: [208, 68, 55, 255] });
		chrome.browserAction.setBadgeText({text: request.badgeCount});
	}
	else if (request.action === 'pong') {
		tempTabList.push(sender.tab.id);
		const items = {
			tabList: tempTabList
		}

		if(request.url) {
			items.currentStashBaseUrl = request.url;
		}

		chrome.storage.local.set(items);
	}
}
onMessage.addListener(extensionCommunicationCallback);

if(onMessage !== chrome.runtime.onMessage) {
	chrome.runtime.onMessage.addListener(extensionCommunicationCallback);
}

function retrieveActivities() {
	chrome.storage.local.get(['tabList', 'currentStashBaseUrl'], function(items) {
		if(items && ((!items.currentStashBaseUrl || items.currentStashBaseUrl.length === 0) || (!items.tabList || items.tabList.length === 0))){
			return;
		}

		const allPR = [];
		const params = "?start=0&limit=1000&avatarSize=64&withAttributes=true&state=OPEN&order=oldest&role=";
		const urlPR = items.currentStashBaseUrl + "/rest/inbox/latest/pull-requests" + params;
		const urlPRNew = items.currentStashBaseUrl + "/rest/api/latest/inbox/pull-requests" + params;

		const buildUrlPR = function(url, role){
			return url + role;
		}
		const reviewersDefered = jQuery.Deferred()
		const resolveReviewers = function(data) {
			reviewersDefered.resolve();
			return data;
		}
		const authorDefered = jQuery.Deferred()
		const resolveAuthor = function(data) {
			authorDefered.resolve();
			return data;
		}
		const mergeResults = function(data){
			jQuery.merge(allPR, data.values)
		};
		const rerunRequest = function(role) {
			return function(err) {
				const resolveDeferred = role === 'reviewer' ? resolveReviewers : resolveAuthor;
				if(err.status == 404) {
					return jQuery
						.get(buildUrlPR(urlPR, role))
						.then(mergeResults)
						.then(resolveDeferred);
				}
			}
		};
		const rerunRequestReviewers = rerunRequest('reviewer');
		const rerunRequestAuthor = rerunRequest('author');

		jQuery
			.get(buildUrlPR(urlPRNew, 'reviewer'))
			.then(mergeResults)
			.then(resolveReviewers)
			.fail(rerunRequestReviewers);

		jQuery
			.get(buildUrlPR(urlPRNew, 'author'))
			.then(mergeResults)
			.then(resolveAuthor)
			.fail(rerunRequestAuthor);

		jQuery.when(reviewersDefered, authorDefered).done(function(){
			const activities = [];
			const requests = [];
			// loop through PRs and request activities
			allPR.forEach(function(pr){
				let prLink = '';
				if(pr.links && pr.links.self) {
					prLink = pr.links.self[0].href.replace(items.currentStashBaseUrl, '');
					prLink = items.currentStashBaseUrl + '/rest/api/1.0' + prLink + '/activities?avatarSize=64';
				}

				if(prLink) {
					requests.push(jQuery.get(prLink)
						.done(function(activityList){
						// get comments after PR was updated
							jQuery.each(activityList.values, function(index, activity){
								jQuery.extend(activity, { pullrequest: pr });
								activities.push(activity);
							});
						}));
				}
			});

			jQuery.when.apply(jQuery, requests).always(function(){
				// send retrieved data to page script
				items.tabList.forEach(function(tabId, index){
					if (tabId) {
						chrome.tabs.sendMessage(tabId, { action: "ActivitiesRetrieved", activities, desktopNotification: index === 0 });
					}
				});
			});

		});
	});
}

// periodically check activities if background notification enabled
extensionStorage.loadBackgroundState(function(response) {
	if(typeof response === 'undefined' || response && response.toString() === extensionStorage.backgroundStates.enable.toString()) {
		chrome.alarms.onAlarm.addListener(retrieveActivities);
		chrome.alarms.create("retrievedActivitiesAlarm", {periodInMinutes: 1.0} );
	}
});

// update detected bitbucket url each time tabs are opened/closed/updated
chrome.tabs.onRemoved.addListener(function() {
	pingAllExistingTabs();
});

chrome.tabs.onCreated.addListener(function() {
	pingAllExistingTabs();
});
chrome.tabs.onUpdated.addListener(function() {
	pingAllExistingTabs();
});
function pingAllExistingTabs() {
	tempTabList = [];
	chrome.tabs.query({}, function(tabs){
		tabs.forEach(function(tab){
			if (tab && tab.id) {
				chrome.tabs.sendMessage(tab.id, { action: "ping" });
			}
		});
	});
}


// Click on extension icon
chrome.browserAction.onClicked.addListener(function() {
	chrome.storage.local.get(['currentStashBaseUrl'], function(items) {
		chrome.tabs.create({'url': items.currentStashBaseUrl + '/'}, function() {});
	});
});

setInterval(reloadLists, REVIEWERS_LIST_REFRESH);
reloadLists();
