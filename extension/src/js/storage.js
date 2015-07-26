var storage = (function() {
    'use strict';

    const REVIEWERS_KEY = 'stashplugin.groups_reviewers';

    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.set}
    */
    function save(string, callback) {
        var data = {};
        data[REVIEWERS_KEY] = string
        chrome.storage.sync.set(data, callback);
    }

    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.get}
    */
    function load(callback) {
        chrome.storage.sync.get(null, function(items){
            if (callback) { 
                var groups = items[REVIEWERS_KEY];
                if(!groups) {
                    $.get(chrome.extension.getURL('/js/default.json'), function(data) {
                      callback(data);
                    });
                }
                else {
                    callback(groups);
                }
                
            }
        });
    }

    return {
        save: save,
        load: load
    };
})();