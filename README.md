Stash Reviewers chrome extension
==================

<p align="center">
<img src="https://raw.githubusercontent.com/dragouf/Stash-Reviewers-Chrome-Extension/master/docs/launch.png" alt="extension art" />
</p>

This chrome extension allow to define groups of reviewers in Atlassian Stash to bulk add them when creating or updating pull request.

### Installation

In chrome extensions manager check the "Developer Mode" checkbox and then click on "Load unpacked extension" button.

From there choose the extension/src folder of this repository.

Extension will be loaded.

### Configuration

A "Stash" icon will appear on the top right corner of chrome window. Click on it. It will ask you to add a json to describe which group you want to create with which reviewers.

![GitHub Logo](/docs/configuration_resized.png)

Json format is as follow :

```
{ "groups": [ { 
    "groupName":"first group name", 
    "reviewers": ["first reviewer name or email"] 
  },
  { 
    "groupName":"second group name", 
    "reviewers": ["first reviewer name or email", "second reviewer name or email"] 
  } ] }
```

After that when you will go to pull request creation page or update page a dropdown will appear after reviewers list with a list of groups you defined.

![GitHub Logo](/docs/add_group.png)

Note: the extension will make a stash api request to find reviewers. It will simply send the string you added in the reviewers array as search term. Normally if you add email or username as recommanded API should return only one user. You can also enter a name but in this case if the API return more than one user, only the first one will be added.


If you like this extension you can buy it on chrome webstore here : https://chrome.google.com/webstore/detail/stash-reviewers/kpgdinlfgnkbfkmffilkgmeahphehegk?hl=fr

