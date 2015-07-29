$( document ).ready(function() {
    storage.load(function(item){
    	$('#text_json').val(item);    	
    });

    $('#bt_save').click(function(){
    	var newValue = $('#text_json').val();    	
    	storage.save(newValue, function(){
    		alert('saved!');
    	});
    });
});