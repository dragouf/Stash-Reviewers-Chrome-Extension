/**
 * Possible parameters for request:
 *  action: "xhttp" for a cross-origin HTTP request
 *  method: Default "GET"
 *  url   : required, but not validated
 *  data  : data to send in a POST request
 *
 * The callback function is called upon completion of the request */
var tempTabList = [];
chrome.runtime.onMessageExternal.addListener(function(request, sender, callback) {
    if (request.action == "xhttp") {
        var xhttp = new XMLHttpRequest();
        var method = request.method ? request.method.toUpperCase() : 'GET';

        xhttp.onload = function() {
            callback({response:'OK', redirect: this.getResponseHeader("Location") || request.url, httpObj: xhttp});
        };
        xhttp.onerror = function() {
            // Do whatever you want on error. Don't forget to invoke the
            // callback to clean up the communication port.
            callback('error');
        };
        xhttp.open(method, request.url, true);
        if (method == 'POST') {
            xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        xhttp.send(request.data);
        return true; // prevents the callback from being called too early on return
    }
    else if (request.action === 'setUrl') {
        currentStashBaseUrl = request.url;        
    }
    else if (request.action === 'setBadgeCount') {
        chrome.browserAction.setBadgeBackgroundColor({ color: [208, 68, 55, 255] });
        chrome.browserAction.setBadgeText({text: request.badgeCount});;        
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, callback) {
    if (request.action === 'pong') {
        tempTabList.push(sender.tab.id);
        var items = {
            tabList: tempTabList,
            currentStashBaseUrl: request.url
        }

        chrome.storage.local.set(items);    
    }
});

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
                requests.push(jQuery.get(items.currentStashBaseUrl + '/rest/api/1.0' + pr.link.url + '/activities?avatarSize=64')
                .done(function(activityList){
                    // get comments after PR was updated
                    jQuery.each(activityList.values, function(index, activity){
                        jQuery.extend(activity, { pullrequest: pr });
                        activities.push(activity);
                    });
                }));
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