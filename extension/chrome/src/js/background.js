// ff webextensions workaround
chrome = chrome || browser;
var onMessage = chrome.runtime.onMessageExternal;
if(true || !chrome.runtime.onMessageExternal) {
 	onMessage = chrome.runtime.onMessage;
}

var tempTabList = [];
var extensionCommunicationCallback = function(request, sender, callback) {
	if (request.action == "xhttp") {
		var xhttp = new XMLHttpRequest();
		var method = request.method ? request.method.toUpperCase() : 'GET';

		xhttp.onreadystatechange = function (aEvt) {
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
		chrome.browserAction.setBadgeText({text: request.badgeCount});;
	}
	else if (request.action === 'pong') {
		tempTabList.push(sender.tab.id);
		var items = {
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

		var allPR = [];
		var deferredResult = jQuery.Deferred();
		var params = "?start=0&limit=1000&avatarSize=64&withAttributes=true&state=OPEN&order=oldest&role=";
		var urlPR = items.currentStashBaseUrl + "/rest/inbox/latest/pull-requests" + params;
		var urlPRNew = items.currentStashBaseUrl + "/rest/api/latest/inbox/pull-requests" + params;

		var buildUrlPR = function(url, role){
		  return url + role;
		}
		var reviewersDefered = jQuery.Deferred()
		var resolveReviewers = function(data) {
		  reviewersDefered.resolve();
		  return data;
		}
		var authorDefered = jQuery.Deferred()
		var resolveAuthor = function(data) {
		  authorDefered.resolve();
		  return data;
		}
		var mergeResults = function(data){
			jQuery.merge(allPR, data.values)
		};
		var rerunRequest = function(role) {
			return function(err) {
				var resolveDeferred = role === 'reviewer' ? resolveReviewers : resolveAuthor;
				if(err.status == 404) {
					return jQuery
					.get(buildUrlPR(urlPR, role))
					.then(mergeResults)
					.then(resolveDeferred);
				}
			}
		};
		var rerunRequestReviewers = rerunRequest('reviewer');
		var rerunRequestAuthor = rerunRequest('author');

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
			var activities = [];
			var requests = [];
			// loop through PRs and request activities
			allPR.forEach(function(pr){
				var prLink = '';
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
						chrome.tabs.sendMessage(tabId, { action: "ActivitiesRetrieved", activities: activities, desktopNotification: index === 0 });
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
chrome.tabs.onRemoved.addListener(function(tabId) {
	pingAllExistingTabs();
});

chrome.tabs.onCreated.addListener(function(tabId) {
	pingAllExistingTabs();
});
chrome.tabs.onUpdated.addListener(function(tabId) {
	pingAllExistingTabs();
});
function pingAllExistingTabs() {
	tempTabList = [];
	chrome.tabs.query({}, function(tabs){
		tabs.forEach(function(tab, index){
			if (tab && tab.id) {
				chrome.tabs.sendMessage(tab.id, { action: "ping" });
			}
		});
	});
}


// Click on extension icon
chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.storage.local.get(['currentStashBaseUrl'], function(items) {
		chrome.tabs.create({'url': items.currentStashBaseUrl + '/'}, function(tab) {});
	});
});
