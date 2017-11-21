/* globals Popover */

document.addEventListener("DOMContentLoaded", function() {
	const $ = document.querySelector.bind(document)
	const $$ = document.querySelectorAll.bind(document)

	let mapIndex = 0;
	loadData();
	bindSaveClick();
	bindAddFile();

	function bindSaveClick() {
		$('#bt_save').addEventListener("click", function() {
			Promise.all([saveGroups(), saveHipChat(), saveTemplate(), saveNotification(), saveRepoMapping(), saveFeatures()])
				.then(displaySavedLabel, displayErrorLabel);
		});
	}

	function bindAddFile() {
		$('#bt_add_file').addEventListener('click', function() {
			const nr = $$('.json_url').length + 1;
			$('#json_urls').insertAdjacentHTML('beforeend', `<input class="form-control json_url" id="json_url_${ nr }" type="text">`);
		});
	}

	function check(el) {
		if (!el) { return }
		el.checked = true
		el.parentNode.classList.add("active")
	}

	function uncheck(el) {
		if (!el) { return }
		el.checked = false
		el.parentNode.classList.remove("active")
	}

	function loadData() {
		extensionStorage.loadGroups().then(function(item){
			$('#text_json').value = item;
		});

		extensionStorage.loadUrl().then(function(items){
			if (items.length > 0) {
				$('#json_url_1').remove();
				items.forEach((url, index) => {
					const input = `<input class="form-control json_url" id="json_url_${index + 1}" type="text" value="${url}">`;
					$('#json_urls').insertAdjacentHTML('beforeend', input);
				});
			}
		});

		extensionStorage.loadHipChatUsername().then(function(username){
			const hipchatUsername = $('#hipchat_username')
			if (hipchatUsername) {
				hipchatUsername.value = username;
			}
		});

		extensionStorage.loadTemplate().then(function(template){
			$('#template_text').value = template.join('\n');
		});

		extensionStorage.loadTemplateUrl().then(function(templateUrl){
			$('#template_url').value = templateUrl;
		});

		extensionStorage.loadRepoMap().then(function(repoMap){
			if(Array.isArray(repoMap) && repoMap.length > 0) {
				repoMap.forEach(createNewMapInputs);
			} else {
				createNewMapInputs();
			}
		});

		extensionStorage.loadBackgroundState().then(function(state){
			const backgroundCheckDisable = $('#backgroundCheckDisable')
			const backgroundCheckEnable = $('#backgroundCheckEnable')
			if(!state || state === extensionStorage.backgroundStates.enable){
				uncheck(backgroundCheckDisable)
				check(backgroundCheckEnable)
			} else {
				check(backgroundCheckDisable)
				uncheck(backgroundCheckEnable)
			}
		});

		extensionStorage.loadNotificationState().then(function(state){
			const notificationDisable = $('#notificationDisable')
			const notificationEnable = $('#notificationEnable')
			if(!state || state === extensionStorage.notificationStates.enable){
				uncheck(notificationDisable)
				check(notificationEnable)
			} else {
				check(notificationDisable)
				uncheck(notificationEnable)
			}
		});

		extensionStorage.loadNotificationType().then(function(type){
			const notificationMention = $('#notificationMention')
			const notificationAll = $('#notificationAll')
			if(type === extensionStorage.notificationTypes.all){
				uncheck(notificationMention)
				check(notificationAll)
			} else {
				check(notificationMention)
				uncheck(notificationAll)
			}
		});

		loadFeaturesStates();
	}

	function loadFeaturesStates() {
		extensionStorage.loadFeatures().then(function(features) {
			if(features != null) {
				Object.entries(features).forEach(setFeatureState)
			}
		});
	}

	function displaySavedLabel() {
		$('#optionErrorAlert').classList.add('hidden');
		$('#optionSavedAlert').classList.remove('hidden');
		setTimeout(function() {
			$('#optionSavedAlert').classList.add('hidden');
		}, 800);
	}

	function displayErrorLabel(error) {
		$('#optionErrorAlert').textContent = `Error: ${error.msg}`;
		$('#optionErrorAlert').classList.remove('hidden');
	}

	function saveGroups() {
		const newUrls = Array.from($$('.json_url')).map(el => el.value).filter(Boolean)
		const newValue = $('#text_json').value;
		const groupPromises = [];

		groupPromises.push(new Promise((resolve, reject) => {
			if (!newValue) {
				resolve({groups:[]});
				return
			}
			try { JSON.parse(newValue); }
			catch (e) {
				return reject({ msg: e.message, error: e });
			}
			resolve(JSON.parse(newValue));
		}));

		newUrls.forEach(url => {
			const p = new Promise((resolve, reject) => {
				fetch(url)
					.then((res) => {
						if (!res.ok) {
							return reject({msg: 'Network response was not OK', e: {}})
						}
						return res.json()
					})
					.then((body) => {
						if (!body) {
							return reject({msg: 'Corrupt file', e: {}});
						}
						resolve(body);
					})
					.catch((err) => {
						reject({msg: err, e: err});
					});
			});
			groupPromises.push(p);
		});

		return Promise.all(groupPromises).then(values => {
			let joined = [];
			values.forEach((group) => {
				if (group.groups) {
					joined = joined.concat(group.groups);
				}
			});
			if (joined.length === 0) {
				throw({msg: 'Groups are empty', e: {}});
			}
			return Promise.all([
				extensionStorage.saveUrl(newUrls),
				extensionStorage.saveGroups(newValue),
				extensionStorage.saveGroupsArray(joined)
			]);
		});
	}

	function saveHipChat() {
		const usernameEl = $('#hipchat_username')
		if (usernameEl) {
			return extensionStorage.saveHipChatUsername(usernameEl.value)
		}
		return Promise.resolve()
	}

	function saveTemplate() {
		const templateEl = $('#template_text');
		const templateUrlEl = $('#template_url');
		if (templateUrlEl && templateUrlEl.value) {
			const teamplateUrl = templateUrlEl.value
			return extensionStorage.loadTemplateFromUrl(teamplateUrl)
				.catch(error => {
					console.error(error)
					throw({msg: 'loading template failed'})
				})
				.then(template => {
					const templateString = template.join('\n')
					$('#template_text').value = templateString;
					return Promise.all([
						extensionStorage.saveTemplateUrl(teamplateUrl),
						extensionStorage.saveTemplate(templateString)
					])
				})
				.catch(error => {
					throw({msg: error.msg || JSON.stringify(error).message})
				})
		}
		if (templateEl) {
			return Promise.all([
				extensionStorage.saveTemplateUrl(''),
				extensionStorage.saveTemplate(templateEl.value)
			])
		}
		return Promise.resolve()
	}

	function saveNotification() {
		const backgroundState = $('#backgroundCheck input[type=radio]:checked').value;
		const backgroundPromised = extensionStorage.saveBackgroundState(backgroundState)

		const notificationState = $('#notificationState input[type=radio]:checked').value;
		const notificationPromised = extensionStorage.saveNotificationState(notificationState)

		const type = $('#notificationType input[type=radio]:checked').value;
		const typePromised = extensionStorage.saveNotificationType(type)

		return Promise.all([ backgroundPromised, notificationPromised, typePromised ]);
	}

	function saveRepoMapping() {
		const data = [];
		for(let index = 0; index < mapIndex; index++) {
			const repo = $(`input[name='map[${index}].repo']`);
			const remote = $(`input[name='map[${index}].remote']`);
			if (repo && remote) {
				data.push({
					repo: repo.value,
					remote: remote.value
				});
			}
		}

		return extensionStorage.saveRepoMap(data)
	}

	function saveFeatures() {
		const features = extensionStorage.defaultFeatures;

		Object.keys(features).forEach(function(name) {
			features[name] = getFeatureState(name);
		});

		return extensionStorage.saveFeatures(features)
	}

	function setFeatureState([feature, state]) {
		const disableFeature = $(`#${feature}Disable`)
		const enableFeature = $(`#${feature}Enable`)
		if(state == 1){
			uncheck(disableFeature)
			check(enableFeature)
		} else {
			check(disableFeature)
			uncheck(enableFeature)
		}
	}

	function getFeatureState(feature) {
		const el = $(`#f_${feature} input[type=radio]:checked`)
		return el && el.value;
	}

	function repomapTemplate(mapIndex, mapData, addButton) {
		const button = addButton
			? '<button type="button" class="btn btn-default addButton"><i class="glyphicon glyphicon-plus"></i></button>'
			: '<button type="button" class="btn btn-default removeButton"><i class="glyphicon glyphicon-minus"></i></button>'
		const div = document.createElement("div")
		div.classList.add("form-group", "form-bottom-margin")
		div.setAttribute("data-index", mapIndex)
		div.innerHTML = `
			<div class="col-xs-5">
				<input name="map[${mapIndex}].repo" value="${mapData.repo}" type="text" class="form-control" placeholder="user/project name" />
			</div>
			<div class="col-xs-5">
				<input name="map[${mapIndex}].remote" value=${mapData.remote} type="text" class="form-control" placeholder="remote name" />
			</div>
			<div class="col-xs-2">
				${button}
			</div>
		`
		return div
	}

	function createNewMapInputs(mapData) {
		mapData = mapData || {
			repo: '',
			remote: ''
		};
		const repomap = $('#repomap');
		const renderAddButton = (mapIndex === 0)
		const template = repomapTemplate(mapIndex, mapData, renderAddButton)
		repomap.appendChild(template)

		// delete action
		template.querySelectorAll('.removeButton').forEach(el =>
			el.addEventListener("click", function(){
				template.remove();
			})
		)

		template.querySelectorAll('.addButton').forEach(el =>
			el.addEventListener('click', () => createNewMapInputs())
		)

		mapIndex++;
	}

	function switchNavTab(el) {
		el.addEventListener("click", function(e) {
			e.preventDefault();
			// active class on tab LI
			const allTabs = $$(".nav-tabs li")
			allTabs.forEach(el => el.classList.remove("active"))
			const tab = e.target
			tab.parentNode.classList.add("active")
			// active class on tab container
			const allContainers = $$(".tab-pane")
			allContainers.forEach(el => el.classList.remove("active"))
			$(tab.hash).classList.add('active')
		})
	}
	$$('.nav-tabs a').forEach(switchNavTab)

	$$('[data-toggle="popover"]').forEach(function(el){
		const forOption = el.getAttribute('for');
		let content = '';
		switch(forOption) {
		case 'f_reviewersgroup':
			content = 'Add button in pull request creation page to add group of reviewers';
			break;
		case 'f_prfilters':
			content = ['Add filter to the PR list',
				'<ul><li>filter by: Author, Reviewers, Participants (people who participate to the PR even if they are not reviewers), Approvers (PR approved by specific reviewers), Direction, Branch</li>',
				'<li>Note: each filter is a AND per PR and not a OR.</li>',
				'<li>It mean that you can add only one Author or you will get no result (since there is only one author by PR).</li>',
				'<li>And ALL reviewers/participants/approvers must exist in the PR or it won\'t be display</li></ul>']
				.join('');
			break;
		case 'f_notifIcon':
			content = ['Add comments notification icon in header toolbar',
				'<ul><li>Comments are from unreviewed pull requests (PR you see in your inbox)</li>',
				'<li>A row always represent the first comment of a hierarchy</li>',
				'<li>Sub-comments/tasks are represented by the icon on the right of the row</li>',
				'<li>Each time there is a new comment/task the line of the first message of the hierarchy is highlighted and the red badge of the notification icon is increased (on each page load. there is no ajax poll request)</li>',
				'<li>Badge disappear after you click on the icon to open the panel and close it</li>',
				'<li>Highlight disappear when you visit the related PR page</li>',
				'<li>Highlight state is save on the localStorage</li>',
				'<li>Note: there is 2 kind of highlight: strong blue is when you see it for the first time (open panel for the first time), light blue is when activity was already there when you opened panel previously.</li></ul>']
				.join('');
			break;
		case 'f_checkout':
			content = 'Add a checkout dropdown on PR/Branch pages with common checkout git commands';
			break;
		case 'f_clickbranch':
			content = 'Add clickable branch text (origin and target) in the pull request details page to go to the corresponding repository easily';
			break;
		case 'f_sticker':
			content = ['Add a sticker on the right of the \'branch overview\' page of a repository to list all pull requests comming from this branch (OPEN/MERGED/DECLINED)',
				'<br><b>Note</b>: sticker are clickable to go directly to the corresponding pull request']
				.join('');
			break;
		case 'f_build':
			content = ['Add a link to start a jenkin build in one click on the pull request details page',
				'<br><b>Note</b>: you can add your hipchat username into the config panel of the extension to receive build notification']
				.join('');
			break;
		case 'f_pa':
			content = 'Add a link to build a personal app in one click on the pull request details page';
			break;
		case 'f_forkorigin':
			content = 'Display a link next to a repository title to navigate to the fork origin';
			break;
		case 'f_prtemplate':
			content = ['Add a button to the PR editor to inject a default template in the textarea',
				'<br><b>Note</b>: you can edit the template in this option panel']
				.join('');
			break;
		case 'f_prconflicts':
			content = 'Display a warning message in PR review page in case of conflict';
			break;
		case 'f_checkversion':
			content = 'Check if there is no new version committed on github each time the extension load';
			break;
		case 'backgroundCheckEnable':
			content = 'Background task which poll regularly server for new notification. This polling help to update notification icon and display desktop notification. If disabled, this will happen only when you reload bitbucket page.' ;
			break;
		case 'notificationState':
			content = 'Notification display onto the desktop, outside of bitbucket page. Note that if you disable this feature it won\'t disable polling task which check in background for notification since it is used to update UI as well.' ;
			break;
		case 'notificationType':
			content = 'All: all user comments are display as notification. Mentioned/PR: A notification is displayed only when someone mention you in is comment OR someone replay to one of your comment OR someone add a comment to your PR.' ;
			break;
		}
		el.setAttribute("data-content", content)
		el.setAttribute("data-title", el.innerHTML)
		new Popover(el, {
			container: "body",
			trigger: 'hover',
			placement: "right"
		});
	});
});
