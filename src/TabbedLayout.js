define([
	"./lib/EventEmitter",
	"./lib/extend",
	"./lib/find",
	"./View"
], function(EventEmitter, extend, find, View){

	function TabbedLayout(e, options) {
		this.currentAnchor = null;
		this.currentTab = null;
		this.e = e;
		this.initialized = [];
		this.nav = e.querySelector(".tab-nav");
		this.options = options || {};

		this.bind();
		setTimeout(this.display.bind(this), 0);
	}

	TabbedLayout.ANCHOR_SELECTOR = ".tab-nav a[href]";

	TabbedLayout.prototype = {

		bind: function() {
			this.nav.addEventListener("click", this._nav_click = function(e){
				var anchor = find(e.target, "a");
				if (anchor) {
					if (this.options.history !== true)
						e.preventDefault();
					e.stopPropagation();
					this.display(anchor.hash, anchor);
				}
			}.bind(this));

			window.addEventListener("hashchange", this._hashchange = function(e){
				this.display(location.hash);
			}.bind(this));

			if (this.options.disposable) {
				this.options.disposable.on("dispose", function(){
					this.nav.removeEventListener("click", this._nav_click);
					window.removeEventListener("hashchange", this._hashchange);
				}.bind(this));
			}
		},

		display: function(id, anchor) {
			if (!id || id == "#")
				id = this.e.querySelector(TabbedLayout.ANCHOR_SELECTOR).hash;

			if (!anchor)
				anchor = this.nav.querySelector("a[href$='" + id + "']");

			var tab = this.e.querySelector(id);

			if (tab && tab !== this.currentTab) {

				if (this.currentAnchor)
					this.currentAnchor.classList.remove("active");

				if (this.currentTab)
					this.currentTab.classList.remove("active");

				this.currentAnchor = anchor;
				this.currentTab = tab;

				if (this.initialized.indexOf(id) == -1) {
					var model = this.options.model;
					this.emit("tab" + id, tab);
					this.initialized.push(id);

					if (this.options.controllers && id in this.options.controllers) {
						var controllers = this.options.controllers[id];
						if (typeof controllers == "string")
							controllers = [controllers];
						require(controllers, function(){
							var args = arguments;
							controllers.forEach(function(x, i){
								args[i](tab, model);
							});
						});
					}
				}

				this.currentAnchor.classList.add("active");
				this.currentTab.classList.add("active");
			}
		}
	};

	extend(TabbedLayout, EventEmitter);

	return TabbedLayout;
});
