define([
	"./lib/extend",
	"./ViewStack"
], function(extend, ViewStack){

	function ModalViewStack(e, options) {
		ViewStack.call(this, e, options);
		this.viewAugmenter = this.options.augment;
	}

	ModalViewStack.prototype = {

		showView: function(view) {
			ViewStack.prototype.showView.call(this, view);
			this.e.classList.add("active");
			document.documentElement.classList.add("modal-active");

			if (this.viewAugmenter)
				this.viewAugmenter.call(this, view);
		},

		hideView: function(view) {
			ViewStack.prototype.hideView.call(this, view);
			if (!this.views.length) {
				this.e.classList.remove("active");
				document.documentElement.classList.remove("modal-active");
			}
		}
	};

	extend(ModalViewStack, ViewStack);

	return ModalViewStack;
});
