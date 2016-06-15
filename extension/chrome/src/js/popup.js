$( document ).ready(function() {
	var mapIndex = 0;
	loadData();
	bindSaveClick();

	function bindSaveClick() {
		$('#bt_save').click(function() {
			$.when(saveGroups(), saveHipChat(), saveTemplate(), saveNotification(), saveRepoMapping(), saveFeatures())
			.done(displaySavedLabel)
			.fail(displayErrorLabel);
		});
	}

	function loadData() {
		extensionStorage.loadGroups(function(item){
			$('#text_json').val(item);
		});

		extensionStorage.loadHipChatUsername(function(username){
			$('#hipchat_username').val(username);
		});

		extensionStorage.loadTemplate(function(template){
			$('#template_text').val(template.join('\n'));
		});

		extensionStorage.loadRepoMap(function(repoMap){
			if($.isArray(repoMap) && repoMap.length > 0) {
				repoMap.forEach(function(map){
					createNewMapInputs(map);
				});
			} else {
				createNewMapInputs();
			}
		});

		extensionStorage.loadBackgroundState(function(state){
			if(!state || state === extensionStorage.backgroundStates.enable){
				$('#backgroundCheckDisable').prop('checked',false).parent().removeClass('active');
				$('#backgroundCheckEnable').prop('checked',true).parent().addClass('active');
			} else {
				$('#backgroundCheckDisable').prop('checked',true).parent().addClass('active');
 				$('#backgroundCheckEnable').prop('checked',false).parent().removeClass('active');
			}
		});

		extensionStorage.loadNotificationState(function(state){
			if(!state || state === extensionStorage.notificationStates.enable){
				$('#notificationDisable').prop('checked',false).parent().removeClass('active');
				$('#notificationEnable').prop('checked',true).parent().addClass('active');
			} else {
				$('#notificationDisable').prop('checked',true).parent().addClass('active');
 				$('#notificationEnable').prop('checked',false).parent().removeClass('active');
			}
		});

		extensionStorage.loadNotificationType(function(type){
			if(type === extensionStorage.notificationTypes.all){
				$('#notificationMention').prop('checked',false).parent().removeClass('active');
				$('#notificationAll').prop('checked',true).parent().addClass('active');
			} else {
				$('#notificationMention').prop('checked',true).parent().addClass('active');
 				$('#notificationAll').prop('checked',false).parent().removeClass('active');
			}
		});

		loadFeaturesStates();
	}

	function loadFeaturesStates() {
		extensionStorage.loadFeatures(function(features){
			if(features && $.isPlainObject(features)) {
				$.each(features, function(name, state){
					setFeatureState(name, state);
				});
			}
		});
	}

	function displaySavedLabel() {
		$('#optionErrorAlert').addClass('hidden');
		$('#optionSavedAlert').removeClass('hidden');
		setTimeout(function() {
			$('#optionSavedAlert').addClass('hidden');
		}, 800);
	}

	function displayErrorLabel(error) {
		$('#optionErrorAlert').html('Error: ' + error.msg);
		$('#optionErrorAlert').removeClass('hidden');
	}

	function saveGroups() {
		var def = $.Deferred();
		var newValue = $('#text_json').val();
		try { JSON.parse(newValue) }
		catch (e) {
			def.reject({ msg: e.message, error: e });
		}
		extensionStorage.saveGroups(newValue, function() {
			def.resolve();
		});

		return def.promise();
	}

	function saveHipChat() {
		var def = $.Deferred();
		var username = $('#hipchat_username').val();
		extensionStorage.saveHipChatUsername(username, function() {
			def.resolve();
		});

		return def.promise();
	}

	function saveTemplate() {
		var def = $.Deferred();
		var template = $('#template_text').val();
		extensionStorage.saveTemplate(template, function() {
			def.resolve();
		});

		return def.promise();
	}

	function saveNotification() {
		var defState = $.Deferred();
		var defType = $.Deferred();

		var state = $('#backgroundCheck').find('input:radio:checked').val();
		extensionStorage.saveBackgroundState(state, function() {
			defState.resolve();
		});

		var state = $('#notificationState').find('input:radio:checked').val();
		extensionStorage.saveNotificationState(state, function() {
			defState.resolve();
		});

		var type = $('#notificationType').find('input:radio:checked').val();
		extensionStorage.saveNotificationType(type, function() {
			defType.resolve();
		});

		return $.when(defState, defType);
	}

	function saveRepoMapping() {
		var def = $.Deferred();
		var data = [];
		for(index = 0; index < mapIndex; index++) {
			var repo = $("input[name='map[" + index + "].repo']").val();
			var remote = $("input[name='map[" + index + "].remote']").val();
			if (repo && remote) {
				data.push({
					repo: repo,
					remote: remote
				});
			}
		}

		extensionStorage.saveRepoMap(data, function() {
			def.resolve();
		});

		return def.promise();
	}

	function saveFeatures() {
		var deferred = $.Deferred();

		var features = extensionStorage.defaultFeatures;

		$.each(features, function(name, _state) {
			features[name] = getFeatureState(name);
		});

		extensionStorage.saveFeatures(features, function() {
			deferred.resolve();
		});

		return deferred.promise();
	}

	function setFeatureState(feature, state) {
		if(state == 1){
			$('#' + feature + 'Disable').prop('checked',false).parent().removeClass('active');
			$('#' + feature + 'Enable').prop('checked',true).parent().addClass('active');
		} else {
			$('#' + feature + 'Disable').prop('checked',true).parent().addClass('active');
			$('#' + feature + 'Enable').prop('checked',false).parent().removeClass('active');
		}
	}

	function getFeatureState(feature) {
		return $('#f_' + feature).find('input:radio:checked').val()
	}

	function createNewMapInputs(mapData) {
		mapData = mapData || {
			repo: '',
			remote: ''
		};
		var $template = $('#repomapTemplate');
		var $clone = $template
						.clone()
						.removeClass('hide')
						.removeAttr('id')
						.attr('data-index', mapIndex)
						.insertBefore($template);
		$clone
			.find('[name="repo"]').attr('name', 'map[' + mapIndex + '].repo').val(mapData.repo).end()
			.find('[name="remote"]').attr('name', 'map[' + mapIndex + '].remote').val(mapData.remote).end();

		if(mapIndex == 0) {
			var $addButton = $('<button type="button" class="btn btn-default addButton"><i class="glyphicon glyphicon-plus"></i></button>');
			$clone
				.find('.removeButton')
				.replaceWith($addButton);

			$addButton.click(function() {
				createNewMapInputs();
			});
		}
		// delete action
		$clone.find('.removeButton').click(function(){
			$(this).parents('.form-group').remove();
		});

		mapIndex++;
	}

	$('.nav-tabs a').click(function(e) {
		e.preventDefault();
		$(this).tab('show');
	});

	$('[data-toggle="popover"]').each(function(index, el){
		el = $(el);
		var forOption = el.attr('for');
		var content = '';
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
			case 'f_prconflicts':
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
		el.popover({
			html: true,
			container: 'body',
			trigger: 'hover click',
			title: el.text(),
			content: content,
			viewport: "#bitbucket-extension-options"
		});
	});
});
