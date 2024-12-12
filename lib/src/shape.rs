use std::sync::{Arc, RwLock, RwLockWriteGuard};

use csscolorparser::Color;

use crate::render::Face;
use crate::math::{nonneg, Axis, Geom3, Vec3};

/// 3D geometry
pub enum Shape {
    /// Empty shape (0-volume)
    Empty,
    /// Arbitrary set of points (points, bounding box)
    Arbitrary(Arbitrary),
    /// Another shape translated
    Translated(ShapeRef, Vec3<i32>),
}

impl Shape {
    /// Get the bounding box of the shape
    pub fn size(&self) -> Vec3<u32> {
        match self {
            Self::Empty => (0, 0, 0).into(),
            Self::Arbitrary(Arbitrary { bound, ..}) => bound.size,
            Self::Translated(shape, _) => shape.size(),
        }
    }

    pub fn is_empty(&self) -> bool {
        match self {
            Self::Empty => true,
            Self::Arbitrary(shape) => shape.is_empty(),
            Self::Translated(shape, _) => shape.is_empty(),
        }
    }

    /// Get the min position of the shape
    pub fn min(&self, axis: Axis) -> Option<i32> {
        match self {
            Self::Empty => None,
            Self::Arbitrary(shape) => shape.min(axis),
            Self::Translated(shape, offset) => {
                shape.min(axis).map(|x| x + offset.on(axis))
            },
        }
    }

    /// Get the min position of the shape
    pub fn pos(&self) -> Option<Vec3<i32>> {
        match self {
            Self::Empty => None,
            Self::Arbitrary(shape) => shape.pos(),
            Self::Translated(shape, offset) => shape.pos().map(|x| x + *offset),
        }
    }

    /// Get the max position of the shape
    pub fn max(&self, axis: Axis) -> Option<i32> {
        match self {
            Self::Empty => None,
            Self::Arbitrary(shape) => shape.max(axis),
            Self::Translated(shape, offset) => shape.max(axis).map(|x| x + offset.on(axis)),
        }
    }
}

#[derive(Clone)]
pub struct ShapeVec {
    shapes: Arc<RwLock<Vec<Shape>>>,
}

impl Default for ShapeVec {
    fn default() -> Self {
        Self::new()
    }
}

impl ShapeVec {
    pub fn new() -> Self {
        // preallocate enough slots so we don't reallocate at runtime
        let mut v = Vec::with_capacity(2560);
        v.push(Shape::Empty);
        Self {
            shapes: Arc::new(RwLock::new(v)),
        }
    }

    pub fn get(&self, idx: usize) -> Option<ShapeRef> {
        let size = self.shapes.read().unwrap().len();
        if idx < size {
            Some(ShapeRef {
                v: self.clone(),
                idx,
            })
        } else {
            None
        }
    }
    pub fn add_prism(&self, pos: impl Into<Vec3<i32>>, size: impl Into<Vec3<u32>>) -> u32 {
        let shape = Geom3::new(pos, size);
        if !shape.has_positive_volume() {
            // use position 0 as empty
            return 0;
        }
        let mut shapes = self.shapes.write().unwrap();
        let idx = shapes.len();
        shapes.push(Shape::Arbitrary(Arbitrary::from_prism(shape)));
        idx as u32
    }
}

#[derive(Clone)]
pub struct ShapeRef {
    v: ShapeVec,
    pub idx: usize,
}

impl ShapeRef {
    pub fn new_empty(&self) -> Self {
        Self {
            v: self.v.clone(),
            idx: 0,
        }
    }
    #[inline]
    fn read<T, F>(&self, f: F) -> T
    where
        F: FnOnce(&Shape) -> T,
    {
        let shapes = self.v.shapes.read().unwrap();
        f(&shapes[self.idx])
    }

    pub fn is_empty(&self) -> bool {
        self.read(|x|x.is_empty())
    }

    pub fn size(&self) -> Vec3<u32> {
        self.read(|x|x.size())
    }

    pub fn min(&self, axis: Axis) -> Option<i32> {
        self.read(|x|x.min(axis))
    }

    pub fn pos(&self) -> Option<Vec3<i32>> {
        self.read(|x|x.pos())
    }

    pub fn max(&self, axis: Axis) -> Option<i32> {
        self.read(|x|x.max(axis))
    }

    /// Get a shape with the min position put at the given position
    pub fn with_min(&self, min: impl Into<Vec3<i32>>) -> Self {
        enum WithMinResult {
            SameAsSelf,
            Empty,
            New(Shape),
        }
        let min = min.into();
        let shape = self.read(|x| {
            match x {
                Shape::Empty => WithMinResult::Empty,
                Shape::Arbitrary(shape) => {
                    let pos = match shape.pos() {
                        Some(x) => x,
                        None => return WithMinResult::Empty,
                    };
                    if min == pos {
                        WithMinResult::SameAsSelf
                    } else {
                        WithMinResult::New(self.do_translate(min - pos))
                    }
                }
                Shape::Translated(inner, _) => {
                    let pos = match inner.pos() {
                        Some(x) => x,
                        None => return WithMinResult::Empty,
                    };
                    if min == pos {
                        WithMinResult::SameAsSelf
                    } else {
                        WithMinResult::New(inner.do_translate(min - pos))
                    }
                }
            }
        });
        match shape {
            WithMinResult::SameAsSelf => self.clone(),
            WithMinResult::Empty => self.new_empty(),
            WithMinResult::New(x) => self.add(x),
        }
    }

    /// Get a shape where the min pos of the given axis is at the given position
    pub fn with_axis_off(&self, axis: Axis, at: i32) -> Self {
        let mut pos = match self.pos() {
            Some(x) => x,
            None => return self.new_empty(),
        };
        match axis {
            Axis::X => *pos.x_mut() = at,
            Axis::Y => *pos.y_mut() = at,
            Axis::Z => *pos.z_mut() = at,
        }

        self.with_min(pos)
    }

    /// Get a shape translated by the given offset on each axis
    pub fn translate(&self, offset: impl Into<Vec3<i32>>) -> Self {
        let offset = offset.into();
        let shape = self.read(|x| {
            match x {
                Shape::Empty => None,
                Shape::Arbitrary(_) => {
                    if offset == (0, 0, 0).into() {
                        None
                    } else {
                        Some(self.do_translate(offset))
                    }
                }
                Shape::Translated(inner, old_offset) => {
                    let offset = *old_offset + offset;
                    if offset == (0, 0, 0).into() {
                        None
                    } else {
                        Some(inner.do_translate(offset))
                    }
                }
            }
        });
        match shape {
            Some(x) => self.add(x),
            None => self.clone(),
        }
    }

    /// Translate the shape by the given offset on the given axis
    pub fn translate_axis(&self, axis: Axis, offset: i32) -> Self {
        match axis {
            Axis::X => self.translate((offset, 0, 0)),
            Axis::Y => self.translate((0, offset, 0)),
            Axis::Z => self.translate((0, 0, offset)),
        }
    }

    pub fn union(&self, other: &Self) -> Self {
        if self.is_empty() {
            return other.clone();
        }
        if other.is_empty() {
            return self.clone();
        }
        // actually perform the union operation
        self.resolve_translation();
        other.resolve_translation();
        if let Some(mut arb) = self.read_arbitrary(|a| a.cloned()) {
            other.read_arbitrary(|b| {
                if let Some(b) = b {
                    arb.union(b);
                }
            });
            return self.add(Shape::Arbitrary(arb));
        }
        // should be unreachable
        other.clone()
    }

    pub fn intersection(&self, other: &Self) -> Self {
        if self.is_empty() {
            return self.clone();
        }
        if other.is_empty() {
            return other.clone();
        }
        // actually perform the intersection operation
        self.resolve_translation();
        other.resolve_translation();
        if let Some(mut arb) = self.read_arbitrary(|a| a.cloned()) {
            other.read_arbitrary(|b| {
                if let Some(b) = b {
                    arb.intersection(b);
                }
            });
            return self.add(Shape::Arbitrary(arb));
        }
        // should be unreachable
        self.clone()
    }

    pub fn difference(&self, other: &Self) -> Self {
        if self.is_empty() {
            return self.clone();
        }
        if other.is_empty() {
            return self.clone();
        }
        // actually perform the difference operation
        self.resolve_translation();
        other.resolve_translation();
        if let Some(mut arb) = self.read_arbitrary(|a| a.cloned()) {
            other.read_arbitrary(|b| {
                if let Some(b) = b {
                    arb.difference(b);
                }
            });
            return self.add(Shape::Arbitrary(arb));
        }
        // should be unreachable
        self.clone()
    }

    pub fn render(&self, color: Color) -> Vec<Face> {
        self.resolve_translation();
        self.read_arbitrary(|shape| {
            if let Some(shape) = shape {
                let mut faces = Vec::new();
                let color = Arc::new(color);
                shape.render_faces(&color, &mut faces);
                faces
            } else {
                vec![]
            }
        })
    }

    /// Resolve the translation of the shape
    fn resolve_translation(&self) {
        let mut guard = self.v.shapes.write().unwrap();
        Self::resolve_translation_recur(&mut guard, self.idx);
    }

    // this is needed so we don't recursively lock the RwLock
    fn resolve_translation_recur(guard: &mut RwLockWriteGuard<Vec<Shape>>, idx: usize) {
        match &guard[idx] {
            Shape::Translated(inner, offset) => {
                let offset = *offset;
                let inner_idx = inner.idx;
                Self::resolve_translation_recur(guard, inner_idx);
                let arb = match &guard[inner_idx] {
                    Shape::Arbitrary(arb) => {
                        Some(arb.translated(offset))
                    }
                    _ => None,
                };
                let shape = &mut guard[idx];
                match arb {
                    None => *shape = Shape::Empty,
                    Some(arb) => *shape = Shape::Arbitrary(arb),
                }
            }
            _ => {}
        }
    }

    /// Read self as arbitrary shape, pass in None if the shape is Empty
    fn read_arbitrary<T, F>(&self, f: F) -> T
    where
        F: FnOnce(Option<&Arbitrary>) -> T,
    {
        self.read(|x| {
            match x {
                Shape::Arbitrary(x) => f(Some(x)),
                _ => f(None),
            }
        })
    }


    fn do_translate(&self, offset: Vec3<i32>) -> Shape {
        Shape::Translated(self.clone(), offset)
    }

    fn add(&self, shape: Shape) -> Self {
        if shape.is_empty() {
            // use position 0 as empty
            return self.new_empty();
        }
        let mut shapes = self.v.shapes.write().unwrap();
        let idx = shapes.len();
        shapes.push(shape);
        Self {
            v: self.v.clone(),
            idx,
        }
    }
}

/// An arbitrary set of unit cubes
#[derive(Debug, Clone)]
pub struct Arbitrary {
    prisms: Vec<Geom3>,
    bound: Geom3,
}

impl Arbitrary {
    /// Create shape from prism geometry
    pub fn from_prism(prism: Geom3) -> Self {
        Self {
            prisms: vec![prism],
            bound: prism,
        }
    }

    /// Check if the shape contains no points
    pub fn is_empty(&self) -> bool {
        if self.prisms.is_empty() {
            return true;
        }
        !self.bound.has_positive_volume()
    }

    /// Get the min position of the shape, or None if the shape is empty
    pub fn min(&self, axis: Axis) -> Option<i32> {
        if self.prisms.is_empty() {
            return None;
        }
        Some(self.bound.pos.on(axis))
    }

    /// Get the min position of the shape, or None if the shape is empty
    pub fn pos(&self) -> Option<Vec3<i32>> {
        if self.prisms.is_empty() {
            return None;
        }

        Some(self.bound.pos)
    }

    /// Get the max position of the shape, or None if the shape is empty
    pub fn max(&self, axis: Axis) -> Option<i32> {
        if self.prisms.is_empty() {
            return None;
        }
        Some(self.bound.pos.on(axis) + self.bound.size.on(axis) as i32)
    }

    /// Create the same shape translated by offset
    pub fn translated(&self, offset: impl Into<Vec3<i32>>) -> Self {
        let offset = offset.into();
        let mut new = self.clone();
        for p in &mut new.prisms {
            p.pos += offset;
        }
        new.bound.pos += offset;
        new
    }

    /// Self = Self U other
    pub fn union(&mut self, other: &Self) {
        self.prisms.reserve(other.prisms.len());
        let (mut min, mut max) = if self.prisms.is_empty() {
            let min = (i32::MAX, i32::MAX, i32::MAX).into();
            let max = (i32::MIN, i32::MIN, i32::MIN).into();
            (min, max)
        } else {
            let min = self.bound.pos;
            let max = (self.bound.x_end(), self.bound.y_end(), self.bound.z_end()).into();
            (min, max)
        };
        for p in &other.prisms {
            self.prisms.push(p.clone());
            Self::update_bound(&mut min, &mut max, p);
        }
        self.set_bound(min, max);
    }

    /// Self = Self intersection other
    pub fn intersection(&mut self, other: &Self) {
        // (A U B) ^ (C U D)
        // = ((A U B) ^ C) U ((A U B) ^ D)
        // = (A ^ C) U (B ^ C) U (A ^ D) U (B ^ D)

        let a_prisms = std::mem::take(&mut self.prisms);
        let mut min = (i32::MAX, i32::MAX, i32::MAX).into();
        let mut max = (i32::MIN, i32::MIN, i32::MIN).into();
        
        for a in &a_prisms {
            for b in &other.prisms {
                let intersection = a.intersection(b);
                if intersection.has_positive_volume() {
                    self.prisms.push(intersection);
                    Self::update_bound(&mut min, &mut max, &intersection);
                }
            }
        }
        self.set_bound(min, max);
    }

    /// Self = Self - other
    pub fn difference(&mut self, other: &Self) {
        // same math as intersection
        let a_prisms = std::mem::take(&mut self.prisms);
        let mut min = (i32::MAX, i32::MAX, i32::MAX).into();
        let mut max = (i32::MIN, i32::MIN, i32::MIN).into();
        
        for a in &a_prisms {
            for b in &other.prisms {
                a.difference(b, &mut self.prisms);
            }
        }
        for p in &self.prisms {
            Self::update_bound(&mut min, &mut max, p);
        }
        self.set_bound(min, max);
    }

    fn update_bound(min: &mut Vec3<i32>, max: &mut Vec3<i32>, new_bound: &Geom3) {
        *min.x_mut() = min.x().min(new_bound.pos.x());
        *min.y_mut() = min.y().min(new_bound.pos.y());
        *min.z_mut() = min.z().min(new_bound.pos.z());
        *max.x_mut() = max.x().max(new_bound.x_end());
        *max.y_mut() = max.y().max(new_bound.y_end());
        *max.z_mut() = max.z().max(new_bound.z_end());
    }

    fn set_bound(&mut self, min: Vec3<i32>, max: Vec3<i32>) {
        if self.prisms.is_empty() {
            return;
        }
        let size  = (
            nonneg!(max.x() - min.x()),
            nonneg!(max.y() - min.y()),
            nonneg!(max.z() - min.z()),
        );
        self.bound = Geom3::new(min, size)
    }

    /// Check if the shape contains the given unit cube
    ///
    /// - ONLY VALID if self is not empty!!!!!
    fn contains_unit_cube(&self, pos: impl Into<Vec3<i32>>) -> bool {
        let pos = pos.into();
        if !self.bound.contains_unit_cube(pos) {
            return false;
        }
        for p in &self.prisms {
            if p.contains_unit_cube(pos) {
                return true;
            }
        }
        false
    }

    /// Render the shape with the color if the color is not transparent
    ///
    /// Only exterior faces are rendered (i.e. the shapes are welded together)
    ///
    /// If the color is translucent, back faces are also rendered
    pub fn render_faces(&self, color: &Arc<Color>, faces: &mut Vec<Face>) {
        if color.a == 0.0 {
            return;
        }
        let need_back_faces = color.a < 1.0;
        for p in &self.prisms {
            let x1 = p.pos.x();
            let y1 = p.pos.y();
            let z1 = p.pos.z();
            // note the ends are exclusive
            let x2 = p.x_end();
            let y2 = p.y_end();
            let z2 = p.z_end();
            // top
            for x in x1..x2 {
                for y in y1..y2 {
                    // x, y, z2
                    // ___ <- face
                    // x, y, z2 - 1 SELF
                    if !self.contains_unit_cube((x, y, z2)) {
                        faces.push(Face::top(color, (x, y, z2 - 1)));
                    }
                    // x, y, z1 SELF
                    // ___ <- face
                    // x, y, z1 - 1
                    if need_back_faces && !self.contains_unit_cube((x, y, z1 - 1)) {
                        faces.push(Face::top(color, (x, y, z1 - 1)).back());
                    }
                }
            }
            // front
            for y in y1..y2 {
                for z in z1..z2 {
                    // ............ x2 - 1, y, z SELF
                    // ...... ||||||  <- face
                    // x2, y, z
                    if !self.contains_unit_cube((x2, y, z)) {
                        faces.push(Face::front(color, (x2 - 1, y, z)));
                    }
                    // ............ x1 - 1, y, z
                    // ...... ||||||  <- face
                    // x1, y, z SELF
                    if need_back_faces && !self.contains_unit_cube((x1 - 1, y, z)) {
                        faces.push(Face::front(color, (x1 - 1, y, z)).back());
                    }
                }
            }
            // side
            for x in x1..x2 {
                for z in z1..z2 {
                    // SELF
                    // x, y2 - 1, z ... | ... x, y2, z
                    // .................^ face
                    if !self.contains_unit_cube((x, y2, z)) {
                        faces.push(Face::side(color, (x, y2 - 1, z)));
                    }
                    // ...................... SELF
                    // x, y1 - 1, z ... | ... x, y1, z
                    // .................^ face
                    if need_back_faces && !self.contains_unit_cube((x, y1 - 1, z)) {
                        faces.push(Face::side(color, (x, y1 - 1, z)).back());
                    }
                }
            }
        }
    }
}
