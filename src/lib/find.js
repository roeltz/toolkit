define(function(){

	var match = (function(){
		var match;
		var candidates = ["matches", "matchesSelector", "webkitMatchesSelector", "mozMatchesSelector", "msMatchesSelector"];

		for (var i = 0, l = candidates.length; i < l; i++) {
			if (document.documentElement[candidates[i]]) {
				match = (function(method){
					return function(node, selector) {
						return node[method](selector);
					};
				})(candidates[i]);
				break;
			}
		}

		if (match) {
			return match;
		} else if (document.documentElement.querySelectorAll) {
			return function(node, selector) {
				var matches = (node.document || node.ownerDocument).querySelectorAll(selector);
				var i = 0;
				while (matches[i] && matches[i] !== node) i++;
				return !!matches[i];
			};
		}
	})();

	function find(node, selector, container) {
		container || (container = document);

		var current = node;
		while (current && current !== container) {
			if (match(current, selector))
				return current;
			current = current.parentNode;
		}
	}

	return find;
});
