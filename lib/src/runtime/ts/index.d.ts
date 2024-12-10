/**
 * Type definitions for the Runtime library for rendering script
 */

/**
 * Set the global unit length
 */
declare function unit(unit_f64: number): void;

/**
 * Set the global shader colors in the X/Y/Z directions
 *
 * Use empty string to keep the default color
 */
declare function shader(x: string, y: string, z: string): void;

/**
 * Set the global scale for all object creation
 *
 * This allows you to specify decimals when creating objects that
 * require integer values. For example, if you set the scale to 2,
 * then you can specify a point with 0.5 without error.
 *
 * Calling this will not affect objects that were created previously
 */
declare function scale(n: number): void;
/** 
 * Create a new shape that is the union of 2 shapes
 * (i.e. contains point A if either this or the given shape contains A)
 */
declare function union(a: Shape | Prism, b: Shape | Prism): Shape
/** 
 * Create a new shape that is the intersection of 2 shapes
 * (i.e. contains point A if both this and the given shape contain A)
 */
declare function intersection(a: Shape | Prism, b: Shape | Prism): Shape
/** 
 * Create a new shape that is the first minus second shape
 * (i.e. contains point A if this contains A but the given shape does not)
 */
declare function difference(a: Shape | Prism, b: Shape | Prism): Shape

/** Render this shape into the scene */
declare function render(shape: Shape, color: string): void

/** Show the current object id for debugging */
declare function debug(): void;

declare type Axis = "x" | "y" | "z";
declare type Sign = "+" | "-";
declare type SignedAxis = `${Sign}${Axis}`;

/** Construct a point with the given coordinates */
declare const point: {
    (x: number, y: number, z: number): Point
    /** Show the current object id for debugging */
    debug(x: number, y: number, z: number): Point
}
declare type Point = {
    /** Get the x coordinate (i32) */
    get x(): number,
    /** Get the y coordinate (i32) */
    get y(): number,
    /** Get the z coordinate (i32) */
    get z(): number,
    /**
     * Create a new point with 1 coordinate modified
     */
    with(axis: Axis, n: number): Point

    /**
     * Create a new point that equals to component-wise
     * sum of this and the given point.
     */
    translated(point: Point): Point
    /**
     * Create a new point with 1 coordinate translated by the given amount
     */
    translated(axis: Axis | SignedAxis, n: number): Point
    /**
     * Create a new point that equals to component-wise
     * sum of this and the given point.
     */
    translated(x: number, y: number, z: number): Point


    /** 
     * Create a prism at this point with the given size
     */
    sized(size: Size): Prism
    /** 
     * Create a prism at this point with the given size
     */
    sized(x: number, y: number, z: number): Prism
}

/** Construct a point with the given coordinates */
declare const size: {
    (x: number, y: number, z: number): Size
    /** Show the current object id for debugging */
    debug(x: number, y: number, z: number): Size
}
declare type Size = {
    /** Get the x dimension (u32) */
    get x(): number,
    /** Get the y dimension (u32) */
    get y(): number,
    /** Get the z dimension (u32) */
    get z(): number,
    /**
     * Create a new size with 1 dimension modified
     */
    with(axis: Axis, n: number): Size

    /**
     * Create a new size with 1 dimension extended
     * by the given amount
     */
    extended(axis: Axis, n: number): Size

    /** 
     * Scale the size by the given factor
     *
     * The resulting size must be u32 in all dimensions
     */
    scaled(scale: number): Size

    /** 
     * Create a prism at the point with this size
     */
    at(point: Point): Prism
    /** 
     * Create a prism at the point with this size
     */
    at(x: number, y: number, z: number): Prism
}

/**
 * Create a prism at the given point with the given size
 */
declare const prism: {
    (point: Point, size: Size): Prism
    /** Show the current object id for debugging */
    debug(point: Point, size: Size): Prism
}
declare type Prism = ShapeOperation & {
    /** 
     * Create a new prism with the same geometry,
     * but the min position moved to the given position
     */
    at(point: Point): Prism
    /** 
     * Create a new shape with the same geometry,
     * but the min position moved to the given position for the given axis
     */
    at(axis: Axis, n: number): Prism

    /**
     * Create a new prism with the same size,
     * and all points translated by the given point
     */
    translated(point: Point): Prism
    /**
     * Create a new prism with the same size,
     * but all points translated by the given amount in the given direction
     */
    translated(axis: Axis | SignedAxis, n: number): Prism
    /**
     * Create a new prism with the same size,
     * and all points translated by the given amounts
     */
    translated(x: number, y: number, z: number): Prism

    // Prism-specific methods

    /** 
     * Create a new prism with the same min position
     * and a new size
     */
    sized(size: Size): Prism
    /** 
     * Create a new prism with the same min position
     * and a new size
     */
    sized(x: number, y: number, z: number): Prism
    /**
     * Create a new prism with 1 dimension extended
     * by the given amount
     */
    extended(axis: Axis | SignedAxis, n: number): Prism
    /**
     * Create a new prism with 1 dimension extended by the given amount
     * in both positive and negative directions
     */
    dextended(axis: Axis, n: number): Prism
}

/** 
 * An arbitrary shape in 3D space made up or unit cubes
 */
declare type Shape = ShapeOperation & {

    /** 
     * Create a new shape with the same geometry,
     * but the min position of the bounding prism moved
     * to the given position
     */
    at(point: Point): Shape
    /** 
     * Create a new shape with the same geometry,
     * but the min position of the bounding prism moved
     * to the given position for the given axis
     */
    at(axis: Axis, n: number): Shape

    /**
     * Create a new shape with the same geometry,
     * and all points translated by the given point
     */
    translated(point: Point): Shape
    /**
     * Create a new shape with the same geometry,
     * but all points translated by the given amount in the given direction
     */
    translated(axis: Axis | SignedAxis, n: number): Shape
    /**
     * Create a new shape with the same geometry,
     * and all points translated by the given amounts
     */
    translated(x: number, y: number, z: number): Shape
};

declare type ShapeOperation = {
    /** Get the dimensions of the bounding prism */
    get size(): Size

    /** Get the min position of the bounding prism */
    min(axis: Axis): number
    /** Get the max position of the bounding prism */
    max(axis: Axis): number
    /** 
     * Create a new shape that is the union of this and the given shape
     * (i.e. contains point A if either this or the given shape contains A)
     */
    union(shape: Shape | Prism): Shape
    /** 
     * Create a new shape that is the intersection of this and the given shape
     * (i.e. contains point A if both this and the given shape contain A)
     */
    intersection(shape: Shape | Prism): Shape
    /** 
     * Create a new shape that is the difference of this and the given shape
     * (i.e. contains point A if this contains A but the given shape does not)
     */
    difference(shape: Shape | Prism): Shape

    /** Render this shape into the scene */
    render(color: string): void
}
