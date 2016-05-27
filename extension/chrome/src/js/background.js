/**
 * Possible parameters for request:
 *  action: "xhttp" for a cross-origin HTTP request
 *  method: Default "GET"
 *  url   : required, but not validated
 *  data  : data to send in a POST request
 *
 * The callback function is called upon completion of the request */

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

        var deferredResult = jQuery.Deferred();
        var urlPR = items.currentStashBaseUrl + "/rest/inbox/latest/pull-requests?start=0&limit=1000&avatarSize=64&withAttributes=true&state=open&order=oldest&role=";

        var allPR = [];
        var firstDiferred = jQuery.get(urlPR + "reviewer").done(function(data){ jQuery.merge(allPR, data.values); });
        var secondDiferred = jQuery.get(urlPR + "author").done(function(data){ jQuery.merge(allPR, data.values); });

        jQuery.when(firstDiferred, secondDiferred).done(function(){
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

// periodically check activities
chrome.alarms.onAlarm.addListener(retrieveActivities);
chrome.alarms.create("retrievedActivitiesAlarm", {periodInMinutes: 1.0} );

chrome.tabs.onRemoved.addListener(function(tabId) {
    pingAllExistingTabs();
});

chrome.tabs.onCreated.addListener(function(tabId) {
    pingAllExistingTabs();
});

chrome.tabs.onUpdated.addListener(function(tabId) {
    pingAllExistingTabs();
});

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.storage.local.get(['currentStashBaseUrl'], function(items) {
	  chrome.tabs.create({'url': items.currentStashBaseUrl + '/'}, function(tab) {
	  });
  });
});
