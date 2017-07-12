define(function(){
	
	function extend(d, b) {
		/*
		for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
		function __() { this.constructor = d; }
		__.prototype = b.prototype;
		d.prototype = new __();
		*/
		d.prototype.__proto__ = b.prototype;
	}
	
	return extend;
	
});