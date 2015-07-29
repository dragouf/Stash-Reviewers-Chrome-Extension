var { ToggleButton } = require("sdk/ui/button/toggle");
var panels = require("sdk/panel");
var self = require("sdk/self");
var ffStorage = require("sdk/simple-storage");
var pageMod = require("sdk/page-mod");

var button = ToggleButton({
    id: "stash-reviewers-button",
    label: "Add groups",
    icon: {
      "16": "./img/stash19.png",
      "32": "./img/stash48.png"
    },
    onChange: handleChange
  });

pageMod.PageMod({
  include: /.*pull-requests.*/,
  contentScriptWhen: "ready",
  contentScriptOptions: {
    injectorUrl: self.data.url("js/stash_page_injector.js")
  },
  contentScript: "console.log('hee');",
  contentScriptFile: [self.data.url("js/jquery-2.0.3.min.js"), self.data.url("js/storage.js"),self.data.url("js/injector_loader.js")],
  onAttach: function(worker) {
      worker.port.on('storageSave', function(data) {
        storage.save(data);
      });

      worker.port.on('storageLoad', function() {
        worker.port.emit('storageLoaded', storage.load());
      }, false);
  }
});

var panel = panels.Panel({
  width: 400,
  height: 435,
  contentScriptWhen: "ready",  
  contentStyleFile:[self.data.url("css/bootstrap.min.css"),self.data.url("css/custom.css")],
  contentScriptFile:[self.data.url("js/jquery-2.0.3.min.js"),self.data.url("js/bootstrap.min.js"),self.data.url("js/storage.js"),self.data.url("js/popup.js")],
  contentURL: self.data.url("popup.html"),
  onHide: handleHide
});

function handleChange(state) {
  if (state.checked) {
    panel.show({
      position: button
    });
  }
}

function handleHide() {
  button.state('window', {checked: false});
}


var storage = (function() { 
    const REVIEWERS_KEY = 'stashplugin.groups_reviewers';

    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.set}
    */
    function save(string) {
        ffStorage.storage[REVIEWERS_KEY] = string
    }

    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.get}
    */
    function load() {
        return ffStorage.storage[REVIEWERS_KEY];
    }

    return {
        save: save,
        load: load
    };
})();

panel.port.on('storageSave', function(data) {
  storage.save(data);
});

panel.port.on('storageLoad', function() {
  panel.port.emit('storageLoaded', storage.load());
}, false);
