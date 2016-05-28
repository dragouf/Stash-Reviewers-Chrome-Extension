window.storage = (function() {
    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.set}
    */
    function saveGroups(string, callback) {
        self.port.emit("storageGroupsSave", string);
        if(callback)
            callback();
    }

    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.get}
    */
    function loadGroups(callback) {
        if (callback) {             
            self.port.emit("storageGroupsLoad");
            self.port.on('storageGroupsLoaded', function(data) {
                callback(data);
            });
        }
    }

    function saveHipChatUsername(string, callback) {
        self.port.emit("storageHipchatSave", string);
        if(callback)
            callback();
    }

    function loadHipChatUsername(callback) {
        if (callback) {             
            self.port.emit("storageHipchatLoad");
            self.port.on('storageHipchatLoaded', function(data) {
                callback(data);
            });
        }
    }

    return {
        saveGroups: saveGroups,
        loadGroups: loadGroups,
        loadHipChatUsername: loadHipChatUsername,
        saveHipChatUsername: saveHipChatUsername
    };
})();