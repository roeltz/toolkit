define([
	"jquery"
], function($){
	
	function serializeObject($e) {
		var o = {};
		var a = $($e).find("input, select, textarea").serializeArray();
	   
		for (var i = 0, l = a.length; i < l; i++) {
			var item = a[i];
			if (o[item.name]) {
				if (!o[item.name].push) {
					o[item.name] = [o[item.name]];
				}
				o[item.name].push(item.value || '');
			} else {
				o[item.name] = item.value || '';
			}
	   }
	   return o;
	}
	
	return serializeObject;
});