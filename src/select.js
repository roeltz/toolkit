define([
	"tp",
	"fill",
	"jquery",
	"./lib/request",
], function(tp, fill, $, request){

	function populate($select, items, options) {
		$select = $($select);
		options = options || {};
		var nullOption = options.nullOption || $select.data("null");
		var idProperty = options.id || $select.data("id") || "id";
		var labelProperty = options.label || $select.data("label") || "name";
		var selectedValue = options.selectedValue || $select.data("selected-value");

		$select.empty();

		if (nullOption)
			$('<option value="">' + nullOption + '</option>').appendTo($select);

		(items || []).forEach(function(item){
			var id = typeof item == "string" ? item : item[idProperty];
			var label = typeof item == "string" ? item : item[labelProperty];
			var $option = $('<option value="' + id + '">' + label + '</option>');

			if (id == selectedValue)
				$option.attr("selected", true);

			$option.appendTo($select);
		});
	}

	function get($select, data, options) {
		$select = $($select);
		options = options || {};
		var url = options.url || $select.data("get") || $select.data("url");

		$select
			.attr("disabled", true)
			.addClass("loading")
		;

		request.get(fill(url, data))
			.done(function(items){
				populate($select, items, options);
				if (options.callback)
					options.callback(items);
			})
			.always(function(){
				$select
					.attr("disabled", false)
					.removeClass("loading")
					.trigger("load")
				;
			})
		;
	}

	function chain($source, $destination, options) {
		$source.change(function(){
			get($destination, {value: this.value}, options);
		});
	}

	return {
		populate: populate,
		get: get,
		chain: chain
	};
});
