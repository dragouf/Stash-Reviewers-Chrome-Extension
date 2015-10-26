window.storage.loadGroups(function(item){
	$('#text_json').val(item);    	
});

window.storage.loadHipChatUsername(function(username){
	$('#hipchat_username').val(username);    	
});

$('#bt_save').click(function(){
	var newValue = $('#text_json').val();    	
	window.storage.saveGroups(newValue, function(){
		//var username = $('#hipchat_username').val();    	
    	//window.storage.saveHipChatUsername(username, function(){
    		alert('saved!');
    	//});
	});
});