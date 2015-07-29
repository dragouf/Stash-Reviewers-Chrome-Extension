
window.storage.load(function(item){
	$('#text_json').val(item);    	
});

$('#bt_save').click(function(){
	var newValue = $('#text_json').val();    	
	window.storage.save(newValue, function(){
		alert('saved!');
	});
});
