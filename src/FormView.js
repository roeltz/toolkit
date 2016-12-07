define([
   	"./lib/request",
	"./lib/serializeObject",
    "./lib/util",
    "./populate",
	"./View",
	"jquery"
], function(request, serializeObject, util, populate, View, $){

	function FormView() {
		View.apply(this, arguments);

		this.validator = null;
		this.errorElement = this.e.querySelector(this.options.errorElement || ".submit-error");

		populate(this.e, this.model);
	}

	FormView.prototype = {

		bind: function() {
			this.e.addEventListener("submit", this.submit.bind(this));
		},

        collectData: function(callback) {
            var data = this.options.model ? this.model.toJSON() : serializeObject(this.e);
            var defer = false;
            this.emit("collect", data, function(replacement){
                data = replacement;
            }, function(next){
                defer = true;
                next(function(data){
                    callback(data);
                });
            });
            if (!defer && callback)
                callback(data);
		},

		dispatch: function(data) {
			this.emit("submit-success", data);
			this.emit("result", data);
			if (!this.options.continueAfterSubmit)
				this.emit("done", data);
		},

        getRequestArgs: function(data) {
            var options = util.copy({}, this.options.request);

            switch (this.e.getAttribute("enctype") || this.e.enctype) {
                case "multipart/form-data":
                    data = data instanceof FormData ? data : new FormData(this.e);
                    break;
                case "application/json":
                    options.contentType = "application/json";
                    break;
            }

			return {data: data, options: options};
		},

        hintError: function(result) {
			this.e.classList.add("submit-error");
            this.e.dispatchEvent(new Event("submit-error", {bubbles: true, cancelable: true}));

			if (this.errorElement && this.options.evaluateErrorMessage) {
				this.errorElement.textContent = this.options.evaluateErrorMessage(result);
			}
		},

        hintSuccess: function(result) {
			this.e.classList.add("submit-success");
            this.e.dispatchEvent(new Event("submit-success", {bubbles: true, cancelable: true}));
		},

        prepare: function() {
			this.e.classList.add("submitting");

			var elementsToDisable = this.e.querySelectorAll(this.options.disableOnSubmit || "footer button");
			if (elementsToDisable.length) {
				for (var i = 0, l = elementsToDisable.length; i < l; i++) {
					elementsToDisable[i].setAttribute("disabled", "disabled");
				}
				this.lastDisabledElements = elementsToDisable;
			} else {
				delete this.lastDisabledElements;
			}
		},

		request: function(data) {
            var args = this.getRequestArgs(data);

			request(this.e.method, this.e.action, args.data, args.options)
				.done(function(result){
					this.hintSuccess(result);
					this.dispatch(result);
				}.bind(this))
				.fail(function(result){
					this.hintError(result);
					this.emit("submit-error", result);
				}.bind(this))
				.always(function(){
					this.restore();
				}.bind(this))
			;
		},

		resetError: function() {
			this.e.classList.remove("submit-error");

			if (this.errorElement) {
				errorElement.innerHTML = "";
			}
		},

        resetSuccess: function() {
			this.e.classList.remove("submit-success");
		},

		restore: function(ok) {
			this.e.classList.remove("submitting");

			if (this.lastDisabledElements) {
				for (var i = 0, d = this.lastDisabledElements, l = d.length; i < l; i++) {
					d[i].removeAttribute("disabled");
				}
			}

            if (this.options.resetAfterSubmit) {
                this.e.reset();
                var autofocus = this.e.querySelector("[autofocus]");
                if (autofocus) {
                    setTimeout(function(){
                        autofocus.focus();
                    }, 0);
                }
            }
		},

        submit: function(ev) {
			if (ev && ev.preventDefault)
				ev.preventDefault();

			this.resetSuccess();
			this.resetError();

			if (this.validate()) {
				this.prepare();
                this.collectData(function(data){
                    if (this.e.action) {
    					this.request(data);
    				} else {
    					this.dispatch(data);
    				}
                }.bind(this));
			}
		},

		validate: function(callback) {
			if (callback) {
				this.validator = callback;
			} else if (this.validator) {
				return this.validator.call(this);
			} else {
				return true;
			}
		}
	};

	View.extend(FormView);

	return FormView;
});
