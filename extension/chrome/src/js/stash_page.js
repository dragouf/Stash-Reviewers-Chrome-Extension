/* eslint-env amd */
/* globals bitbucket, aui, WRM, AJS, template */

;(function() {
	// bitbucket page must have require function
	if(typeof window.define === 'undefined' || typeof window.require === 'undefined' || typeof window.bitbucket === 'undefined')
		return;

	// workaround to fix missing firefox onMessageExternal
	if(!window.chrome || !window.chrome.runtime || typeof(window.chrome.runtime.sendMessage) !== 'function') {
		window.communication = {
			runtime : {
				sendMessage(extId, msg, callback) {
					const randEventId = Math.floor((Math.random() * 1000) + 1);
					msg.eventId = randEventId;
					msg.extId = extId;
					window.postMessage(msg, '*');
					if(callback) {
						window.addEventListener("message", function (eventArgs) {
							if(eventArgs.data.identifier === randEventId)
								callback(eventArgs.data.backgroundResult);
						});
					}
				}
			}
		};
	} else {
		window.communication = {
			runtime: {
				sendMessage: window.chrome.runtime.sendMessage
			}
		};
	}

	define('bitbucket-plugin/url', function(){
		function getSiteBaseURl() {
			return `${location.protocol}//${location.host}`;
		}

		function buildSlug(pageState) {
			if(pageState.links && pageState.links.self) {
				return pageState.links.self[0].href.replace(getSiteBaseURl(), '');
			}
			else return '';
		}

		return {
			getSiteBaseURl,
			buildSlug
		}
	});

	define('bitbucket-plugin/branch-details-page', [
		'aui',
		'aui/flag',
		'jquery',
		'lodash',
		'bitbucket/util/events',
		'bitbucket/util/state',
		'bitbucket-plugin/url'
	], function (
		AJS,
		auiFlag,
		jQuery,
		_,
		events,
		pageState,
		urlUtil
	) {
		'use strict';
		function addCheckoutLink(branchId) {
			const project = pageState.getProject();
			const repository = pageState.getRepository();
			const ref = pageState.getRef();

			if(!project) {
				console.info('no project for checkout dropdown');
				return;
			}

			let cloneUrl;
			const repoName = repository.name;
			const branchOrigin = branchId || ref.displayId;
			let remoteName = project.owner ? project.owner.slug : project.name;

			// remove previous
			jQuery('.checkoutCommand_link').unbind('click');
			jQuery('#checkoutLink').remove();

			if(!repository.links.clone) {
				const $noCloneLink = jQuery(['<a id="s2id_ddCheckoutCommand" href="#ddCheckoutCommand" aria-owns="ddCheckoutCommand" aria-haspopup="true" class="aui-button aui-style-default aui-dropdown2-trigger">',
					'<span class="aui-icon aui-icon-small aui-iconfont-devtools-checkout"></span> ',
					'<span class="name" title="copy git checkout cmmands to paste to terminal">Checkout</span> ',
					'</a>',
					'<div id="ddCheckoutCommand" class="aui-style-default aui-dropdown2">',
					'	<ul class="aui-list-truncate">',
					'		<li data-action=""><a href="javascript:void(0)" class="checkoutCommand_link" id="nothing">Sorry you don\'t have clone permission</a></li>',
					'	</ul>',
					'</div>'].join('\n'));
				jQuery('#branch-actions').parent().parent().append($noCloneLink);
				return;
			}

			repository.links.clone.forEach(function(clone) {
				if(clone.name === 'ssh') {
					cloneUrl = clone.href;
				}
			});

			if(!cloneUrl) {
				cloneUrl = repository.links.clone[0].href;
			}

			const $cloneLink =jQuery(['<a id="s2id_ddCheckoutCommand" href="#ddCheckoutCommand" aria-owns="ddCheckoutCommand" aria-haspopup="true" class="aui-button aui-style-default aui-dropdown2-trigger">',
				'<span class="aui-icon aui-icon-small aui-iconfont-devtools-checkout"></span> ',
				'<span class="name" title="copy git checkout cmmands to paste to terminal">Checkout</span> ',
				'</a>',
				'<div id="ddCheckoutCommand" class="aui-style-default aui-dropdown2">',
				'	<ul class="aui-list-truncate">',
				'		<li data-action="clone"><a href="javascript:void(0)" class="checkoutCommand_link" id="cloneCommand">Clone</a></li>',
				'		<li data-action="newremote"><a href="javascript:void(0)" class="checkoutCommand_link" id="remoteCommand">Add remote</a></li>',
				'		<li data-action="newremotenewbranch"><a href="javascript:void(0)" class="checkoutCommand_link">Add remote/Create branch</a></li>',
				'		<li data-action="newbranch"><a href="javascript:void(0)" class="checkoutCommand_link">Create branch</a></li>',
				'		<li data-action="checkout"><a href="javascript:void(0)" class="checkoutCommand_link">Checkout existing</a></li>',
				'	</ul>',
				'</div>'].join('\n'));

			// git remote naming
			(window.repoMapArray || []).forEach(function(map){
				if(map.repo === remoteName) {
					remoteName = map.remote;
				}
			});

			// git commands
			const cloneCommand = `git clone ${ cloneUrl  } ${  repoName  }_${  remoteName}`;
			const addOriginCommand = `git remote add ${ remoteName  } ${  cloneUrl}`;
			const fetchCommand = `git fetch ${  remoteName}`;
			const checkoutNewCommand = `git checkout --track ${  remoteName  }/${  branchOrigin}`;
			const checkoutCommand = `git checkout ${  branchOrigin}`;

			let command = '';
			let ddlClicked = false;

			const $wrapperdiv = jQuery('<div></div>', { id: 'checkoutLink', style: 'float: left' });
			$wrapperdiv.append($cloneLink);
			jQuery('#branch-actions').parent().parent().append($wrapperdiv);
			jQuery('.checkoutCommand_link').click(function(e){
				ddlClicked = true;
				const action = jQuery(e.target).data('action') || jQuery(e.target).parent().data('action');
				switch(action) {
				case 'clone': command = cloneCommand; document.execCommand('copy'); break;
				case 'newremote': command = `${addOriginCommand  }; ${  fetchCommand  };`; document.execCommand('copy'); break;
				case 'newremotenewbranch': command = `${addOriginCommand  }; ${  fetchCommand  }; ${  checkoutNewCommand}`; document.execCommand('copy'); break;
				case 'newbranch': command = `${fetchCommand  }; ${  checkoutNewCommand}`; document.execCommand('copy'); break;
				case 'checkout': command = `${fetchCommand  }; ${  checkoutCommand}`; document.execCommand('copy'); break;
				default: break;
				}
			});

			jQuery('#cloneCommand').append(` (<span style="font-size:xx-small">${repoName  }_${  remoteName}</span>)`);
			jQuery('#remoteCommand').append(` (<span style="font-size:xx-small">${remoteName}</span>)`);


			jQuery(document).on('copy', function (e) {
				if(ddlClicked) {
					e.preventDefault();
					if (e.originalEvent.clipboardData) {
						e.originalEvent.clipboardData.setData('text/plain', command);
						auiFlag({
							type: 'info',
							title: 'Command copied!',
							body: 'just paste it in your terminal.',
							close: 'auto'
						});
					}
					else if (window.clipboardData) {
						auiFlag({
							type: 'info',
							title: 'Sorry copy api is not available!',
							body: 'Try to update your browser.',
							close: 'auto'
						});
					}

					ddlClicked = false;
				}
			});
		}
		//////////////////////////////////////////////////// Display PRs status on branch page
		function loadPRStickers(branchRefId) {
			const project = pageState.getProject();
			const repository = pageState.getRepository();
			const ref = pageState.getRef();
			const branchId = branchRefId || ref.id;
			if(!project || !project.links) {
				console.info('no project link');
				return;
			}
			const projectUrl = urlUtil.buildSlug(project);
			const repoUrl = `repos/${  repository.slug}`;

			if(!ref || !ref.repository || !ref.repository.origin) {
				console.info('no repository origin');
				return;
			}

			// get project origin from ref and get PR with branch name
			let projectOriginUrl = urlUtil.buildSlug(ref.repository.origin).replace('/browse', '');
			projectOriginUrl = `${projectUrl  }/${  repoUrl}`;

			const getPRs = function(from, size, projectOriginUrl, fqBranchName) {
				const prApiUrl = `/rest/api/1.0${  projectOriginUrl  }/pull-requests?direction=OUTGOING&at=${  fqBranchName  }&state=ALL&start=${  from  }&limit=${  size}`;
				return jQuery.get(prApiUrl);
			};

			const searchPrs = function(from, size, projectOriginUrl, fqBranchName) {
				const deferred = jQuery.Deferred();
				let prList = [];
				getPRs(from, size, projectOriginUrl, fqBranchName).done(function(pullRequests){
					prList = pullRequests.values;

					if(!pullRequests.isLastPage) {
						searchPrs(from + size, size, projectOriginUrl, fqBranchName).done(function(list){
							if (list.length > 0) {
								jQuery.merge(prList, list);
							}

							deferred.resolve(prList);
						});
					}
					else {
						deferred.resolve(prList);
					}

				});

				return 	deferred.promise();
			};

			searchPrs(0, 20, projectOriginUrl, branchId).done(function(prs) {
				const mergedClass = 'aui-lozenge-success';
				const openClass = 'aui-lozenge-complete';
				const declinedClass = 'aui-lozenge-error';

				const $wrapper = jQuery('<div id="pr-status-wrapper" style="display: inline-block"></div>');
				jQuery('#pr-status-wrapper').remove();
				jQuery('.aui-toolbar2-secondary').prepend($wrapper);

				prs.forEach(function(pr){
					const commentsCount = (pr.properties && pr.properties.commentCount) ? pr.properties.commentCount : 0;
					const resolvedTaskCount = (pr.properties && pr.properties.resolvedTaskCount) ? pr.properties.resolvedTaskCount : 0;
					const openTaskCount = (pr.properties && pr.properties.openTaskCount) ? parseInt(pr.properties.openTaskCount) + parseInt(resolvedTaskCount) : 0;
					const dest = pr.toRef ? pr.toRef.displayId : '';

					const title = `branch: ${  dest  } | comments: ${  commentsCount  } | tasks: ${  resolvedTaskCount  } / ${  openTaskCount  } | PR: ${  pr.title}`;
					const $a = jQuery('<a>',{
						text: pr.state,
						title,
						href: urlUtil.buildSlug(pr),
						class: 'aui-lozenge declined aui-lozenge-subtle pull-request-list-trigger pull-request-state-lozenge'
					});
					if(pr.state === 'OPEN'){
						$a.addClass(openClass);
					}
					else if(pr.state === 'MERGED'){
						$a.addClass(mergedClass);
					}
					else if(pr.state === 'DECLINED'){
						$a.addClass(declinedClass);
					}

					$a.css('margin-left', '6px');

					$wrapper.append($a);

					jQuery("#pr-status-wrapper").find('a').tooltip();
				});
			});
		}

		function addForkOriginLink() {
			const repository = pageState.getRepository();
			if(repository && repository.origin && repository.origin.links) {
				const $link = jQuery(`<a style="font-size: small;margin-left:10px;">forked from ${repository.origin.project.key }/${ repository.origin.name}</a>`).attr('href', urlUtil.buildSlug(repository.origin));
				jQuery('h2.page-panel-content-header').append($link);
			}
		}

		return {
			loadPRStickers,
			addForkOriginLink,
			addCheckoutLink
		}
	});

	define('bitbucket-plugin/pullrequest-create-page', [
		'aui',
		'aui/flag',
		'jquery',
		'lodash',
		'bitbucket/util/events',
		'bitbucket/util/state'
	], function (
		AJS,
		auiFlag,
		jQuery,
		_,
		events,
		pageState
	) {
		'use strict';
		const listId = "ul_reviewers_list";
		const reviewersDataKey = "reviewers";
		const buttonIconId = "img_group_icon";

		function getGroupIcon(){
			return `<img id="${buttonIconId}" style="width:16px; height:16px;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAABiElEQVRIS72V/zEEQRCFv4sAESADIkAEZIAMXASIABEgAyJABC4DRIAIqE/NXu3Oza/aOtf/bO1uT7/u1697JqzAJivAoAZyBBwCWyGZGXAJfIX3HWAN+ADecwmXQO6A48RBg/nvBhB0M/g8hAT8NrAcyAlwW6Gyq+gq8tsN4PPPOZBnYK8CYkUG/Iz8HgFproLIuVzXzCR/IqcXYL8FJD5Y6ulokBa6VJQZv0UZKIizlkpUitItmdxfA0//2RP7tp1o/D2gOquNb6HLBkvLay/ed6BwMCs5CTvJ/cMp2pSvIP2BXajCg6WJL/XFflwkEtnorZwqXTqUqjkIvMdrJ5l0bUHm5iU1hCbmTpvG1YwFkRbpzK0eweyPAsr2xNXughysh173PXwa3m2+kk2tIedoGleiszzngscqE8ysFYLP1ADPQWyymfscY86Flbl9z6MAMyuRGmdifUz03hk3gLOjtLub9O+3ILkbcAzmwl3SgbTeHS2gxlJ5A7MSy1umLcSrzclSwH8BMXpPGYwvvtgAAAAASUVORK5CYII="/>`;
		}

		function getGroupIconLoader(){
			return `<img id="${buttonIconId}" src="data:image/gif;base64,R0lGODlhEAAQAPYAAP///wAAANTU1JSUlGBgYEBAQERERG5ubqKiotzc3KSkpCQkJCgoKDAwMDY2Nj4+Pmpqarq6uhwcHHJycuzs7O7u7sLCwoqKilBQUF5eXr6+vtDQ0Do6OhYWFoyMjKqqqlxcXHx8fOLi4oaGhg4ODmhoaJycnGZmZra2tkZGRgoKCrCwsJaWlhgYGAYGBujo6PT09Hh4eISEhPb29oKCgqioqPr6+vz8/MDAwMrKyvj4+NbW1q6urvDw8NLS0uTk5N7e3s7OzsbGxry8vODg4NjY2PLy8tra2np6erS0tLKyskxMTFJSUlpaWmJiYkJCQjw8PMTExHZ2djIyMurq6ioqKo6OjlhYWCwsLB4eHqCgoE5OThISEoiIiGRkZDQ0NMjIyMzMzObm5ri4uH5+fpKSkp6enlZWVpCQkEpKSkhISCIiIqamphAQEAwMDKysrAQEBJqamiYmJhQUFDg4OHR0dC4uLggICHBwcCAgIFRUVGxsbICAgAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAAHjYAAgoOEhYUbIykthoUIHCQqLoI2OjeFCgsdJSsvgjcwPTaDAgYSHoY2FBSWAAMLE4wAPT89ggQMEbEzQD+CBQ0UsQA7RYIGDhWxN0E+ggcPFrEUQjuCCAYXsT5DRIIJEBgfhjsrFkaDERkgJhswMwk4CDzdhBohJwcxNB4sPAmMIlCwkOGhRo5gwhIGAgAh+QQJCgAAACwAAAAAEAAQAAAHjIAAgoOEhYU7A1dYDFtdG4YAPBhVC1ktXCRfJoVKT1NIERRUSl4qXIRHBFCbhTKFCgYjkII3g0hLUbMAOjaCBEw9ukZGgidNxLMUFYIXTkGzOmLLAEkQCLNUQMEAPxdSGoYvAkS9gjkyNEkJOjovRWAb04NBJlYsWh9KQ2FUkFQ5SWqsEJIAhq6DAAIBACH5BAkKAAAALAAAAAAQABAAAAeJgACCg4SFhQkKE2kGXiwChgBDB0sGDw4NDGpshTheZ2hRFRVDUmsMCIMiZE48hmgtUBuCYxBmkAAQbV2CLBM+t0puaoIySDC3VC4tgh40M7eFNRdH0IRgZUO3NjqDFB9mv4U6Pc+DRzUfQVQ3NzAULxU2hUBDKENCQTtAL9yGRgkbcvggEq9atUAAIfkECQoAAAAsAAAAABAAEAAAB4+AAIKDhIWFPygeEE4hbEeGADkXBycZZ1tqTkqFQSNIbBtGPUJdD088g1QmMjiGZl9MO4I5ViiQAEgMA4JKLAm3EWtXgmxmOrcUElWCb2zHkFQdcoIWPGK3Sm1LgkcoPrdOKiOCRmA4IpBwDUGDL2A5IjCCN/QAcYUURQIJIlQ9MzZu6aAgRgwFGAFvKRwUCAAh+QQJCgAAACwAAAAAEAAQAAAHjIAAgoOEhYUUYW9lHiYRP4YACStxZRc0SBMyFoVEPAoWQDMzAgolEBqDRjg8O4ZKIBNAgkBjG5AAZVtsgj44VLdCanWCYUI3txUPS7xBx5AVDgazAjC3Q3ZeghUJv5B1cgOCNmI/1YUeWSkCgzNUFDODKydzCwqFNkYwOoIubnQIt244MzDC1q2DggIBACH5BAkKAAAALAAAAAAQABAAAAeJgACCg4SFhTBAOSgrEUEUhgBUQThjSh8IcQo+hRUbYEdUNjoiGlZWQYM2QD4vhkI0ZWKCPQmtkG9SEYJURDOQAD4HaLuyv0ZeB4IVj8ZNJ4IwRje/QkxkgjYz05BdamyDN9uFJg9OR4YEK1RUYzFTT0qGdnduXC1Zchg8kEEjaQsMzpTZ8avgoEAAIfkECQoAAAAsAAAAABAAEAAAB4iAAIKDhIWFNz0/Oz47IjCGADpURAkCQUI4USKFNhUvFTMANxU7KElAhDA9OoZHH0oVgjczrJBRZkGyNpCCRCw8vIUzHmXBhDM0HoIGLsCQAjEmgjIqXrxaBxGCGw5cF4Y8TnybglprLXhjFBUWVnpeOIUIT3lydg4PantDz2UZDwYOIEhgzFggACH5BAkKAAAALAAAAAAQABAAAAeLgACCg4SFhjc6RhUVRjaGgzYzRhRiREQ9hSaGOhRFOxSDQQ0uj1RBPjOCIypOjwAJFkSCSyQrrhRDOYILXFSuNkpjggwtvo86H7YAZ1korkRaEYJlC3WuESxBggJLWHGGFhcIxgBvUHQyUT1GQWwhFxuFKyBPakxNXgceYY9HCDEZTlxA8cOVwUGBAAA7AAAAAAAAAAAA"/>`;
		}

		/**
		 * Use bitbucket api to search for the user
		 * @param {integer} term name or email of the user to search.
		 */
		function searchUsersAsync(term) {
			const deferred = jQuery.Deferred();

			const searchParams = { avatarSize: 32, permission: "LICENSED_USER", start: 0, filter: term };

			jQuery.get( "/rest/api/latest/users", searchParams)
				.done(function( data ) {
					if (data.values.length > 0)
					{
						const rawd = data.values[0];
						const select2Data = {
							id: rawd.name,
							text: rawd.displayName || rawd.name,
							item: rawd };

						deferred.resolve(select2Data);
					}

					deferred.resolve(null);
				})
				.fail(function(){
				// use resolve instead of reject to avoid prematured end with $.when
					deferred.resolve(null);
				});

			return deferred.promise();
		}

		function attachDropdownClickEvent(dropdown) {
			jQuery(dropdown).find(`#${  listId}`).find('li').click(function() {
				const $element = jQuery(this);
				const reviewers = $element.data(reviewersDataKey);
				const differedList = [];
				const select2DataArray = [];

				// show loader
				jQuery(`#${buttonIconId}`).replaceWith(getGroupIconLoader());

				reviewers.forEach(function(reviewer){
					// request user data from search api
					const searchDeferred = searchUsersAsync(reviewer);
					// waiting list
					differedList.push(searchDeferred);
					// add to the array
					searchDeferred.done(function(select2Data){
						if(select2Data && pageState.getCurrentUser().id !== select2Data.item.id) {
							select2DataArray.push(select2Data);
						}
					});
				});

				jQuery.when.apply(jQuery, differedList).done(function() {
					// redisplay icon and remove loader
					jQuery(`#${buttonIconId}`).replaceWith(getGroupIcon());

					const replacePrevious = jQuery('#replaceGroups').is(':checked') || false;
					//////////// update the user selector
					// need this to reproduce the event triggered by select2 on a single selection. (change Event contain "added" or "removed" property set with an object and not an array)
					// Without that the widget/searchable-multi-selector wrapper made by atlassian won't change his data internally corrrectly

					// clean (for atlassian wrapper)
					const allUsers = AJS.$('#reviewers').auiSelect2("data");
					AJS.$('#reviewers').auiSelect2("data", null).trigger("change");
					AJS.$('#reviewers').auiSelect2("val", null).trigger("change");
					allUsers.forEach(function(item){
						const e = new jQuery.Event("change");
						e.removed = item;
						AJS.$('#reviewers').trigger(e);
					});

					if (!replacePrevious) {
						jQuery.merge(select2DataArray, allUsers);
					}

					// add (for atlassian wrapper)
					select2DataArray.forEach(function(select2Data){
						const e = new jQuery.Event("change");
						e.added = select2Data;
						AJS.$('#reviewers').trigger(e);
					});

					// update displayed value (for select2)
					AJS.$('#reviewers').auiSelect2("data", select2DataArray);
				});
			});
		}

		function injectReviewersDropdown(jsonGroups) {
			const $reviewersInput = jQuery('#s2id_reviewers');
			if ($reviewersInput.length == 0) {
				return;
			}

			// empty dropdown for reviewers group
			let checkedProperty = '';
			if((localStorage.getItem('replaceGroupsState') || false).toString().toBool()) {
				checkedProperty = ' checked="checked"';
			}

			const dropdownHTML = ([
				'<a href="#reviewers_list" aria-owns="reviewers_list" aria-haspopup="true" class="aui-button aui-style-default aui-dropdown2-trigger" style="margin-left: 10px; display: inline-block; top: -10px;">',
				getGroupIcon(),
				'</a>',
				'<div id="reviewers_list" class="aui-style-default aui-dropdown2">',
				`<ul class="aui-list-truncate" id="${ listId }">`,
				'</ul>',
				'</div>',
				'<div class="checkbox" id="replaceGroupsDiv">',
				`<input class="checkbox" type="checkbox" name="replaceGroups" id="replaceGroups"${checkedProperty}>`,
				'<label for="replaceGroups">Replace</label>',
				'</div>'
			]).join("\n");

			// jquery instance
			const $dropdown = jQuery(dropdownHTML);

			// add groups list
			jsonGroups.groups.forEach(function(group) {
				const linkText = `${group.groupName  } (${  group.reviewers.length  } reviewers)`;
				const $a = jQuery('<a href="Javascript:void(0)"></a>').text(linkText);
				const $li = jQuery('<li></li>').append($a).data(reviewersDataKey, group.reviewers);
				$dropdown.find(`#${  listId}`).append($li);
			});


			// click event
			attachDropdownClickEvent($dropdown);

			// save checkbox state on change
			$dropdown.find('#replaceGroups').on('change', function() {
				const state = jQuery(this).is(':checked') || false;
				localStorage.setItem('replaceGroupsState', state);
			});

			// fix z-index bug
			$dropdown.on({
				"aui-dropdown2-show"() {
					window.setTimeout(function(){
						jQuery("#reviewers_list").css("z-index", "4000");
					}, 50);
				}
			});

			// append to the page
			$reviewersInput.after($dropdown);
		}

		function injectTemplateButton(templateStr) {
			const buttonHTML = '<button class="aui-button aui-button-subtle aui-button-compact" title="Injects standard PR template">Standard template</button>';

			// jquery instance
			const $button = jQuery(buttonHTML);

			// click event
			$button.click(function(e) {
				e.preventDefault();
				const template = templateStr.split(',').join("\n");
				jQuery('#pull-request-description').val(template);
			});

			// append to the page
			const markDownHelp = jQuery('.pull-request-details a.markup-preview-help');
			jQuery(markDownHelp[0]).before($button);
		}

		return {
			injectTemplateButton,
			injectReviewersDropdown
		};
	});

	define('bitbucket-plugin/pullrequest-details-page', [
		'aui',
		'aui/flag',
		'jquery',
		'lodash',
		'bitbucket/util/events',
		'bitbucket/util/state',
		'bitbucket-plugin/url'
	], function (
		AJS,
		auiFlag,
		jQuery,
		_,
		events,
		pageState,
		urlUtil
	) {
		'use strict';
		//////////////////////////////////////////////////// Build with jenkins link
		function addBuildLink() {
			const pr = pageState.getPullRequest();

			if (!pr) {
				return;
			}

			//if(!jQuery('.build-status-summary').length) { }
			const $startWrapper = jQuery('<div class="plugin-item build-status-summary"></div>');
			const $startLink = jQuery('<a href="#"><span class="aui-icon aui-icon-small aui-iconfont-devtools-side-diff" title="Builds">Build status</span><span class="label">Start build test</span></a>');
			$startLink.click(function(){
				const urlBase = 'http://<yourjenkinsurl>';
				const url = `${urlBase  }/job/[your_job_name]/`;
				$startLink.find('span.label').text('Starting...');

				const userName = (window.hipchatUsername || '').replace('@', '');
				if (typeof window.chromeExtId !== 'undefined' && typeof window.chrome !== 'undefined')  {
					window.communication.runtime.sendMessage(window.chromeExtId, {
						method: 'POST',
						action: 'xhttp',
						url: `${url  }buildWithParameters`,
						data: `PULLREQUEST_ID=${  pr.id  }&HIPCHAT_USER=${  userName}`
					}, function(data) {
						$startLink.find('span.label').text('Start build test');
						if(data.status == 201) {
							auiFlag({
								type: 'info',
								title: 'Jenkins Build Started!',
								body: `<br><a href="${  url  }" target="_blank">Go to Jenkins</a>`, // shourld be data.redirect
								close: 'auto'
							});
							$startLink.unbind('click');
							$startLink.attr('href', url).attr('target', '_blank'); // should be data.redirect
							$startLink.find('span.label').text('See started job on jenkins!');
						}
						else if(data.status == 403) {
							auiFlag({
								type: 'error',
								title: 'You are not login to jenkins!',
								body: `<br><a href="${  urlBase  }/login" target="_blank">Go to Jenkins</a>`, // shourld be data.redirect
								close: 'auto'
							});
						}
						else {
							auiFlag({
								type: 'warning',
								title: 'Could not start job, please check jenkins!',
								body: `<br><a href="${  url  }" target="_blank">Go to Jenkins</a>`, // shourld be data.redirect
								close: 'auto'
							});
						}
					});
				}
				else {
					window.ajaxRequest({
						method: 'POST',
						url,
						data: {
							'PULLREQUEST_ID': pr.id,
							'HIPCHAT_USER': userName
						}
					},
					function(location) {
						auiFlag({
							type: 'info',
							title: 'Jenkins Build Started!',
							body: `<br><a href="${  location  }">Go to Jenkins</a>`,
							close: 'auto'
						});
						$startLink.unbind('click');
						$startLink.attr('href', location);
						$startLink.find('span.label').text('See started job on jenkins!');
					});
				}

				return false;
			});

			$startWrapper.append($startLink);
			jQuery('.plugin-section-primary').prepend($startWrapper);
		}

		//////////////////////////////////////////////////// Clickable branch on PR page
		function attachNavigateToBranchLink() {
			const pr = pageState.getPullRequest();

			let $branchOriginSpan = jQuery('.ref-name-from');
			if($branchOriginSpan.length === 0) {
				$branchOriginSpan = jQuery('.source-branch');
			}
			if ($branchOriginSpan.length) {
				let urlFrom = urlUtil.buildSlug(pr.fromRef.repository);
				urlFrom += `?at=${  pr.fromRef.id}`;
				//$branchOriginSpan.css('cursor', 'pointer').click(function(){ window.location.href = urlFrom; }).data('url', urlFrom);
				$branchOriginSpan.wrap(jQuery('<a></a>', { href: urlFrom }));
			}

			let $branchDestinationSpan = jQuery('.ref-name-to');
			if($branchDestinationSpan.length === 0) {
				$branchDestinationSpan = jQuery('.target-branch');
			}
			if ($branchDestinationSpan.length) {
				let urlTo = urlUtil.buildSlug(pr.toRef.repository);
				urlTo += `?at=${  pr.toRef.id}`;
				//$branchDestinationSpan.css('cursor', 'pointer').click(function(){ window.location.href = urlTo; }).data('url', urlTo);
				$branchDestinationSpan.wrap(jQuery('<a></a>', { href: urlTo }));
			}
		}

		//////////////////////////////////////////////////// dropdoan list with git checkout commands
		function retrieveLastCommitOfBranch(repoBrowseUrl, branchPath) {
			const relativeUrl = repoBrowseUrl.replace('browse', 'commits');
			const url = `/rest/api/1.0${  relativeUrl  }?until=${  branchPath  }&limit=1`;

			return jQuery.get(url)
				.then(function(data) {
					return  data.values.length > 0 ? data.values[0].id : '';
				});
		}
		function addCheckoutLink() {
			const pr = pageState.getPullRequest();

			if (!pr.fromRef.repository.project) {
				console.info('no rights to display checkout dropdown');
				return;
			}

			let cloneUrl;
			const repoName = pr.fromRef.repository.name;
			const branchOrigin = pr.fromRef.displayId;
			let remoteName = pr.fromRef.repository.project.owner ? pr.fromRef.repository.project.owner.slug : pr.fromRef.repository.project.name;

			if(!pr.fromRef.repository.links.clone) {
				const $noPermissionsLink = jQuery(['<div class="pull-request-checkout"><a id="s2id_ddCheckoutCommand" href="#ddCheckoutCommand" aria-owns="ddCheckoutCommand" aria-haspopup="true" class="ddCheckoutCommandPR aui-button aui-style-default aui-dropdown2-trigger">',
					'<span class="aui-icon aui-icon-small aui-iconfont-devtools-checkout"></span> ',
					'<span class="name" title="copy git checkout cmmands to paste to terminal">Checkout</span> ',
					'</a>',
					'<div id="ddCheckoutCommand" class="aui-style-default aui-dropdown2">',
					'	<ul class="aui-list-truncate">',
					'		<li data-action=""><a href="javascript:void(0)" class="checkoutCommand_link" id="nothing">Sorry you don\'t have clone permission</a></li>',
					'	</ul>',
					'</div></div>'].join('\n'));
				if(jQuery('.pull-request-metadata-primary').length > 0) {
					jQuery('.pull-request-metadata-primary').find('.pull-request-branches').after($noPermissionsLink);
				} else {
					jQuery('.pull-request-metadata').append($noPermissionsLink);
				}

				return;
			}

			pr.fromRef.repository.links.clone.forEach(function(clone) {
				if(clone.name === 'ssh') {
					cloneUrl =clone.href;
				}
			});

			if(!cloneUrl) {
				cloneUrl = pr.fromRef.repository.links.clone[0].href;
			}

			const $link =jQuery(['<div class="pull-request-checkout"><a id="s2id_ddCheckoutCommand" href="#ddCheckoutCommand" aria-owns="ddCheckoutCommand" aria-haspopup="true" class="ddCheckoutCommandPR aui-button aui-style-default aui-dropdown2-trigger">',
				'<span class="aui-icon aui-icon-small aui-iconfont-devtools-checkout"></span> ',
				'<span class="name" title="copy git checkout cmmands to paste to terminal">Checkout</span> ',
				'</a>',
				'<div id="ddCheckoutCommand" class="aui-style-default aui-dropdown2">',
				'	<ul class="aui-list-truncate">',
				'		<li data-action="clone"><a href="javascript:void(0)" class="checkoutCommand_link" id="cloneCommand">Clone</a></li>',
				'		<li data-action="newremote"><a href="javascript:void(0)" class="checkoutCommand_link" id="remoteCommand">Add remote</a></li>',
				'		<li data-action="newremotenewbranch"><a href="javascript:void(0)" class="checkoutCommand_link">Add remote/Create branch</a></li>',
				'		<li data-action="newbranch"><a href="javascript:void(0)" class="checkoutCommand_link">Create branch</a></li>',
				'		<li data-action="checkout"><a href="javascript:void(0)" class="checkoutCommand_link">Checkout existing</a></li>',
				'	</ul>',
				'</div></div>'].join('\n'));

			// git remote naming
			window.repoMapArray.forEach(function(map){
				if(map.repo === remoteName) {
					remoteName = map.remote;
				}
			});

			// get last commit of the source branch
			retrieveLastCommitOfBranch(urlUtil.buildSlug(pr.fromRef.repository), pr.fromRef.displayId).then(function(lastBranchCommit){
				// git commands
				const cloneCommand = `git clone ${ cloneUrl  } ${  repoName  }_${  remoteName}`;
				const addOriginCommand = `git remote add ${ remoteName  } ${  cloneUrl}`;
				const fetchCommand = `git fetch ${  remoteName}`;
				let checkoutNewCommand = `git checkout --track ${  remoteName  }/${  branchOrigin}`;
				let checkoutCommand = `git checkout ${  branchOrigin}`;
				const checkoutLastCommit = `git checkout ${  pr.fromRef.latestCommit}`;

				if (lastBranchCommit !== pr.fromRef.latestCommit) {
					checkoutNewCommand += `; ${  checkoutLastCommit}`;
					checkoutCommand += `; ${  checkoutLastCommit}`;
				}

				let command = '';
				let ddlClicked = false;

				// inject
				if(jQuery('.pull-request-metadata-primary').length > 0) {
					// bitbucket v4.3
					jQuery('.pull-request-metadata-primary').find('.pull-request-branches').after($link);
				} else {
					jQuery('.pull-request-metadata').append($link);
				}

				jQuery('.checkoutCommand_link').click(function(e){
					ddlClicked = true;
					const action = jQuery(e.target).data('action') || jQuery(e.target).parent().data('action');
					switch(action) {
					case 'clone': command = cloneCommand;
						document.execCommand('copy');
						break;
					case 'newremote': command = `${addOriginCommand  }; ${  fetchCommand  };`;
						document.execCommand('copy');
						break;
					case 'newremotenewbranch': command = `${addOriginCommand  }; ${  fetchCommand  }; ${  checkoutNewCommand}`;
						document.execCommand('copy');
						break;
					case 'newbranch': command = `${fetchCommand  }; ${  checkoutNewCommand}`;
						document.execCommand('copy');
						break;
					case 'checkout': command = `${fetchCommand  }; ${  checkoutCommand}`;
						document.execCommand('copy');
						break;
					default: break;
					}
				});

				jQuery('#cloneCommand').append(` (<span style="font-size:xx-small">${repoName  }_${  remoteName}</span>)`);
				jQuery('#remoteCommand').append(` (<span style="font-size:xx-small">${remoteName}</span>)`);


				jQuery(document).on('copy', function (e) {
					if(ddlClicked) {
						e.preventDefault();
						if (e.originalEvent.clipboardData) {
							e.originalEvent.clipboardData.setData('text/plain', command);
							auiFlag({
								type: 'info',
								title: 'Command copied!',
								body: 'just paste it in your terminal.',
								close: 'auto'
							});
						}
						else if (window.clipboardData) {
							auiFlag({
								type: 'info',
								title: 'Sorry copy api is not available!',
								body: 'Try to update your browser.',
								close: 'auto'
							});
						}

						ddlClicked = false;
					}
				});
			});
		}

		//////////////////////////////////////////////////// to go to the corresponding ticket when middle click jira ticket link
		function replaceJiraLink() {
			const href = jQuery('.pull-request-issues-trigger').attr('href') || '';
			jQuery('.pull-request-issues-trigger').attr('href', href.replace('https://jira.rakuten-it.com/jira/', 'https://rakuten.atlassian.net/'))
		}

		//////////////////////////////////////////////////// display on overview page when there is conflicts
		function displayConflicts() {
			const pr = pageState.getPullRequest();

			// get pr changes details
			const url = `/rest/api/1.0${  urlUtil.buildSlug(pr)  }/changes`

			jQuery.get(url).done(function(prDetails) {
				let conflictsCount = 0;
				prDetails.values.forEach(function(details) {
					if(details.conflict) {
						conflictsCount++;
					}
				});

				if(conflictsCount > 0) {
					const $message = AJS.messages.warning({
						title:"Conflicts found !",
						body: `<p> There is ${conflictsCount} conflicts. Please solve it. </p>`,
						closeable: true
					});

					jQuery('.pull-request-metadata').after($message);
				}
			});
		}

		return {
			addBuildLink,
			attachNavigateToBranchLink,
			replaceJiraLink,
			addCheckoutLink,
			displayConflicts
		}
	});

	define('bitbucket-plugin/header-notification', [
		'aui',
		'aui/flag',
		'jquery',
		'lodash',
		'bitbucket/util/events',
		'bitbucket/util/state',
		'bitbucket/util/navbuilder',
		'bitbucket/util/server',
		'moment',
		'bitbucket-plugin/url'
	], function (
		AJS,
		auiFlag,
		jQuery,
		_,
		events,
		pageState,
		nav,
		ajax,
		moment,
		urlUtil
	) {
		'use strict';
		String.prototype.toBool = function(){
			return this.toString().toLowerCase() === 'true';
		};

		const NotificationType = { badge:'badge_', panel: 'panel_' };

		//////////////////////////////////////////////////// Toolbar icon functions
		let deferredPrRequest;

		function filterAnOrderActivities(activities) {
			const user = pageState.getCurrentUser();
			const returnedActivities = [];
			activities.forEach(function(activity){
				//if (activity.action == 'RESCOPED') {
				//return false;
				//}
				let outdated = false;
				if (activity.diff && activity.diff.properties) {
					outdated = !activity.diff.properties.current;
				}

				if (activity.action === 'COMMENTED' && !outdated && (activity.user.name !== user.name || countSubComments(activity.comment).total || countTasks(activity.comment).total)) {
					jQuery.extend(activity, {activityDate: getMostRecentActivityDate(activity.comment) });
					returnedActivities.push(activity);
				}
			});

			return _.sortBy(returnedActivities, 'activityDate').reverse();
		}

		function getLastPRCommentsAsync() {
			const deferredResult = jQuery.Deferred();
			const allPR = [];
			// get lastest PR
			const reqParams = {
				start: 0,
				limit: 1000,
				avatarSize: 96,
				withAttributes:true,
				state: 'OPEN',
				order: 'oldest',
				role: 'reviewer'
			};

			const urlSegments = ['rest', 'inbox', 'latest', 'pull-requests'];
			const urlSegmentsNew = ['rest', 'api', 'latest', 'inbox', 'pull-requests'];

			const reviewersDefered = jQuery.Deferred()
			const resolveReviewers = function(data) {
				reviewersDefered.resolve();
				return data;
			}
			const authorDefered = jQuery.Deferred()
			const resolveAuthor = function(data) {
				authorDefered.resolve();
				return data;
			}

			const buildUrlPR = function(segments, role){
				reqParams.role = role;
				return nav.newBuilder(segments).withParams(reqParams).build();
			}
			const mergeResults = function(data){
				jQuery.merge(allPR, data.values)
			};
			const rerunRequest = function(role) {
				return function(err) {
					const resolveDeferred = role === 'reviewer' ? resolveReviewers : resolveAuthor;
					if(err.status == 404) {
						return jQuery
							.get(buildUrlPR(urlSegments, role))
							.then(mergeResults)
							.then(resolveDeferred);
					}
				}
			};
			const rerunRequestReviewers = rerunRequest('reviewer');
			const rerunRequestAuthor = rerunRequest('author');

			jQuery
				.get(buildUrlPR(urlSegmentsNew, 'reviewer'))
				.then(mergeResults)
				.then(resolveReviewers)
				.fail(rerunRequestReviewers);

			jQuery
				.get(buildUrlPR(urlSegmentsNew, 'author'))
				.then(mergeResults)
				.then(resolveAuthor)
				.fail(rerunRequestAuthor);

			jQuery.when(reviewersDefered, authorDefered).done(function(){
				let activities = [];
				const requests = [];
				// loop through PRs and request activities
				allPR.forEach(function(pr){
					requests.push(jQuery.get(`/rest/api/1.0${  urlUtil.buildSlug(pr)  }/activities?avatarSize=96`).done(function(activityList){
					// get comments after PR was updated
						jQuery.each(activityList.values, function(index, activity){
							jQuery.extend(activity, { pullrequest: pr });
							activities.push(activity);
						});
					}));
				});

				jQuery.when.apply(jQuery, requests).always(function(){
					activities = filterAnOrderActivities(activities);
					deferredResult.resolve(activities);
				});
			});

			return deferredResult;
		}

		function getLastPRCommentsOnceAsync() {
			if (!deferredPrRequest || deferredPrRequest.state() === 'rejected') {
				deferredPrRequest = getLastPRCommentsAsync();
			}

			// return previous retried activities
			return deferredPrRequest.promise();
		}

		function getMostRecentActivityDate(comment) {
			let date = comment.createdDate;

			comment.tasks.forEach(function(task){
				date = task.createdDate > date ? task.createdDate : date;
			});

			comment.comments.forEach(function(subcomment){
				const newDate = getMostRecentActivityDate(subcomment);
				date = newDate > date ? newDate : date;
			});

			return date;
		}

		function filterSubcomments(comment) {
			const user = pageState.getCurrentUser();
			return _.filter(comment.comments, function(c){ return c.author.name !== user.name; });
		}

		function filterTasks(comment) {
			const user = pageState.getCurrentUser();
			return _.filter(comment.tasks, function(t){ return t.author.name !== user.name && t.state === "OPEN"; });
		}

		function countSubComments(comment) {
			const count = { total: 0, unread: 0 };
			const subCommentsFromOthers = filterSubcomments(comment);
			count.total += subCommentsFromOthers.length;
			count.unread += _.filter(subCommentsFromOthers, function(c){ return !c.isPanelRead }).length;

			comment.comments.forEach(function(subcomment){
				const result = countSubComments(subcomment);
				count.total += result.total;
				count.unread += result.unread;
			});

			return count;
		}

		function countTasks(comment) {
			const count = { total: 0, unread: 0 };
			const taskFromOthers = filterTasks(comment);
			count.total += taskFromOthers.length;
			count.unread += _.filter(taskFromOthers, function(t){ return !t.isPanelRead }).length;

			comment.comments.forEach(function(subcomment){
				const result = countTasks(subcomment);
				count.total += result.total;
				count.unread += result.unread;
			});

			return count;
		}

		function countUnreadActivities(activities, prefix) {
			prefix = prefix || '';
			let count = 0;
			const user = pageState.getCurrentUser();

			activities.forEach(function(activity){
				// verify the comment itself
				const isCommentRead = (localStorage.getItem(`${prefix  }comment_${  activity.comment.id}`) || false).toString().toBool();

				if (prefix === NotificationType.panel) {
					jQuery.extend(activity.comment, {isPanelRead: isCommentRead });
				}
				else {
					jQuery.extend(activity.comment, {isBadgeRead: isCommentRead });
				}

				count +=isCommentRead ? 0 : activity.comment.author.name !== user.name ? 1 : 0;

				// sub comments
				activity.comment.comments.forEach(function(subComment){
					// count sub sub comments
					count += countUnreadActivities([{ comment: subComment }], prefix);
				});

				// tasks
				filterTasks(activity.comment).forEach(function(task){
					const isTaskRead = (localStorage.getItem(`${prefix  }task_${  task.id}`) || false).toString().toBool();
					if (prefix === NotificationType.panel) {
						jQuery.extend(task, {isPanelRead: isTaskRead });
					}
					else {
						jQuery.extend(task, {isBadgeRead: isTaskRead });
					}
					count += isTaskRead ? 0 : 1;
				});
			});

			// if false continue to verify tasks
			return count;
		}

		function hasUnreadActivities(activity, prefix) {
			return countUnreadActivities([activity], prefix) > 0;
		}

		const htmlComments = {};
		function markdownToHtml(msg, msgId) {
			if (htmlComments[msgId]) {
				return jQuery.Deferred().resolve(htmlComments[msgId]).promise();
			}

			const url = nav.rest().markup().preview().build();
			return ajax.rest({
				type: 'POST',
				url,
				data: msg,
				dataType: 'json'
			}).then(function(result){
				htmlComments[msgId] = result.html;
				return result.html;
			});
		}

		function markActivitiesAsRead(activities, prefix) {
			prefix = prefix || '';
			activities.forEach(function(activity){
				localStorage.setItem(`${prefix  }comment_${  activity.comment.id}`, true);

				activity.comment.comments.forEach(function(subComment){
					markActivitiesAsRead([{ comment:subComment }], prefix);
				});

				activity.comment.tasks.forEach(function(task){
					localStorage.setItem(`${prefix  }task_${  task.id}`, true);
				});
			});
		}

		function generateCommentsTable(activities) {
			let $table = jQuery('<table></table>')
				.addClass('aui')
				.addClass('paged-table')
				.addClass('comments-table');

			// header
			$table.append('<thead>').find('thead').append('<tr>').find('tr')
				.append('<th class="author">Author</th>')
				.append('<th class="comment">Comment</th>')
				.append('<th class="title">PR</th>')
				.append('<th class="updated">Updated</th>')
				.append('<th class="comment-count">Activities</th>');

			// body
			const $tbody = $table.append('<tbody>').find('tbody');
			activities.forEach(function(activity) {
				const $msgRow = jQuery(`<td class="comment message markup">${activity.comment.text}</td>`);
				const $userRow = jQuery(`<td class="author">${activity.comment.author.name}</td>`);
				const $countRow = jQuery('<td class="comment-count"></td>');
				const $prRow = jQuery(`<td class="title"><a href="${  urlUtil.buildSlug(activity.pullrequest)  }/overview?commentId=${activity.comment.id}" title="{${activity.pullrequest.author.user.name}} ${activity.pullrequest.title}">${activity.pullrequest.title}</a></td>`);
				const $updatedRow = jQuery('<td class="comment-count"></td>').html(moment(activity.activityDate).fromNow());

				const isLineUnread = hasUnreadActivities(activity, NotificationType.panel);
				const isBadgeUnread = hasUnreadActivities(activity, NotificationType.badge);

				// convert raw msg to html
				markdownToHtml(activity.comment.text, activity.comment.id).done(function(msg) {
					$msgRow.html(msg);
				});

				// avatar
				const $avatar = jQuery(bitbucket.internal.widget.avatar({
					size: 'small',
					person: activity.comment.author,
					tooltip: activity.comment.author.displayName
				}));
				$userRow.html($avatar);
				$avatar.find('img').tooltip();

				// sub comments count
				const commentCount = countSubComments(activity.comment);
				const $commentsCount = jQuery(`<span class="comment-count" title="${  commentCount.unread  } new unread comments">`);
				$commentsCount.append(jQuery(aui.icons.icon({
					useIconFont: true,
					icon: 'comment',
					accessibilityText: 'comments'
				})));
				const $commentDigit = jQuery(`<span>${  commentCount.total  }<span>`);
				if(commentCount.unread > 0) {
					$commentsCount.addClass('digit-unread');
				}
				$commentsCount.append($commentDigit);
				$commentsCount.tooltip();

				// task count
				const taskCount = countTasks(activity.comment);
				const $tasksCount = jQuery(`<span class="pr-list-open-task-count" title="${  taskCount.unread  } new unread tasks">`);
				$tasksCount.append(jQuery(aui.icons.icon({
					useIconFont: true,
					icon: 'editor-task',
					accessibilityText: 'tasks'
				})));
				const $taskDigit = jQuery(`<span class="task-count">${  taskCount.total  }<span>`);
				if(taskCount.unread > 0) {
					$tasksCount.addClass('digit-unread');
				}
				$tasksCount.append($taskDigit);
				$tasksCount.tooltip();

				// append to cell
				$countRow
					.append($commentsCount)
					.append($tasksCount);

				// build row
				const $tr = $tbody.append('<tr>').find('tr:last-child');
				if(isLineUnread) {
					$tr.addClass('line-unread');
				}
				if (isBadgeUnread) {
					$tr.addClass('line-unread-strong');
				}

				$prRow.find('a').tooltip();

				$tr.append($userRow)
					.append($msgRow)
					.append($prRow)
					.append($updatedRow)
					.append($countRow);
			});

			if (activities.length === 0) {
				$table = AJS.messages.info({
					title:"No comments",
					body: "<p> There is no comment on any open pull request! </p>",
					closeable: false
				});
			}

			return $table;
		}

		function updateChromeIconBadge(badgeText) {
			if (typeof window.chromeExtId !== 'undefined' && typeof window.chrome !== 'undefined')  {
				window.communication.runtime.sendMessage(window.chromeExtId, { action: 'setBadgeCount', badgeCount: badgeText.toString() });
			}
		}

		function updateUI($content, forceReload, desktopNotification) {
			forceReload = forceReload || false;
			desktopNotification = desktopNotification || false;
			const $toolbar = jQuery('#inbox-messages');
			let $spinner

			// display loader in panel
			if($content) {
				$spinner = jQuery('<div class="loading-resource-spinner"></div>');
				jQuery('#global-div-comments-notif').remove();
				const $globalDiv = jQuery('<div id="global-div-comments-notif"></div>');
				$globalDiv.append('<h2>Last pull requests comments</h2>');
				$globalDiv.append($spinner);
				$content.empty().append($globalDiv);
				$spinner.show().spin('medium');
			}

			const dataLoader = forceReload ? getLastPRCommentsAsync : getLastPRCommentsOnceAsync;
			dataLoader()
				.always(function() {
					if($content) {
						$content.empty();
						$spinner.spinStop().remove();
					}
				})
				.done(function(activities) {
				// desktop notification on chrome
					if (!$content && desktopNotification) {
						displayDesktopNotification(activities);
					}
					// update icon
					const eventCount = countUnreadActivities(activities, NotificationType.badge);
					if(!$content) {
						$toolbar.find('.aui-badge').remove();
						updateChromeIconBadge('');
						if (eventCount > 0) {
							const $badge = jQuery(aui.badges.badge({
								text: eventCount
							}));
							$toolbar.append($badge);
							setTimeout(function() {
							// Needed for the transition to trigger
								$badge.addClass('visible');
							}, 0);

							updateChromeIconBadge(eventCount);
						}
					}

					// update panel
					if($content) {
						jQuery('#global-div-comments-notif').remove();
						const $globalDiv = jQuery('<div id="global-div-comments-notif"></div>');
						$globalDiv.append('<h2>Last pull requests comments</h2>');
						const $wrapper = jQuery('<div class="inbox-table-wrapper aui-tabs horizontal-tabs"></div>');
						$wrapper.append(generateCommentsTable(activities));
						$globalDiv.append($wrapper);
						$content.append($globalDiv);
						// remove badge notification. Panel highlight notification are remove when PR is open
						markActivitiesAsRead(activities, NotificationType.badge);
					}
				});
		}

		function createCommentsDialog() {
			let inlineDialog;

			const onShowDialog = function ($content, trigger, showPopup) {
				showPopup();
				jQuery(document).on('keyup', hideOnEscapeKeyUp);

				// hide if another dialog is shown
				AJS.dialog2.on('show', hideOnDialogShown);

				updateUI($content);
			};

			const hideOnEscapeKeyUp = function(e) {
				if(e.keyCode === jQuery.ui.keyCode.ESCAPE) {
					inlineDialog.hide();
					e.preventDefault();
				}
			};

			const onHideDialog = function () {
				jQuery(document).off('keyup', hideOnEscapeKeyUp);
				AJS.dialog2.off('show', hideOnDialogShown);

				if (jQuery(document.activeElement).closest('#inbox-messages-content').length) {
					// if the focus is inside the dialog, you get stuck when it closes.
					document.activeElement.blur();
				}

				// refresh icon notify count
				updateUI();
			};

			const hideOnDialogShown = function () {
				inlineDialog.hide();
			};

			const $inboxTrigger = jQuery("#inbox-messages");
			if ($inboxTrigger.length && pageState.getCurrentUser()) {
				inlineDialog = AJS.InlineDialog($inboxTrigger, 'inbox-messages-content', onShowDialog, {
					width: 870,
					hideCallback: onHideDialog
				});
			}

			return inlineDialog;
		}

		function displayDesktopNotification(activities) {
			if(Notification.permission !== "granted" || window.notificationState.toString() === '0') {
				return;
			}
			const user = pageState.getCurrentUser();
			const prefix = "notif_";

			activities.forEach(function(activity){
				const commentKey = `${prefix  }comment_${  activity.comment.id}`;
				const state = localStorage.getItem(commentKey);
				localStorage.setItem(commentKey, true);

				let isIncluded = true; // all notifications
				if(window.notificationType.toString() === '0') { // prAndMentioned only (also include answer)
					isIncluded = false;
					// filter PR which are not from current user
					if(activity.pullrequest.author.user.name === user.name) {
						isIncluded = true;
					}

					// filter mentioned
					if(activity.comment.text.indexOf(`@"${user.name}"`) > -1) {
						isIncluded = true;
					}

					// is an answer to current user message
					if(activity.wasOwner) {
						isIncluded = true;
					}
				}

				const notYetViewed = !(state || false).toString().toBool();
				// notification for comments
				if(isIncluded && activity.comment.author.name !== user.name && notYetViewed) {
					const commentNotifTitle = `${activity.comment.author.name } commented on : "${  activity.pullrequest.title  }"`;
					const notification = new Notification(commentNotifTitle, {
						icon: activity.comment.author.avatarUrl || window.stashIcon,
						body: activity.comment.text,
						eventTime: activity.comment.createdDate,
						isClickable: true
					});

					notification.onclick = function () {
						window.open(`${urlUtil.getSiteBaseURl() + urlUtil.buildSlug(activity.pullrequest)  }/overview?commentId=${  activity.comment.id}`);
					};
				}

				// notification for subcomments (answers)
				activity.comment.comments.forEach(function(subComment){
					displayDesktopNotification([{
						comment: subComment,
						pullrequest: activity.pullrequest,
						wasOwner: activity.wasOwner || activity.comment.author.name === user.name
					}]);
				});

				// notification for task
				activity.comment.tasks.forEach(function(task){
					const taskKey = `${prefix  }task_${  task.id}`;
					const taskState = localStorage.getItem(taskKey);
					localStorage.setItem(taskKey, true);

					const notYetViewed = !(taskState || false).toString().toBool();
					if(window.notificationType.toString() !== '0' && task.author.name !== user.name && notYetViewed) {
						const taskNotifTitle = `${activity.comment.author.name } created task on : "${ activity.pullrequest.title }"`;
						const notification = new Notification(taskNotifTitle, {
							icon: task.author.avatarUrl || window.stashIcon,
							body: task.text,
							eventTime: task.createdDate,
							isClickable: true
						});

						notification.onclick = function () {
							window.open(`${urlUtil.getSiteBaseURl() + urlUtil.buildSlug(activity.pullrequest)  }/overview?commentId=${  activity.comment.id}`);
						};
					}

				});
			});
		}

		function addMessagesToolbarIcon() {
			/// toolbar icon
			const button = ['<li class="" title="Last PR messages">',
				'<a href="#inbox-messages" id="inbox-messages" title="Last PR messages">',
				'<span class="aui-icon aui-icon-small aui-iconfont-hipchat"></span>',
				'</a>',
				'</li>'].join('\n');


			jQuery('.help-link').after(button);

			updateUI(false, false, true);
			createCommentsDialog();

			// as desktop notification authorization
			if (Notification.permission !== "granted") {
				Notification.requestPermission();
			}

			// periodically poll server for update
			if (typeof window.chromeExtId !== 'undefined' && typeof window.chrome !== 'undefined')  {
				// use background worker to centralized request and avoid to much server queries
				window.communication.runtime.sendMessage(window.chromeExtId, { action: 'setUrl', url: urlUtil.getSiteBaseURl() });

				const activitiesCallback = function (eventArgs) {
					const activities = filterAnOrderActivities(eventArgs.activities);
					if (deferredPrRequest.state() !== 'pending') {
						deferredPrRequest = jQuery.Deferred();
						deferredPrRequest.resolve(activities);
						updateUI(false, false, eventArgs.desktopNotification);
					}
				};
				// chrome
				document.addEventListener('ActivitiesRetrieved', function(eventArgs) {
					if(window.chromeExtId !== 'stashFF' && eventArgs && eventArgs.detail)
						activitiesCallback(eventArgs.detail);
				}, false);
				// ff
				window.addEventListener('message', function(eventArgs) {
					if(eventArgs && eventArgs.data &&  eventArgs.data.detail)
						if(eventArgs.data.detail.identifier === 'ActivitiesRetrieved')
							activitiesCallback(eventArgs.data.detail);
				});
			}
		}

		function markActivitiesAsReadWhenPullRequestOpened() {
			const pr = pageState.getPullRequest();
			if (pr) {
				getLastPRCommentsOnceAsync().done(function(activities){
					activities = _.filter(activities, function(a){ return a.pullrequest.id === pr.id; });
					markActivitiesAsRead(activities, NotificationType.badge);
					markActivitiesAsRead(activities, NotificationType.panel);
				});
			}
		}

		function checkForUpdate(){
			if (typeof window.chromeExtId !== 'undefined' && typeof window.chrome !== 'undefined')  {
				window.communication.runtime.sendMessage(window.chromeExtId, {
					method: 'GET',
					action: 'xhttp',
					url: 'https://raw.githubusercontent.com/dragouf/Stash-Reviewers-Chrome-Extension/master/version'
				}, function(data) {
					if(!data) {
						data = {
							response: 'cant.reach.github'
						};
					}
					else if ((data.response || { response: '' }).length > 10) {
						// it's not version file we retrieved
						data.response = 'cant.check.version';
					}
					const currentVersion = window.stashRGEVersion.toString().trim();
					const newVersion = data.response.toString().trim();
					const storedVersion = (localStorage.getItem('stashRGEVersion') || '').toString().trim();

					if(newVersion !== storedVersion && newVersion !== currentVersion) {
						let body = '<br>Please pull changes with git to update';

						if (data.response === 'cant.reach.github') {
							body = "Please check you added your bitbucket server domain to extension manifest.json";
						}
						else if(data.response === 'cant.check.version') {
							body = "Can't connect to github to check version.";
						}

						body += '<br><br><a href="https://github.com/dragouf/Stash-Reviewers-Chrome-Extension/blob/master/history" target="_blank">See history (repository)</a>';
						body += ' <a id="skipVersionLink" href="javascript:window.hideStashRGEVersion();" style="float:right">Skip this version</a>';

						const flag = auiFlag({
							type: 'info',
							title: `New version of the extension (${ data.response })`,
							body,
							close: 'auto'
						});

						window.hideStashRGEVersion = function() {
							localStorage.setItem('stashRGEVersion', newVersion);
							flag.close();
						}
					}
				});
			}
		}

		function removeAnnouncement() {
			if(localStorage.getItem('wittified-banner')) {
				const data = JSON.parse(localStorage.getItem('wittified-banner'));
				const today = new Date().getTime();
				const days = Math.floor((today - data.timestamp) / 1000 / 86400);
				if(days > 6) {
					localStorage.removeItem('wittified-banner');
				}
				jQuery('section.notifications').remove();
				return;
			}

			const $closeSpan = jQuery('<span class="aui-icon icon-close" role="button" tabindex="0"></span>');
			$closeSpan.click(function() {
				jQuery('section.notifications').remove();
				localStorage.setItem('wittified-banner',  JSON.stringify({value: true, timestamp: new Date().getTime()}));
			});
			jQuery('section.notifications .aui-message').addClass('closeable').append($closeSpan);
		}

		return {
			addMessagesToolbarIcon,
			markActivitiesAsReadWhenPullRequestOpened,
			checkForUpdate,
			removeAnnouncement
		}
	});

	define('bitbucket-plugin/pullrequest-list-modifier', [
		'bitbucket/internal/feature/pull-request/pull-request-table',
		'jquery'
	], function(PullRequestsTable, jQuery) {
		'use strict';
		function redefinePullRequestTable() {
			//redefined filter builder to include new parameters
			PullRequestsTable.prototype.buildUrl = function (start, limit) {
				const self = this;
				let builder = self.pullRequestsNavBuilder().withParams({
						start,
						limit,
						avatarSize: bitbucket.internal.widget.avatarSizeInPx({ size: 'medium' }),
						withAttributes: true
					});

				if (self.prDirection) {
					builder = builder.withParams({
						direction: self.prDirection
					});
				}
				if (self.prSource) {
					builder = builder.withParams({
						at: self.prSource
					});
				}
				if (self.prState) {
					builder = builder.withParams({
						state: self.prState
					});
				}
				if (self.prOrder) {
					builder = builder.withParams({
						order: self.prOrder
					});
				}

				let lastIndex = 0;
				if (self.prAuthors && self.prAuthors.length) {
					self.prAuthors.forEach(function(u){
						lastIndex++;
						const params = {};
						params[`username.${  lastIndex}`] = u.name;
						params[`role.${  lastIndex}`] = "AUTHOR";
						builder = builder.withParams(params);
					});
				}

				if (self.prReviewers && self.prReviewers.length) {
					self.prReviewers.forEach(function(u){
						lastIndex++;
						const params = {};
						params[`username.${  lastIndex}`] = u.name;
						params[`role.${  lastIndex}`] = "REVIEWER";
						builder = builder.withParams(params);
					});
				}

				if (self.prParticipants && self.prParticipants.length) {
					self.prParticipants.forEach(function(u){
						lastIndex++;
						const params = {};
						params[`username.${  lastIndex}`] = u.name;
						params[`role.${  lastIndex}`] = "PARTICIPANT";
						builder = builder.withParams(params);
					});
				}

				if (self.prApprovers && self.prApprovers.length) {
					self.prApprovers.forEach(function(u){
						lastIndex++;
						const params = {};
						params[`username.${  lastIndex}`] = u.name;
						params[`approved.${  lastIndex}`] = true;
						params[`role.${  lastIndex}`] = "REVIEWER";
						builder = builder.withParams(params);
					});
				}

				return builder.build();
			};

			const originalRowHandler = PullRequestsTable.prototype.handleNewRows
			PullRequestsTable.prototype.handleNewRows = function (data, attachmentMethod) {
				const self = this;
				originalRowHandler.call(self, data, attachmentMethod);
				const commitList = data.values.map(function(pr) {
					return { commit: pr.fromRef.latestCommit, prId: pr.id }
				});

				getPRBuildStatus(commitList).done(function(buildDetails){
					// add build column
					if(self.$table.find('th.build-status-pr-list-col').length == 0) {
						const $buildCol = jQuery('<th>', {
							class: "build-status-pr-list-col",
							title: 'Builds',
							scope: 'col',
							style: "display: table-cell;",
							text: 'Builds'
						});
						self.$table.find('tr:first').append($buildCol);
					}

					const rows = self.$table.find('tr.pull-request-row');
					rows.each(function(_index, row){
						const $row = jQuery(row);
						if($row.find('.build-status-pr-list-col-value').length == 0) {
							const $buildCell = jQuery('<td>', { class: "build-status-pr-list-col-value" });
							$buildCell.data('pullrequestid', $row.data('pullrequestid'));
							$row.append($buildCell);
						}
					});

					// add data to build cell
					buildDetails.forEach(function(buildStatus) {
						// find row and add build status
						const cells = jQuery('td.build-status-pr-list-col-value');
						const cell = cells.filter(function(_, td) {  return jQuery(td).data('pullrequestid') == buildStatus.prId });
						if(cell) {
							const $buildInfoLink = jQuery('<a>', {
								href:"#",
								class:"aui-icon aui-icon-small build-icon",
								'data-commit-id': buildStatus.commit
							});

							let appendIcon = false;
							if(buildStatus.inProgress) {
								$buildInfoLink.data('data-build-status', 'INPROGRESS');
								$buildInfoLink.attr('title', `${buildStatus.inProgress  } builds in progress`);
								$buildInfoLink.addClass('aui-iconfont-time');
								$buildInfoLink.addClass('inprogress-build-icon');
								appendIcon = true;
							} else if(buildStatus.failed) {
								$buildInfoLink.data('data-build-status', 'FAILED');
								$buildInfoLink.attr('title', `${buildStatus.failed  } builds failed`);
								$buildInfoLink.addClass('aui-iconfont-error');
								$buildInfoLink.addClass('failed-build-icon');
								appendIcon = true;
							} else if(buildStatus.successful > 0) {
								$buildInfoLink.data('data-build-status', 'SUCCESSFUL');
								$buildInfoLink.attr('title', `${buildStatus.successful  } builds passed`);
								$buildInfoLink.addClass('aui-iconfont-approve');
								$buildInfoLink.addClass('successful-build-icon');
								appendIcon = true;
							}

							if(appendIcon) {
								cell.html($buildInfoLink);
								$buildInfoLink.tooltip();
							}
						}
					});
				});
			};
		}

		function getPRBuildStatus(commitList) {
			const commitIds = commitList.map(function(pr) { return pr.commit });
			return jQuery.ajax('/rest/build-status/latest/commits/stats', {
				method: 'POST',
				headers: {
					Accept : "application/json, text/javascript, */*;",
					"Content-Type": "application/json"
				},
				data: JSON.stringify(commitIds),
				dataType: 'json'
			})
				.then(function(data) {
					jQuery.each(data, function(commitId, info){
						const commit = commitList.filter(function(cl) { return cl.commit === commitId });
						if(commit.length > 0) {
							jQuery.extend(commit[0], info);
						}
					});

					return commitList;
				});
		}

		return {
			redefinePullRequestTable
		}
	});

	define('bitbucket-plugin/pullrequest-list-page', [
		'aui',
		'aui/flag',
		'jquery',
		'lodash',
		'bitbucket/util/events',
		'bitbucket/util/server',
		'bitbucket/util/state',
		'bitbucket/util/navbuilder',
		'bitbucket/internal/feature/pull-request/pull-request-table',
		'bitbucket/internal/widget/searchable-multi-selector',
		'bitbucket/internal/feature/user/user-multi-selector',
		'bitbucket/internal/widget/avatar-list',
		'bitbucket/internal/feature/repository/branch-selector',
		'bitbucket/internal/model/revision-reference'
	], function (
		AJS,
		auiFlag,
		jQuery,
		_,
		events,
		ajax,
		pageState,
		nav,
		PullRequestsTable,
		SearchableMultiSelector,
		UserMultiSelector,
		avatarList,
		BranchSelector,
		revisionReference
	) {
		'use strict';
		//////////////////////////////////////////////////// Add filter to Pull Request list
		// utilities
		function getParameterByName(name) {
			name = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]");
			const regex = new RegExp(`[\\?&]${  name  }=([^&#]*)`)
			const results = regex.exec(location.search);
			return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
		}

		function addPrFilters() {
			if(jQuery('#pull-requests-content').length === 0) {
				return;
			}
			jQuery('.spinner').show();

			function getPullRequestsUrlBuilder() {
				return nav.rest().currentRepo().allPullRequests();
			}

			// recreate table to control it
			const state = getParameterByName('state') || 'OPEN';
			const author = getParameterByName('author') || '';
			const targeting = getParameterByName('at') || '';
			const reviewing = getParameterByName('reviewing') || false;
			// previous values
			const $banchSelectorOrigin = jQuery('#s2id_pr-target-branch-filter');
			const refData = $banchSelectorOrigin.length > 0 ? $banchSelectorOrigin.data('select2').data() : null;
			const $authorFilterOrigin = jQuery('#s2id_pr-author-filter');
			const authorData = $authorFilterOrigin.length > 0 ? $authorFilterOrigin.data('select2').data() : null;

			const order = 'newest';

			const notFoundMsg = AJS.messages.info({
				title:"No Results",
				body: '<p><a href="?create" class="aui-button aui-button-primary intro-create-pull-request" tabindex="0">Create a new pull request</a></p>',
				closeable: false
			});

			const fakeResult = {"size":0,"limit":0,"isLastPage":false,"values":[{"id":8,"version":2,"title":"loading...","description":"loading...","state":"OPEN","open":false,"closed":true,"createdDate":1373011695000,"updatedDate":1373012559000,"locked":false,"author":{"user":{"name":"none","emailAddress":"none","id":16777,"displayName":"none","active":true,"slug":"none","type":"NORMAL", "avatarUrl":"#"},"role":"AUTHOR","approved":false},"reviewers":[],"participants":[],"attributes":{"resolvedTaskCount":["0"],"openTaskCount":["0"]}, toRef:{id:0, displayId:'', repository:{id:0, slug:'', project:{key:''}}}, fromRef:{id:0, displayId:'', repository:{id:0, slug:'', project:{key:''}}}}],"start":0,"nextPageStart":0};

			// remove previous
			jQuery(window).off('scroll.paged-scrollable');
			jQuery('#bitbucket-pull-request-table').remove();
			jQuery('.spinner').remove();
			jQuery('.paged-table-message').remove();
			// add container for new
			jQuery('#pull-requests-content').empty();
			jQuery('#pull-requests-content').append('<div id="pull-requests-table-container-filtered"></div>');
			jQuery('#pull-requests-table-container-filtered').append(bitbucket.internal.feature.pullRequest.pullRequestTable({}, {}))

			const pullRequestTable = new PullRequestsTable(getPullRequestsUrlBuilder, {
				noneFoundMessageHtml: notFoundMsg,
				initialData: fakeResult,
				paginationContext: 'pull-request-table-filtered',
				//target: "#pull-requests-table-filtered",
				container: "#pull-requests-table-container-filtered",
				tableMessageClass: "pull-request-table-message-filtered",
				autoLoad: true
			});


			// add missing properties
			pullRequestTable.prState = state;
			pullRequestTable.prOrder = order;
			pullRequestTable.prAuthors = author && authorData ? [authorData._stash] : [];
			pullRequestTable.prReviewers = reviewing ? [pageState.getCurrentUser()] : [];
			pullRequestTable.prParticipants = [];
			pullRequestTable.prApprovers = [];
			pullRequestTable.prSource = targeting;

			pullRequestTable.init();
			pullRequestTable.update();
			avatarList.init();

			// inject filter UI
			const urlParams = {
				avatarSize: bitbucket.internal.widget.avatarSizeInPx({ size: 'xsmall' }),
				permission: 'LICENSED_USER' // filter out non-licensed users
			};
			const dataSource = new SearchableMultiSelector.PagedDataSource(nav.rest().users().build(), urlParams);

			// create form
			const $auiContainer = jQuery('<div class="filter-group-container"></div>');
			const $auiItem = jQuery('<div class="filter-group-content"></div>');
			const $form = jQuery('<form class="aui prevent-double-submit" action="#" method="get" accept-charset="UTF-8"></form>');
			$auiContainer.append($auiItem);
			$auiItem.append($form);

			const $stateSelect = jQuery(['<select name="ddPrState" id="ddPrState">',
				'<option value="OPEN">Open</option>',
				'<option value="MERGED">Merged</option>',
				'<option value="DECLINED">Declined</option>',
				'<option value="ALL">All</option>',
				'</select>'].join('\n'));
			$stateSelect.val(pullRequestTable.prState || 'OPEN');
			$form.append($stateSelect);

			const $authorsInput = jQuery('<input class="text" type="text" name="authors" id="authors" placeholder="Authors filter">');
			$form.append($authorsInput);

			const $reviewersInput = jQuery('<input class="text" type="text" name="reviewers" id="reviewers" placeholder="Reviewers filter">');
			$form.append($reviewersInput);

			const $participantsInput = jQuery('<input class="text" type="text" name="participants" id="participants" placeholder="Participants filter">');
			$form.append($participantsInput);

			const $approversInput = jQuery('<input class="text" type="text" name="approvers" id="approvers" placeholder="Approvers filter">');
			$form.append($approversInput);

			const $orderSelect = jQuery(['<select name="ddPrOrder" id="ddPrOrder">',
				'<option value="oldest">Oldest first</option>',
				'<option value="newest">Newest first</option>',
				'</select>'].join('\n'));
			$orderSelect.val(pullRequestTable.prOrder);
			$form.append($orderSelect);

			const $directionSelect = jQuery(['<select name="ddPrDirection" id="ddPrDirection">',
				'<option value="INCOMING">Incoming</option>',
				'<option value="OUTGOING">Outgoing</option>',
				'</select>'].join('\n'));
			$directionSelect.val(pullRequestTable.prDirection || 'INCOMING');
			$form.append($directionSelect);

			const $branchDropdown = jQuery('<button></button>', {
				id: 'prSourceSelector',
				type: 'button',
				class: 'aui-button searchable-selector-trigger revision-reference-selector-trigger sourceBranch',
				title: 'Select branch'
			});
			$branchDropdown.append('<span class="placeholder">Select branch</span>');
			const branchSelector = new BranchSelector($branchDropdown, {
				id: 'prSourceBranchSelector',
				show: { branches: true, tags: false },
				paginationContext: 'branch-filter-selector'
			});
			if(refData) {
				branchSelector.setSelectedItem(new revisionReference({
					id: refData.id,
					displayId: refData.display_id,
					type: refData.type
				}));
			}
			$form.append($branchDropdown);

			new UserMultiSelector($authorsInput, {
				initialItems: pullRequestTable.prAuthors,
				dataSource,
				placeholder: "Authors filter"
			}).on("change", function() {
				pullRequestTable.prAuthors = this.getSelectedItems();
				pullRequestTable.update();
			});

			new UserMultiSelector($reviewersInput, {
				initialItems: pullRequestTable.prReviewers,
				dataSource,
				placeholder: "Reviewers filter"
			}).on("change", function() {
				pullRequestTable.prReviewers = this.getSelectedItems();
				pullRequestTable.update();
			});

			new UserMultiSelector($participantsInput, {
				initialItems: [],
				dataSource,
				placeholder: "Participants filter"
			}).on("change", function() {
				pullRequestTable.prParticipants = this.getSelectedItems();
				pullRequestTable.update();
			});

			new UserMultiSelector($approversInput, {
				initialItems: [],
				dataSource,
				placeholder: "Approvers filter"
			}).on("change", function() {
				pullRequestTable.prApprovers = this.getSelectedItems();
				pullRequestTable.update();
			});

			$orderSelect.auiSelect2({minimumResultsForSearch: Infinity, width: 'auto' }).on('change', function(e){
				pullRequestTable.prOrder = e.val;
				pullRequestTable.update();
			});
			$directionSelect.auiSelect2({minimumResultsForSearch: Infinity, width: 'auto'}).on('change', function(e){
				pullRequestTable.prDirection = e.val;
				pullRequestTable.update();
			});

			$stateSelect.auiSelect2({minimumResultsForSearch: Infinity, width: 'auto'}).on('change', function(e){
				pullRequestTable.prState = e.val;
				pullRequestTable.update();
			});

			events.on('bitbucket.internal.feature.repository.revisionReferenceSelector.revisionRefChanged', function(e) {
				pullRequestTable.prSource = e.id;
				pullRequestTable.update();
			});

			events.on('bitbucket.internal.feature.pullRequestsTable.contentAdded', function(data) {
				const $previousStickers = jQuery('#totalResultStamp');

				let previousSize = 0;
				if (data && data.start > 0) {
					previousSize = parseInt($previousStickers.data('size') || 0);
				}

				$previousStickers.remove();

				const size = (data && data.size ? data.size : 0) + previousSize;
				const $stamps = jQuery('<span id="totalResultStamp" class="aui-lozenge declined aui-lozenge-subtle pull-request-state-lozenge aui-lozenge-complete"></span>')
					.html(`Total: ${  size}`)
					.data('size', size);
				jQuery('#prSourceSelector').after($stamps);
			});

			events.on('bitbucket.internal.widget.pagedscrollable.dataLoaded', function(start, limit, data) {
				if (start !== 0) {
					return;
				}
				const emptyData = {
					displayId: "All Branches",
					id: "",
					isDefault: false
				};
				data.values.splice(0, 0, emptyData);
				branchSelector.scrollableDataStores[0] = branchSelector.scrollableDataStores[0] || [];
				branchSelector.scrollableDataStores[0].splice(0, 0, emptyData);
				if(this.options.paginationContext === 'branch-filter-selector') {
					this.$scrollElement.find('ul').prepend('<li class="result"><a href="#" data-id="" tabindex="-1"><span class="aui-icon aui-icon-small aui-iconfont-nav-children">Branch</span><span class="name" title="All Branches" data-id="" data-revision-ref="{"id":"","displayId":"All Branches", "isDefault":false,"type":{"id":"branch","name":"Branch"}}">All Branches</span></a></li>');
				}
			});

			// append filter
			jQuery('#pull-requests-content').prepend($auiContainer);

			// fix placeholder bug
			$authorsInput.data('select2').blur();
			$reviewersInput.data('select2').blur();
			$participantsInput.data('select2').blur();
			$approversInput.data('select2').blur();
		}

		return {
			addPrFilters
		}
	});

	require([ 'jquery' ], extensionInit);

	function extensionInit(jQuery) {
		let pageState;
		const loadRequirement = jQuery.Deferred();
		const loadAuiFlag = jQuery.Deferred();
		const loadPrRequirement = jQuery.Deferred();

		try {
			WRM.require("wr!" + 'com.atlassian.auiplugin:aui-flag').then(function() {
				loadAuiFlag.resolve();
			});
		}
		catch (_) {
			// optional
			loadAuiFlag.resolve();
		}

		try {
			pageState = require('bitbucket/util/state');
			loadRequirement.resolve();
		}
		catch (_) {
			try {
				WRM.require("wr!" + 'com.atlassian.bitbucket.server.bitbucket-web-api:state').then(function(){
					pageState = require('bitbucket/util/state');
					loadRequirement.resolve();
				});
			}
			catch (_) {
				loadRequirement.reject();
			}
		}

		// improve PR page
		try {
			if (window.location.pathname.split('/').pop() === 'pull-requests') {
				WRM.require("wr!" + 'com.atlassian.bitbucket.server.bitbucket-web:pull-request-table').then(function(){
					require(['bitbucket-plugin/pullrequest-list-modifier'], function(prListModifier) {
						prListModifier.redefinePullRequestTable();
						loadPrRequirement.resolve();
					});
				});
			} else {
				loadPrRequirement.resolve();
			}
		}
		catch (_) {
			loadPrRequirement.resolve();
		}

		jQuery.when(loadRequirement, loadAuiFlag, loadPrRequirement).done(function(){
			const user = pageState.getCurrentUser();
			const project = pageState.getProject();
			const repository = pageState.getRepository();
			const pullRequest = pageState.getPullRequest();

			if(user) {
				require(['bitbucket-plugin/header-notification'], function(notification) {
					if(window.featuresData.checkversion == 1)
						notification.checkForUpdate();
					notification.removeAnnouncement();
					if(window.featuresData.notifIcon == 1)
						notification.addMessagesToolbarIcon();

					if(!project) {
						// main page
					}
					else if(project && !repository) {
						// project page
					}
					else if(project && repository && !pullRequest) {
						// repository page

						// PR sticker on branch details page
						require(['bitbucket-plugin/branch-details-page', 'bitbucket/util/events'], function(branchUtils, events){
							if(window.featuresData.forkorigin == 1)
								branchUtils.addForkOriginLink();
							if(window.featuresData.sticker == 1)
								branchUtils.loadPRStickers();
							if(window.featuresData.checkout == 1)
								branchUtils.addCheckoutLink();
							events.on('bitbucket.internal.layout.branch.revisionRefChanged', function(e) {
								jQuery('#pr-status-wrapper').remove();
								if(window.featuresData.sticker == 1)
									branchUtils.loadPRStickers(e.attributes.id);
								if(window.featuresData.checkout == 1)
									branchUtils.addCheckoutLink(e.attributes.displayId);
							});
						});

						// PR Reviewers groups (create page)
						require(['bitbucket-plugin/pullrequest-create-page'], function(prCreateUtil){
							if(window.featuresData.prtemplate == 1)
								prCreateUtil.injectTemplateButton(template);
							if(window.featuresData.reviewersgroup == 1)
								prCreateUtil.injectReviewersDropdown(jsonGroups);
						});

						// PR Filter
						try {
							// Are we on the pull request list page ? raise exception if not
							try {
								try {
									require('bitbucket/internal/feature/pull-request/table/pull-request-table');
								} catch(e1) {
									// Attempt to load legacy pull request list page
									require('bitbucket/internal/feature/pull-request/pull-request-table');
								}
							} catch(e2) {
								throw "Could not find resource 'pull-request-table'"
							}

							// Load missing resources
							const selectorRes = WRM.require("wr!" + 'com.atlassian.bitbucket.server.bitbucket-web:searchable-multi-selector');
							const userRes = WRM.require("wr!" + 'com.atlassian.bitbucket.server.bitbucket-web:user-multi-selector');
							const branchSelector = WRM.require("wr!" + 'com.atlassian.bitbucket.server.bitbucket-web:repository-branch-selector');

							jQuery.when(selectorRes, userRes, branchSelector).done(function() {
								require(['bitbucket-plugin/pullrequest-list-page'], function(prListUtil){
									if(window.featuresData.prfilters == 1)
										prListUtil.addPrFilters();
								});
							});
						}
						catch(e) { console.warn('not able to load plugin PR filter table.', e) }
					}
					else if (pullRequest) {
						require(['bitbucket-plugin/pullrequest-details-page', 'bitbucket-plugin/pullrequest-create-page'], function(prDetailsPage, prCreateUtil){
							// Jenkins build link
							if(window.featuresData.build == 1)
								prDetailsPage.addBuildLink();
							// Clickable branch info
							if(window.featuresData.clickbranch == 1)
								prDetailsPage.attachNavigateToBranchLink();
							// Add checkout command link
							if(window.featuresData.checkout == 1)
								prDetailsPage.addCheckoutLink();
							// add conflict warning message
							if(window.featuresData.prconflicts == 1)
								prDetailsPage.displayConflicts();
							// Change notification read state
							notification.markActivitiesAsReadWhenPullRequestOpened();
							// replace jira link
							prDetailsPage.replaceJiraLink();
							// Reviewers groups (edit page)
							AJS.bind("show.dialog", inject);
							AJS.dialog2.on("show", inject);

							function inject() {
								if(window.featuresData.prtemplate == 1)
									prCreateUtil.injectTemplateButton(template);
								if(window.featuresData.reviewersgroup == 1)
									prCreateUtil.injectReviewersDropdown(jsonGroups);
							}
						});
					}
				});
			}
		});
	}
}());
// Note: to see all bitbucket events add ?eve=* to URL
