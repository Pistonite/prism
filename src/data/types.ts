/// Base props for a prism
export type PrismBase = {
    /// Name of the prism
    name: string;
    /// Base color of the prism
    color: Color;
    /// Sign of the prism (positive or negative, negative means the prism is subtracted from the positive prisms)
    positive: boolean;
    /// Hidden, temporary remove a prism
    hidden: boolean;
}

/// Position props for a prism
export type PrismPos = {
    /// (Relative) position of the prism
    position: Vec3<number>;
    /// Size of the prism
    size: Vec3<number>;
}

/// A single prism
export type Prism = PrismBase & PrismPos;

/// A group of prisms
export type PrismGroup = PrismBase & {
    /// (Relative) position of the group
    position: Vec3<number>;
    /// Children of the group
    children: PrismTree[]
}

/// A prism tree (single or group)
export type PrismTree = Prism | PrismGroup;

/// A color (html color or undefined)
export type Color = string | undefined;

/// A vector (x, y, z)
export type Vec3<T> = {
    /// Value for X (left)
    x: T,
    /// Value for Y (right)
    y: T,
    /// Value for Z (top)
    z: T,
}

/// A shader (color overlay for each face)
export type Shader = Vec3<Color>;

/// Props used when rendering a prism, only need position and color
export type PrismRenderProps = PrismPos & {
    color: Color;
}

/// Face enum
export type Face = "x" | "y" | "z";
/// Faces of a prism
export type PrismFace = {
    /// Position of the face
    position: Vec3<number>;
    /// Side of the face
    face: Face;
    /// Color of the face
    color: Color;
}

/// Triangular Grid
/// u is horizontal, v is vertical
export type Grid<T> = {[u: number]: {[v: number]: T}};

/// A segment in the grid
export type Segment = {
    /// The coordinate of the segment
    uv: Point,
    /// If false, the segment is the top side of the triangle at (u, v), otherwise it is the vertical side
    /// when it's vertical, the triangle should always be pointing left ( u+v % 2 == 0)
    vertical: boolean
}

/// A point
export type Point = [number, number];