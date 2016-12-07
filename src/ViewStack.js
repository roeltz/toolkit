define([
	"./lib/EventEmitter",
	"./lib/extend",
	"jquery"
], function(EventEmitter, extend, $){

	function ViewStack(e, options) {
		EventEmitter.call(this);
		this.e = e;
		this.$e = $(e);
		this.options = options || {};
		this.views = [];
		this.currentView = null;
	}

	ViewStack.prototype = {

		setView: function(view) {
			if (this.currentView)
				this.hideView(this.currentView);

			this.currentView = view;

			if (this.currentView)
				this.showView(this.currentView);
		},

		showView: function(view) {
			this.e.appendChild(view.e);
			this.emit("show", view);
		},

		hideView: function(view) {
			this.e.removeChild(view.e);
			this.emit("hide", view);
		},

		push: function(view) {
			this.views.unshift(view);
			this.setView(view);
		},

		pop: function() {
			if (!this.views.length) return;

			var view = this.views.shift();
			view.dispose();

			this.setView(this.views[0]);
			return view;
		}
	};

	extend(ViewStack, EventEmitter);

	return ViewStack;
});
