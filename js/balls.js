/**
 * The JavaScript Balls
 */

var BACKGROUND_COLOR = new Color(200, 215, 255);
var INIT_BALLS = 0;
var MAX_BALLS = 200;

var balls;
var graphics;
var milliTime;

window.onload = function() {
	init();

	var renderLoop;
	if (window.requestAnimationFrame) {
		renderLoop = function() {
			drawScene();
			window.requestAnimationFrame(renderLoop);
		};

		console.log("JSBalls: using requestAnimationFrame()");
	} else {
		renderLoop = function() {
			window.setInterval(drawScene, 1000 / 60);
		};

		console.log("JSBalls: setInterval()");
	}

	renderLoop();
};

window.onmousedown = function(e) {
	var mousePosition = new Vector2D(e.clientX, e.clientY);

	for (var i = 0, l = balls.length; i < l; i++) {
		var ball = balls[i];
		if (ball.contains(mousePosition)) {
			ball.dispose();
			return;
		}
	}

	if (balls.length < MAX_BALLS) {
		var ball = createRandomBall();
		ball.position = mousePosition;
		balls.push(ball);
	}
};

function init() {
	// Using IvanK library
	var stage = new Stage("ballsCanvas");
	var sprite = new Sprite();
	stage.addChild(sprite);
	graphics = sprite.graphics;

	if (window.performance.now) {
		milliTime = function() {
			return window.performance.now();
		};
		console.log("JSBalls: Using window.performance.now() clock");
	} else {
		milliTime = Date.now;
		console.log("JSBalls: Using Date.now() clock");
	}

	balls = [];
	Ball.lastUpdate = milliTime();

	for (var i = 0; i < INIT_BALLS; i++) {
		balls.push(createRandomBall());
	}
}

function drawScene() {
	graphics.clear();
	graphics.beginFill(BACKGROUND_COLOR.toRGBInt(), 1.0);
	graphics.drawRect(0, 0, window.innerWidth, window.innerHeight);
	graphics.endFill();

	Ball.updateAll(balls);
	Ball.resolveCollisions(balls);
	Ball.resolveWalls(balls);

	var i = new ArrayIterator(balls);
	while (i.hasNext()) {
		i.next().draw(graphics);
	}
}

function createRandomBall() {
	var radius = randomInRange(10, 80);
	var ball = new Ball(
		Color.random(),
		radius,
		new Vector2D(
			randomInRange(2 * radius, window.innerWidth - 2 * radius),
			randomInRange(2 * radius, window.innerHeight - 2 * radius)),
		new Vector2D(window.innerWidth / 4, 0).rotate(randomInRange(-Math.PI / 16, Math.PI / 16)));
	return ball;
}

function Ball(color, radius, position, velocity, density) {
	this.color = color || new Color(255, 255, 255);
	this.radius = radius || 100;
	this.currentRadius = 0;
	this.position = position || new Vector2D(0, 0);
	this.velocity = velocity || new Vector2D(0, 0);

	var density_ = density || 100; // mass/pixel
	this.mass = density_ * Math.PI * Math.pow(this.radius, 2);

	this.CREATION_TIME_MS = 2 * this.radius;
	this.DISPOSAL_TIME_MS = 500;

	var isNew = true;
	var disposed = false;
	var disposing = false;

	this.timeNew = 0;
	this.timeDisposing = 0;

	this.isDisposed = function() {
		return disposed;
	};

	this.setDisposed = function() {
		disposed = true;
		disposing = false;
	};

	this.isDisposing = function() {
		return disposing;
	};

	this.dispose = function() {
		disposing = true;
	};

	this.isNew = function() {
		return isNew;
	};

	this.setOld = function() {
		isNew = false;
	};
}

Ball.lastUpdate;

Ball.updateAll = function(balls) {
	var now = milliTime();
	var dt = now - Ball.lastUpdate;
	Ball.lastUpdate = now;

	var i = new ArrayIterator(balls);
	while (i.hasNext()) {
		var ball = i.next();

		ball.update(dt);

		if (ball.isDisposed()) {
			i.remove();
		}
	}
};

Ball.resolveCollisions = function(balls) {
	var n = new Vector2D();

	for (var i = 0, l = balls.length; i < l; i++) {
		var ball = balls[i];

		for (var j = 0; j < l; j++) {
			var other = balls[j];

			if (ball !== other) {
				var proximity = ball.position.distanceTo(other.position) - (ball.currentRadius + other.currentRadius);

				if (proximity < 0) {
					n.copy(ball.position).sub(other.position).normalize();

					var v1 = ball.velocity;
					var v2 = other.velocity;
					var dv = v1.dot(n) - v2.dot(n);
					var m1 = ball.mass;
					var m2 = other.mass;
					var m = m1 + m2;

					if (dv < 0) {
						var c = (dv) / m;
						v1.add(n.mul(-2 * m2 * c));
						v2.add(n.scale(2 * m1 * c));
					}

					proximity = -proximity + 1;
					var s1 = m2 / m * proximity;
					var s2 = m1 / m * proximity;
					ball.position.add(n.scale(s1));
					other.position.add(n.scale(-s2));
				}
			}
		}
	}
};

Ball.resolveWalls = function(balls) {
	var x, y, v, r;
	var ball;

	var i = new ArrayIterator(balls);
	while (i.hasNext()) {
		ball = i.next();

		x = ball.position.x;
		y = ball.position.y;
		v = ball.velocity;
		r = ball.currentRadius;

		function closer(x, a, b) {
			return Math.abs(x - a) < Math.abs(x - b) ? a : b;
		}

		// Wall collision x
		if (x > window.innerWidth - r || x < r) {
			v.x *= -1;
			ball.position.x = closer(x, r, window.innerWidth - r);
		}

		// Wall collision y
		if (y > window.innerHeight - r || y < r) {
			v.y *= -1;
			ball.position.y = closer(y, r, window.innerHeight - r);
		}
	}
};

Ball.prototype = {
	update: function(dt) {
		var v = this.velocity;

		this.position.shift(v.x * dt / 1000, v.y * dt / 1000); // ms to seconds

		// Creation animation
		if (this.isNew()) {
			var t = this.CREATION_TIME_MS - (this.timeNew += dt);
			if (t > 0) {
				this.currentRadius = (1 - t / this.CREATION_TIME_MS) * this.radius;
			} else {
				this.currentRadius = this.radius;
				this.setOld();
			}
		}

		// Disposal animation
		if (this.isDisposing()) {
			var t = this.DISPOSAL_TIME_MS - (this.timeDisposing += dt);
			if (t > 0 && this.currentRadius > 1) {
				var coef = t / this.DISPOSAL_TIME_MS;
				this.currentRadius *= coef;
			} else {
				this.setDisposed();
			}
		}
	},
	draw: function(g) {
		var x = this.position.x;
		var y = this.position.y;
		var r = this.currentRadius;
		var c = this.color;

		g.lineStyle(3, 0x000000, 1.0);
		g.beginFill(c.toRGBInt(), c.a);
		g.drawCircle(x, y, r);
		g.endFill();
	},
	contains: function(p) {
		return this.position.distanceTo(p) <= this.currentRadius;
	}
};

function Vector2D(x, y) {
	this.x = x || 0;
	this.y = y || 0;
}

Vector2D.prototype = {
	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},
	copy: function(other) {
		this.x = other.x;
		this.y = other.y;
		return this;
	},
	shift: function(x, y) {
		this.x += x;
		this.y += y;
		return this;
	},
	normalize: function() {
		return this.mul(1.0 / this.length());
	},
	invert: function() {
		return this.mul(-1.0);
	},
	add: function(other) {
		this.x += other.x;
		this.y += other.y;
		return this;
	},
	sub: function(other) {
		this.x -= other.x;
		this.y -= other.y;
		return this;
	},
	mul: function(coef) {
		this.x *= coef;
		this.y *= coef;
		return this;
	},
	scale: function(length) {
		return this.normalize().mul(length);
	},
	dot: function(other) {
		return this.x * other.x + this.y * other.y;
	},
	rotate: function(angle) {
		var sin = Math.sin(angle);
		var cos = Math.cos(angle);
		var x = this.x;
		var y = this.y;

		this.x = x * cos - y * sin;
		this.y = x * sin + y * cos;

		return this;
	},
	distanceTo: function(other) {
		return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
	},
	length: function() {
		return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
	},
	theta: function() {
		var theta = Math.atan(this.y / this.x);

		if (theta < 0) {
			theta += Math.PI;
		}

		if (this.y < 0) {
			theta += Math.PI;
		}

		return theta;
	}
};
