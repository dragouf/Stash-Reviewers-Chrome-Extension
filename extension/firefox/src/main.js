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
  include: [/.*<yourstashsubdomain>\.<your_stash_domain_here>\.<your_stash_extension>.*/], // TODO : ADD YOUR STASH DOMAIN HERE. REPLACE <your_stash_domain_here> and <yourstashsubdomain> and <your_stash_extension>
  contentScriptWhen: "ready",
  contentScriptOptions: {
    injectorUrl: self.data.url("js/stash_page_injector.js"),
    cssUrl: self.data.url("css/page_injection.css"),
  },
  contentScriptFile: [self.data.url("js/jquery-2.0.3.min.js"), self.data.url("js/storage.js"),self.data.url("js/injector_loader.js")],
  onAttach: function(worker) {
      worker.port.on('storageGroupsSave', function(data) {
        storage.saveGroups(data);
      });

      worker.port.on('storageGroupsLoad', function() {
        worker.port.emit('storageGroupsLoaded', storage.loadGroups());
      }, false);

      worker.port.on('storageHipchatSave', function(data) {
        storage.saveHipchat(data);
      });

      worker.port.on('storageHipchatLoad', function() {
        worker.port.emit('storageHipchatLoaded', storage.loadHipchat());
      }, false);
  }
});

var panel = panels.Panel({
  width: 400,
  height: 500,
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
    const HIPCHAT_KEY = 'stashplugin.hipchat';

    function saveGroups(string) {
        ffStorage.storage[REVIEWERS_KEY] = string
    }

    function loadGroups() {
        return ffStorage.storage[REVIEWERS_KEY];
    }

    function saveHipchat(string) {
        ffStorage.storage[HIPCHAT_KEY] = string
    }

    function loadHipchat() {
        return ffStorage.storage[HIPCHAT_KEY];
    }

    return {
        saveGroups: saveGroups,
        loadGroups: loadGroups,
        saveHipchat: saveHipchat,
        loadHipchat: loadHipchat
    };
})();

panel.port.on('storageGroupsSave', function(data) {
  storage.saveGroups(data);
});

panel.port.on('storageGroupsLoad', function() {
  panel.port.emit('storageGroupsLoaded', storage.loadGroups());
}, false);

panel.port.on('storageHipchatSave', function(data) {
  storage.saveHipchat(data);
});

panel.port.on('storageHipchatLoad', function() {
  panel.port.emit('storageHipchatLoaded', storage.loadHipchat());
}, false);
