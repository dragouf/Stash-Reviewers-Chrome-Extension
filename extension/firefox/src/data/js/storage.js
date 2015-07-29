window.storage = (function() { 
    const REVIEWERS_KEY = 'stashplugin.groups_reviewers';

    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.set}
    */
    function save(string, callback) {
        self.port.emit("storageSave", string);
        if(callback)
            callback();
    }

    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.get}
    */
    function load(callback) {
        if (callback) {             
            self.port.emit("storageLoad");
            self.port.on('storageLoaded', function(data) {
                callback(data);
            });
        }
    }

    return {
        save: save,
        load: load
    };
})();