/*
 * Various tools
 */

function Color(r, g, b, a) {
	this.r = r || 0;
	this.g = g || 0;
	this.b = b || 0;
	this.a = a || 1.0;

	this.toString = function(alpha) {
		var a = (typeof alpha === "number") ? alpha : this.a;
		return "rgba(" + this.r + "," + this.g + "," + this.b + "," + a + ")";
	};

	this.toRGBInt = function() {
		return (this.r << 16) | (this.g << 8) | (this.b << 0);
	};

	this.mul = function(coef) {
		this.r = clamp(Math.floor(this.r * coef));
		this.g = clamp(Math.floor(this.g * coef));
		this.b = clamp(Math.floor(this.b * coef));
		return this;
	};

	function clamp(component) {
		return component < 255 ? component : 255;
	}
}

Color.random = function() {
	return new Color(
		Math.floor(randomInRange(0, 255)),
		Math.floor(randomInRange(0, 255)),
		Math.floor(randomInRange(0, 255)));
};

function ArrayIterator(array) {
	var length = array.length;
	var pos = -1;

	this.next = function() {
		try {
			return array[++pos];
		} catch (RangeError) {
			throw "ArrayItertor: No such element";
		}
	};

	this.hasNext = function() {
		return pos + 1 <= length - 1;
	};

	this.remove = function() {
		if (pos < 0) {
			throw "ArrayIterator: Remove is not allowed";
		}

		array.splice(pos--, 1);
		--length;
	};
}

function randomInRange(min, max) {
	return Math.random() * (max - min) + min;
}
