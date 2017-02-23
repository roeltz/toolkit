define([
	"./lib/util",
	"./Watcher",
	"./Model",
	"tp"
], function(util, Watcher, Model, tp){

	function View(template, model, options, meta) {
		Watcher.call(this, null, options);

		if (!model)
			model = {};

		if (!(model instanceof Model))
			model = new Model(model);

		this.e = null;
		this.model = model;
		this.meta = meta || {};
		this.regenerationEvents = [];
		this.subviews = [];
		this.template = template;
		this.containsSubviews = !!template.querySelector("[subview]");

		if (this.options.regenerate)
			this.regenerateOn(this.options.regenerate);

		this.generate();
		this.bind();
	}

	View.template = function(template, options) {
		return function(model) {
			return new View(template, model, options);
		};
	};

	View.prototype = {

		bind: function() {
			if (this.model.on && this.options.update !== false) {
				this.watch("change", this.generate);
			}
		},

		disable: function(selector, condition) {
			if (condition || condition === undefined) {
				this.queryAll(selector).forEach(function(e){
					e.setAttribute("disabled", "disabled");
				});
			} else {
				this.queryAll(selector).forEach(function(e){
					e.removeAttribute("disabled");
				});
			}
		},

		dispose: function() {
			Watcher.prototype.dispose.call(this);

			this.subviews.forEach(function(view){
				view.dispose();
			});

			this.subviews = null;
		},

		generate: function() {
			var old = this.e || this.template;
			var e = this.render();
			this.e = e;
			this.$e = $(e);

			if (old && old.parentNode)
				old.parentNode.replaceChild(e, old);

			if (this.beforeDelegate)
				this.beforeDelegate();

			if (e !== old && this.events)
				this.delegate(this.events);

			if (this.afterGenerate)
				this.afterGenerate();
		},

		query: function(selector) {
			return this.e.querySelector(selector);
		},

		queryAll: function(selector) {
			return Array.prototype.slice.call(this.e.querySelectorAll(selector));
		},

		regenerateOn: function(events) {
			this.regenerationEvents = this.regenerationEvents.concat(events);

			events.forEach(function(event){
				this.watch(event, this.generate);
			}.bind(this));
		},

		registerSubview: function(view) {
			this.subviews.push(view);

			if (this.regenerationEvents.length)
				view.regenerateOn(this.regenerationEvents);

			view.once("dispose", function(){
				this.subviews.splice(this.subviews.indexOf(view), 1);
			}.bind(this));
		},

		render: function() {
			if (this.e && this.containsSubviews) {
				return this.e;
			} else {
				return tp(this.template, this.model, util.defaults({parentView: this}, this.options));
			}
		}
	};

	Watcher.extend(View);

	tp.directive("subview", {preserve: true}, function(e, expr, data, options){
		var view = new View(e, expr || data, util.merge(options, {update: true}));
		options.parentView.registerSubview(view);
		return view.e;
	});

	return View;
});
