/**
 * Runtime library for rendering script
 */

function __to_string(x) {
    if (typeof x === 'string') {
        return x;
    }
    if (x && x.toString) {
        return x.toString();
    }
    return String(x);
}

const console = {
    log: (x) => __builtin_log(__to_string(x)),
    warn: (x) => __builtin_log("warn: " + __to_string(x)),
    error: (x) => __builtin_log("error: " + __to_string(x)),
}

const unit = __builtin_set_unit;
const shader = __builtin_set_shader;
const debug = __builtin_debug;

var __global_scale = 1;
function scale(factor) {
    if (typeof factor !== 'number') {
        throw new Error(`scale: expected number, got ${factor}`);
    }
    __global_scale = factor;
}

function __shape(ctx, a) {
    if (a instanceof Prism) {
        return a._into_shape();
    }
    if (a instanceof ShapeHandle) {
        return a._idx;
    }
    throw new Error(`${ctx}: expected shape, got ${a}`);
}

function union(a, b) {
    return new ShapeHandle(__builtin_shape_union(__shape("union", a), __shape("union", b)));
}
function intersection(a, b) {
    return new ShapeHandle(__builtin_shape_intersection(__shape("intersection", a), __shape("intersection", b)));
}
function difference(a, b) {
    return new ShapeHandle(__builtin_shape_difference(__shape("difference", a), __shape("difference", b)));
}
function render(a, color) {
    return new ShapeHandle(__builtin_render(__shape("render", a), color));
}

function __int(ctx, value) {
    if (typeof value !== 'number') {
        throw new Error(`${ctx}: expected number, got ${value}`);
    }
    value = value * __global_scale;
    const whole = Math.round(value);
    if (Math.abs(value - whole) > 0.00001) {
        throw new Error(`${ctx}: expected integer, got ${value} (after scaling by ${__global_scale})`);
    }
    return whole;
}

function __into_i32(ctx, value) {
    value = __int(ctx, value);
    if (value < -2147483648 || value > 2147483647) {
        throw new Error(`${ctx}: expected i32, got ${value} (after scaling by ${__global_scale}), which is out of range`);
    }
    return value;
}

function __into_u32(ctx, value) {
    value = __int(ctx, value);
    if (value < 0 || value > 4294967295) {
        throw new Error(`${ctx}: expected u32, got ${value} (after scaling by ${__global_scale}), which is out of range`);
    }
    return value;
}

function __signed_axis(axis) {
    switch (axis) {
        case 'x': return "+x";
        case 'y': return "+y";
        case 'z': return "+z";
    }
    return axis;
}

function __invalid_create_obj(ctx, value) {
    const id = __builtin_nextid();
    throw new Error(`${ctx}: got ${value} while constructing #${id})`);
}

function point(x, y, z) {
    return new Point(x, y, z);
}
point.debug = function(x, y, z) {
    __builtin_debug();
    return point(x, y, z);
}
class Point {
    constructor(x, y, z) {
        const id = __builtin_nextid();
        const ctx = `constructing point #${id}`;
        this._x = __into_i32(ctx, x);
        this._y = __into_i32(ctx, y);
        this._z = __into_i32(ctx, z);
    }
    get x() { return this._x; }
    get y() { return this._y; }
    get z() { return this._z; }
    toString() {
        return `point(${this.x}, ${this.y}, ${this.z})`;
    }
    with(axis, n) { 
        switch (axis) {
            case 'x': return this.create(n, this.y, this.z);
            case 'y': return this.create(this.x, n, this.z);
            case 'z': return this.create(this.x, this.y, n);
        }
        __invalid_create_obj('invalid axis in point.with', axis);
    }
    translated(a1, a2, a3) {
        if (a3 === undefined) {
            if (a2 === undefined) {
                return point(this.x + a1.x, this.y + a1.y, this.z + a1.z);
            }
            switch(__signed_axis(a1)) {
                case "+x": return this.create(this.x + a2, this.y, this.z);
                case "+y": return this.create(this.x, this.y + a2, this.z);
                case "+z": return this.create(this.x, this.y, this.z + a2);
                case "-x": return this.create(this.x - a2, this.y, this.z);
                case "-y": return this.create(this.x, this.y - a2, this.z);
                case "-z": return this.create(this.x, this.y, this.z - a2);
            }
            __invalid_create_obj('invalid axis in point.translated', a1);
        }
        return this.create(this.x + a1, this.y + a2, this.z + a3);
    }
    create(x, y, z) {
        if (x === this.x && y === this.y && z === this.z) {
            return this;
        }
        return point(x, y, z);
    }
    sized(a1, y, z) {
        if (y === undefined && z === undefined) {
            // assume a1 is a size
            return prism(this, a1);
        }
        return prism(this, size(a1, y, z));
    }
}

function size(x, y, z) {
    return new Size(x, y, z);
}
size.debug = function(x, y, z) {
    __builtin_debug();
    return size(x, y, z);
}
class Size {
    constructor(x, y, z) {
        const id = __builtin_nextid();
        const ctx = `constructing size #${id}`;
        this._x = __into_u32(ctx, x);
        this._y = __into_u32(ctx, y);
        this._z = __into_u32(ctx, z);
    }
    get x() { return this._x; }
    get y() { return this._y; }
    get z() { return this._z; }
    toString() {
        return `size(${this.x}, ${this.y}, ${this.z})`;
    }
    with(axis, n) { 
        switch (axis) {
            case 'x': return this.create(n, this.y, this.z);
            case 'y': return this.create(this.x, n, this.z);
            case 'z': return this.create(this.x, this.y, n);
        }
        __invalid_create_obj('invalid axis in size.with', axis);
    }
    extended(axis, n) {
        switch(axis) {
            case 'x': return this.create(this.x + n, this.y, this.z);
            case 'y': return this.create(this.x, this.y + n, this.z);
            case 'z': return this.create(this.x, this.y, this.z + n);
        }
    }

    create(x, y, z) {
        if (x === this.x && y === this.y && z === this.z) {
            return this;
        }
        return size(x, y, z);
    }

    scaled(factor) {
        if (typeof factor !== 'number') {
            throw new Error(`size.scaled: expected number, got ${factor}`);
        }
        return size(this.x * factor, this.y * factor, this.z * factor);
    }

    at(a1, y, z) {
        if (y === undefined && z === undefined) {
            // assume a1 is a point
            return prism(a1, this);
        }
        return prism(point(a1, y, z), this);
    }
}


function prism(point, size) {
    return new Prism(point, size);
}
prism.debug = function(point, size) {
    __builtin_debug();
    return prism(point, size);
}
class Prism {
    constructor(point, size) {
        const id = __builtin_nextid();
        const ctx = `constructing prism #${id}`;
        if (!(point instanceof Point)) {
            throw new Error(`${ctx}: first argument should be a point`);
        }
        if (!(size instanceof Size)) {
            throw new Error(`${ctx}: second argument should be a size`);
        }
        this._point = point;
        this._size = size;
        this._shape_cache = undefined;
    }

    toString() {
        return `prism(${this._point.toString()}, ${this._size.toString()})`;
    }

    get size() { return this._size; }
    min(axis) {
        switch(axis) {
            case 'x': return this._point.x;
            case 'y': return this._point.y;
            case 'z': return this._point.z;
        }
        __invalid_create_obj('invalid axis in prism.min', axis);
    }
    max(axis) {
        switch(axis) {
            case 'x': return this._point.x + this._size.x;
            case 'y': return this._point.y + this._size.y;
            case 'z': return this._point.z + this._size.z;
        }
        __invalid_create_obj('invalid axis in prism.max', axis);
    }
    create(point, size) {
        if (point === this._point || point.x === this._point.x && point.y === this._point.y && point.z === this._point.z) {
            if (size === this.size || size.x === this._size.x && size.y === this._size.y && size.z === this._size.z) {
                return this;
            }
        }
        return prism(point, size);
    }
    at(a1, a2) {
        if (a2 === undefined) {
            return prism(a1, this._size);
        }
        return this.create(this._point.with(a1, a2), this._size);
    }
    translated(a1, a2, a3) {
        return this.create(this._point.translated(a1, a2, a3), this._size);
    }
    sized(a1, a2, a3) {
        if (a2 === undefined && a3 === undefined) {
            return this.create(this._point, a1);
        }
        return this.create(this._point, size(a1, a2, a3));
    }

    extended(axis, n) {
        return this.create(this._point, this._size.extended(axis, n));
    }

    dextended(axis, n) {
        if (axis !== 'x' && axis !== 'y' && axis !== 'z') {
            __invalid_create_obj('invalid axis in prism.dextended', axis);
        }
        const point = this._point.translated("-" + axis, n);
        const size = this._size.extended(axis, n * 2);
        return this.create(point, size);
    }

    union(shape) {
        return new ShapeHandle(__builtin_shape_union(this._into_shape(), __shape("prism.union", shape)));
    }
    intersection(shape) {
        return new ShapeHandle(__builtin_shape_intersection(this._into_shape(), __shape("prism.intersectin", shape)));
    }
    difference(shape) {
        return new ShapeHandle(__builtin_shape_difference(this._into_shape(), __shape("prism.different", shape)));
    }

    _into_shape() {
        if (this._shape_cache !== undefined) {
            return this._shape_cache;
        }
        this._shape_cache = __builtin_shape_from_prism(
            this._point.x, this._point.y, this._point.z,
            this._size.x, this._size.y, this._size.z
        );
        return this._shape_cache;
    }

    render(color) {
        __builtin_render(this._into_shape(), color);
    }
}

class ShapeHandle {
    constructor(idx) {
        this._idx = idx;
        this._size = undefined;
    }
    toString() {
        return `shape(<native #${this._idx}>)`;
    }
    get size() {
        if (this._size === undefined) {
            const [x, y, z] = __builtin_shape_size(this._idx);
            this._size = size(x, y, z);
        }
        return this._size;
    }
    min(axis) {
        switch(axis) {
            case 'x': return __builtin_shape_min(this._idx, 0);
            case 'y': return __builtin_shape_min(this._idx, 1);
            case 'z': return __builtin_shape_min(this._idx, 2);
        }
        __invalid_create_obj('invalid axis in shape.min', axis);
    }
    max(axis) {
        switch(axis) {
            case 'x': return __builtin_shape_max(this._idx, 0);
            case 'y': return __builtin_shape_max(this._idx, 1);
            case 'z': return __builtin_shape_max(this._idx, 2);
        }
        __invalid_create_obj('invalid axis in shape.max', axis);
    }

    at(a1, a2) {
        if (a2 === undefined) {
            return this.create(__builtin_shape_at_point(this._idx, a1.x, a1.y, a1.z));
        }
        const off = __into_i32("shape.at", a2);
        switch (a1) {
            case 'x': return this.create(__builtin_shape_at_axis_off(this._idx, 0, off));
            case 'y': return this.create(__builtin_shape_at_axis_off(this._idx, 1, off));
            case 'z': return this.create(__builtin_shape_at_axis_off(this._idx, 2, off));
        }
        __invalid_create_obj('invalid axis in shape.at', a1);
    }

    translated(a1, a2, a3) {
        if (a3 === undefined) {
            if (a2 === undefined) {
                return this.create(__builtin_shape_translate(this._idx, a1.x, a1.y, a1.z));
            }
            const off = __into_i32("shape.translated", a2);
            switch (a1) {
                case 'x': return this.create(__builtin_shape_translate_axis_off(this._idx, 0, off));
                case 'y': return this.create(__builtin_shape_translate_axis_off(this._idx, 1, off));
                case 'z': return this.create(__builtin_shape_translate_axis_off(this._idx, 2, off));
            }
            __invalid_create_obj('invalid axis in shape.translated', a1);
        }
        return this.create(__builtin_shape_translate(this._idx, a1, a2, a3));
    }

    union(shape) {
        return this.create(__builtin_shape_union(this._idx, __shape("shape.union", shape)));
    }
    intersection(shape) {
        return this.create(__builtin_shape_intersection(this._idx, __shape("shape.intersection", shape)));
    }
    difference(shape) {
        return this.create(__builtin_shape_difference(this._idx, __shape("shape.difference", shape)));
    }
    render(color) {
        __builtin_render(this._idx, color);
    }

    create(idx) {
        if (idx === this._idx) {
            return this;
        }
        return new ShapeHandle(idx);
    }
}
