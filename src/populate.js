define([
	"jquery",
	"moment",
	"./lib/util",
	"./lib/evalNodes"
], function($, moment, util, evalNodes){

	var boolFalsyStrings = ["", "0", "no", "false"];

	function setInput($e, value) {
		if ($e.is("select")) {
			setSelect($e, value);
		} else if ($e.is("[type='checkbox'], [type='radio']")) {
			$e.each(function(){
				this.checked = (this.value == value
					|| (value === true && boolFalsyStrings.indexOf(this.value) == -1)
					|| (value === false && boolFalsyStrings.indexOf(this.value) != -1)
				);
			});
		} else if ($e.is("input, textarea")) {
			if (util.isObject(value) && $e.is("[type='hidden']")) {
				value = JSON.stringify(value);
			} else if (util.isDate(value)) {
				if ($e.is("[type='date']")) {
					value = value.toISOString().replace(/T.+$/, "");
				} else if ($e.is("[type='datetime-local']")) {
					value = value.toISOString().replace(/:\d{2}\.\d+Z$/, "");
				} else if ($e.is("[type='time']")) {
					value = value.toISOString().replace(/^[^T]+|T|\.\d+Z$/g, "");
				} else if ($e.data("format")) {
					value = moment(value).format($e.data("format"));
				}
			}
			$e.val(value);
			$e.attr("value", value);
		} else {
			$e.text(value);
		}
	}

	function setSelect($e, value) {
		function step() {
			if (value === true)
				value = 1;
			else if (value === false)
				value = 0;
			else if (value === null)
				value = "";
			$e[0].value = value;
		}

		if ($e.is("[data-wait]")) {
			$e.one("load", step);
		} else {
			step();
		}
	}

	function populate($element, values, prefix, chain){
		$element = $($element);

		if (!chain) chain = [];
		else if (chain.indexOf(values) == -1) chain.push(values);
		else return;

		for(var prop in values) {
			if (!values.hasOwnProperty(prop)) continue;

			var value = values[prop];
			var propattr = prefix ? prefix + "[" + prop + "]" : prop;
			var proppath = prefix ? prefix + "." + prop : prop;

			if (util.isObject(value)) {
				populate($element, value, propattr, chain);
			} else {
				var $e = $element.find('[name="' + propattr + '"], [name="' + proppath + '"], [data-prop="' + propattr + '"], [data-prop="' + proppath + '"]');

				$e.each(function(){
					setInput($e, value);
				});
			}
		}

		$element.find("[data-expr]").each(function(){
			var $e = $(this);
			var value = (function(__expr__){
				with (this) {
					try {
						return eval(__expr__);
					} catch (__ex__) {
						return "";
					}
				}
			}).call(values, $e.data("expr"));

			setInput($e, value);
		});

		evalNodes($element, values, true);
	}

	populate.set = setInput;

	return populate;
});
