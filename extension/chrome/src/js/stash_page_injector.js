var injector = (function() {
	var listId = "ul_reviewers_list";
	var reviewersDataKey = "reviewers";
	var buttonIconId = "img_group_icon";

	function getGroupIcon(){
		return '<img id="'+buttonIconId+'" style="width:16px; height:16px;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAABiElEQVRIS72V/zEEQRCFv4sAESADIkAEZIAMXASIABEgAyJABC4DRIAIqE/NXu3Oza/aOtf/bO1uT7/u1697JqzAJivAoAZyBBwCWyGZGXAJfIX3HWAN+ADecwmXQO6A48RBg/nvBhB0M/g8hAT8NrAcyAlwW6Gyq+gq8tsN4PPPOZBnYK8CYkUG/Iz8HgFproLIuVzXzCR/IqcXYL8FJD5Y6ulokBa6VJQZv0UZKIizlkpUitItmdxfA0//2RP7tp1o/D2gOquNb6HLBkvLay/ed6BwMCs5CTvJ/cMp2pSvIP2BXajCg6WJL/XFflwkEtnorZwqXTqUqjkIvMdrJ5l0bUHm5iU1hCbmTpvG1YwFkRbpzK0eweyPAsr2xNXughysh173PXwa3m2+kk2tIedoGleiszzngscqE8ysFYLP1ADPQWyymfscY86Flbl9z6MAMyuRGmdifUz03hk3gLOjtLub9O+3ILkbcAzmwl3SgbTeHS2gxlJ5A7MSy1umLcSrzclSwH8BMXpPGYwvvtgAAAAASUVORK5CYII="/>';
	}

	function getGroupIconLoader(){
		return '<img id="'+buttonIconId+'" src="data:image/gif;base64,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"/>';
	}
	
	/**
	 * Use stash api to search for the user
	 * @param {integer} term name or email of the user to search.
	 */
	function searchUsersAsync(term) {
		var deferred = jQuery.Deferred();

		var searchParams = { avatarSize: 32, permission: "LICENSED_USER", start: 0, filter: term };

		jQuery.get( "/rest/api/latest/users", searchParams)
		.done(function( data ) {
			if (data.values.length > 0)
			{
			    rawd = data.values[0];
			    var select2Data = {
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

	function attachDropdownClickEvent(dropdown)
	{
		jQuery(dropdown).find('#' + listId).find('li').click(function() {
			var $element = jQuery(this);
			var reviewers = $element.data(reviewersDataKey);
			var differedList = [];
			var select2DataArray = [];

			// show loader 
			jQuery('#'+buttonIconId).replaceWith(getGroupIconLoader());

			reviewers.forEach(function(reviewer){
				// request user data from search api
				var searchDeferred = searchUsersAsync(reviewer);
				// waiting list
				differedList.push(searchDeferred);
				// add to the array
				searchDeferred.done(function(select2Data){
					if(select2Data) {
						select2DataArray.push(select2Data);
					}
				})
			});

			jQuery.when.apply(jQuery, differedList).done(function() {
				// redisplay icon and remove loader
				jQuery('#'+buttonIconId).replaceWith(getGroupIcon());
				
				//////////// update the user selector
				// need this to reproduce the event triggered by select2 on a single selection. (change Event contain "added" or "removed" property set with an object and not an array)
				// Without that the widget/searchable-multi-selector wrapper made by atlassian won't change his data internally corrrectly
				
				// clean (for atlassian wrapper)
				var allUsers = AJS.$('#reviewers').auiSelect2("data");
				AJS.$('#reviewers').auiSelect2("data", null).trigger("change");
				AJS.$('#reviewers').auiSelect2("val", null).trigger("change");
				allUsers.forEach(function(item){
					var e = new jQuery.Event("change");
					e.removed = item;
					AJS.$('#reviewers').trigger(e);
				});				

				// add (for atlassian wrapper)
				select2DataArray.forEach(function(select2Data){
					var e = new jQuery.Event("change");
					e.added = select2Data;
					AJS.$('#reviewers').trigger(e);				
				});

				// update displayed value (for select2)
				AJS.$('#reviewers').auiSelect2("data", select2DataArray);			
			});
		});
	}
	
	function injectReviewersDropdown(jsonGroups) {	
		// empty dropdown for reviewers group
		var dropdownHTML = [
		'<a href="#reviewers_list" aria-owns="reviewers_list" aria-haspopup="true" class="aui-button aui-style-default aui-dropdown2-trigger" style="margin-left: 10px; display: inline-block; top: -10px;">',
			getGroupIcon(),
		'</a>',
		'<div id="reviewers_list" class="aui-style-default aui-dropdown2">',
		    '<ul class="aui-list-truncate" id="'+ listId +'">',
		    '</ul>', 
		'</div>'
		].join("\n");

		// jquery instance
		var $dropdown = jQuery(dropdownHTML);

		// add groups list
		jsonGroups.groups.forEach(function(group) {
			var linkText = group.groupName + ' (' + group.reviewers.length + ' reviewers)';
			var $a = jQuery('<a href="Javascript:void(0)"></a>').text(linkText);
			$li = jQuery('<li></li>').append($a).data(reviewersDataKey, group.reviewers);
			$dropdown.find('#' + listId).append($li);
		});

		
		// click event
		attachDropdownClickEvent($dropdown);

		// fix z-index bug
		$dropdown.on({
		    "aui-dropdown2-show": function() {
		    	window.setTimeout(function(){
		    		jQuery("#reviewers_list").css("z-index", "4000");
		    	}, 50);		        
		    }
		});

		// append to the page		
		jQuery('#s2id_reviewers').after($dropdown);
	}

	return {
		injectReviewersDropdown: injectReviewersDropdown
	};
})();

jQuery( document ).ready(function() {
	jQuery('#show-create-pr-button').click(function(){
		injector.injectReviewersDropdown(jsonGroups);	
	});

	AJS.bind("show.dialog", function(e, data) {
	  	injector.injectReviewersDropdown(jsonGroups);
	});
});