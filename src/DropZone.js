define([
	"./lib/EventEmitter",
	"./lib/extend",
	"./reader"
], function(EventEmitter, extend, reader){

	function DropZone(e, options) {
		this.e = e;
		this.options = options || {};
		this.options.dragClass = this.options.dragClass || "file-drag";

		this.enable();
	}

	DropZone.prototype = {

		disable: function() {
			this.e.removeEventListener("dragenter", this._ondragenter);
			this.e.removeEventListener("dragleave", this._ondragleave);
			this.e.removeEventListener("dragover", this._ondragover);
			this.e.removeEventListener("drop", this._ondrop);
		},

		enable: function() {
			this.e.addEventListener("dragenter", this._ondragenter = this.ondragenter.bind(this), false);
			this.e.addEventListener("dragleave", this._ondragleave = this.ondragleave.bind(this), false);
			this.e.addEventListener("dragover", this._ondragover = this.ondragover.bind(this), false);
			this.e.addEventListener("drop", this._ondrop = this.ondrop.bind(this), false);
		},

		getFilesAsDataURLs: function(files, callback) {
			(function step(urls, rest){
				if (rest.length) {
					reader.readAsDataURL(rest[0], function(content){
						urls.push(content);
						step(urls, rest.slice(1));
					});
				} else {
					callback(urls);
				}
			})([], files);
		},

		handleFiles: function(files) {
			files = Array.prototype.slice.call(files);
			if (this.options.asDataURL) {
				this.getFilesAsDataURLs(files, function(urls){
					this.emit("files", files, urls);
				}.bind(this));
			} else {
				this.emit("files", files);
			}
		},

		ondrop: function(ev) {
			var files = ev.dataTransfer.files;
			if (files && files.length)
				this.handleFiles(files);
			this.e.classList.remove(this.options.dragClass);
			ev.preventDefault();
		},

		ondragenter: function(ev) {
			var files = Array.prototype.slice.call(ev.dataTransfer.items).filter(function(i){
				return i.kind == "file";
			});
			if (files.length)
				this.e.classList.add(this.options.dragClass);
			ev.preventDefault();
		},

		ondragleave: function(ev) {
			if (ev.target === this.e) {
				this.e.classList.remove(this.options.dragClass);
				ev.preventDefault();
			}
		},

		ondragover: function(ev) {
			ev.preventDefault();
		}
	};

	extend(DropZone, EventEmitter);

	return DropZone;

});
