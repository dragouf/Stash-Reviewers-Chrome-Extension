$( document ).ready(function() {
    storage.loadGroups(function(item){
    	$('#text_json').val(item);    	
    });

    storage.loadHipChatUsername(function(username){
    	$('#hipchat_username').val(username);    	
    });

    $('#bt_save').click(function(){
    	var newValue = $('#text_json').val();    	
    	storage.saveGroups(newValue, function(){
    		//var username = $('#hipchat_username').val();    	
	    	//storage.saveHipChatUsername(username, function(){
	    		alert('saved!');
	    	//});
    	});
    });
});