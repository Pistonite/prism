// builtin bindings

declare type i32 = number;
declare type u32 = number;
declare type AxisEnum = 0 | 1 | 2;
declare function __builtin_set_unit(unit: number): void;
declare function __builtin_set_shader(x: string, y: string, z: string): void;
declare function __builtin_debug(): void;
declare function __builtin_nextid(): number;

declare function __builtin_shape_size(idx: number): [number, number, number];
declare function __builtin_shape_min(idx: number, axis: AxisEnum): number;
declare function __builtin_shape_max(idx: number, axis: AxisEnum): number;
declare function __builtin_shape_at_point(idx: number, x: i32, y: i32, z: i32): number;
declare function __builtin_shape_at_axis_off(idx: number, axis: AxisEnum, offset: i32): number;
declare function __builtin_shape_translate(idx: number, x: i32, y: i32, z: i32): number;
declare function __builtin_shape_translate_axis_off(idx: number, axis: AxisEnum, offset: i32): number;
declare function __builtin_shape_union(idx_a: number, idx_b: number): number;
declare function __builtin_shape_intersection(idx_a: number, idx_b: number): number;
declare function __builtin_shape_difference(idx_a: number, idx_b: number): number;
declare function __builtin_shape_from_prism(x: i32, y: i32, z: i32, dx: u32, dy: u32, dz: u32): number;

declare function __builtin_render(idx: number, color: string): void;
declare function __builtin_render_prism(x: i32, y: i32, z: i32, dx: u32, dy: u32, dz: u32, color: string): void;
