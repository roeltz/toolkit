define(function(){

	function reset(element, reenable) {
		element.classList.remove("waiting");
		if (reenable) element.removeAttribute("disabled");
	}

	function wait(element, promise, reenable) {
		element.classList.add("waiting");
		element.setAttribute("disabled", "disabled");
		promise.then(
			function() {
				reset(element, reenable);
			},
			function() {
				reset(element, true);
			}
		);
	}

	return wait;
});
