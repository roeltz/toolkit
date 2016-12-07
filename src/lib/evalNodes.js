define([
	"jquery"
], function($) {

	function evalNodes($element, data, useVisibility) {
		$element.find("[data-if]").each(function(){
			var $element = $(this);
			var passes = false;
			try {
				(function(){
					with(this) {
						passes = eval($element.data("if"));
					}
				}).call(data);
			} catch(ex) {
				
			} finally {
				if (passes && useVisibility) {
					$element.show();
				} else if (useVisibility) {
					$element.hide();
				} else {
					$element.remove();
				}
			}
		});
	}

	return evalNodes;
});
