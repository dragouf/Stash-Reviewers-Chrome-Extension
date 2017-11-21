// ff webextensions workaround
chrome = chrome || browser; // eslint-disable-line no-global-assign
const onMessage = chrome.runtime.onMessageExternal || chrome.runtime.onMessage;

// eslint-disable-next-line no-unused-vars
let jsonGroups // is assigned here and used in other scripts

// Refresh every 6h
const REVIEWERS_LIST_REFRESH = 6 * 60 * 60 * 1000;

const reloadLists = function() {
	const promises = [];
	const groupPromises = [];
	const arr = extensionStorage.loadUrl().then(urls => {
		urls.forEach(url => {
			const p = fetch(url)
				.then((res) => {
					return res.json();
				})
				.then((body) => {
					if (!body) {
						return {msg: 'Corrupt file', e: {}};
					}
					return body;
				})
			groupPromises.push(p);
		});
		return Promise.all(groupPromises).then(groups => {
			let joined = [];
			groups.forEach((group) => {
				if (group.groups) {
					joined = joined.concat(group.groups);
				}
			});
			return {groups: joined};
		});
	});
	promises.push(arr);

	const str = extensionStorage.loadGroups().then(groups => {
		if (!groups) {
			return {groups: []};
		}
		if ("string" !== typeof groups) {
			return groups
		}
		try {
			return JSON.parse(groups);
		} catch (ex) {
			console.error("extensionStorage.loadGroups JSON parse failed", ex, groups)
			return { groups: [] }
		}
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
		return extensionStorage.saveGroupsArray(joined)
	}).then(groups => {
		jsonGroups = groups;
		console.info('Groups updated', groups);
	}).catch(console.error);
};

const reloadTemplate = function() {
	extensionStorage.loadTemplateUrl()
		.then(extensionStorage.loadTemplateFromUrl)
		.then(template => {
			return extensionStorage.saveTemplate(template.join('\n'));
		})
		.then(() => console.info('Template updated'))
		.catch(error => {
			console.error('Error loading template', error)
		})
}

const realoadAll = function() {
	reloadLists();
	reloadTemplate();
}

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

		const params = "?start=0&limit=1000&avatarSize=64&withAttributes=true&state=OPEN&order=oldest&role=";
		const urlPR = `${items.currentStashBaseUrl  }/rest/inbox/latest/pull-requests${  params}`;
		const urlPRNew = `${items.currentStashBaseUrl  }/rest/api/latest/inbox/pull-requests${  params}`;

		const buildUrlPR = function(url, role){
			return url + role;
		}
		const rerunRequest = function(role) {
			return function(err) {
				if (err.status == 404) {
					return fetch(buildUrlPR(urlPR, role))
				}
				return Promise.reject(err)
			}
		};
		const rerunRequestReviewers = rerunRequest('reviewer');
		const rerunRequestAuthor = rerunRequest('author');

		const reviewersPromised = fetch(buildUrlPR(urlPRNew, 'reviewer'))
			.catch(rerunRequestReviewers)
			.then(res => res.json());

		const authorPromised = fetch(buildUrlPR(urlPRNew, 'author'))
			.catch(rerunRequestAuthor)
			.then(res => res.json())

		Promise.all([reviewersPromised, authorPromised]).then(function([reviewersResult, authorResult]) {
			if (reviewersResult.errors) { throw reviewersResult.errors }
			if (authorResult.errors) { throw authorResult.errors }
			const allPR = reviewersResult.concat(authorResult)
			let activities;
			const requests = [];
			// loop through PRs and request activities
			allPR.forEach(function(pr){
				let prLink = '';
				if(pr.links && pr.links.self) {
					prLink = pr.links.self[0].href.replace(items.currentStashBaseUrl, '');
					prLink = `${items.currentStashBaseUrl  }/rest/api/1.0${  prLink  }/activities?avatarSize=64`;
				}

				if(prLink) {
					requests.push(fetch(prLink)
						.then(res => res.json())
						.then(function(activityList){
						// get comments after PR was updated
							activities = activityList.values.map(function(activity){
								return Object.assign(activity, { pullrequest: pr });
							});
						})
						// make sure that this promise is always resolved, for `Promise.all` later
						.catch(err => { console.error(`Request to ${  prLink  } failed`, err)})
					)
				}
			});

			// All these requests are always resolved thanks to the `catch` above
			Promise.all(requests).then(function(){
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
extensionStorage.loadBackgroundState().then(function(response) {
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
		chrome.tabs.create({'url': `${items.currentStashBaseUrl}/`});
	});
});

setInterval(realoadAll, REVIEWERS_LIST_REFRESH);
realoadAll();
