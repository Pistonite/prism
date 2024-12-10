use std::{collections::BTreeSet, ops::Deref, sync::{Arc, RwLock, RwLockWriteGuard}};

use crate::math::{nonneg, Axis, Vec3};


/// 3D geometry
pub enum Shape {
    /// Empty shape (0-volume)
    Empty,
    /// Rectangular prism
    Prism(Vec3<i32>, Vec3<u32>),
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
            Self::Prism(_, size) => *size,
            Self::Arbitrary(Arbitrary { size, ..}) => *size,
            Self::Translated(shape, _) => shape.size(),
        }
    }

    pub fn is_empty(&self) -> bool {
        match self {
            Self::Empty => true,
            Self::Prism(_, size) => size.x() == 0 || size.y() == 0 || size.z() == 0,
            Self::Arbitrary(arb) => arb.points.is_empty(),
            Self::Translated(shape, _) => shape.is_empty(),
        }
    }

    /// Get the min position of the shape
    pub fn min(&self, axis: Axis) -> i32 {
        match self {
            Self::Empty => 0,
            Self::Prism(pos, _) => pos.on(axis),
            Self::Arbitrary(Arbitrary {pos, ..}) => pos.on(axis),
            Self::Translated(shape, offset) => {
                shape.min(axis) + offset.on(axis)
            },
        }
    }

    /// Get the min position of the shape
    pub fn pos(&self) -> Vec3<i32> {
        match self {
            Self::Empty => (0, 0, 0).into(),
            Self::Prism(pos, _) => *pos,
            Self::Arbitrary(Arbitrary {pos, ..}) => *pos,
            Self::Translated(shape, offset) => shape.pos() + *offset,
        }
    }

    /// Get the max position of the shape
    pub fn max(&self, axis: Axis) -> i32 {
        match self {
            Self::Empty => 0,
            Self::Prism(pos, size) => pos.on(axis) + size.on(axis) as i32,
            Self::Arbitrary(Arbitrary {pos, size, ..}) => pos.on(axis) + size.on(axis) as i32,
            Self::Translated(shape, offset) => shape.max(axis) + offset.on(axis),
        }
    }
}

#[derive(Clone)]
pub struct ShapeVec {
    shapes: Arc<RwLock<Vec<Shape>>>,
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
}

#[derive(Clone)]
pub struct ShapeRef {
    v: ShapeVec,
    idx: usize,
}

impl ShapeRef {
    #[inline]
    fn read<T, F>(&self, f: F) -> T
    where
        F: FnOnce(&Shape) -> T,
    {
        let shapes = self.v.shapes.read().unwrap();
        f(&shapes[self.idx])
    }

    #[inline]
    fn write<T, F>(&self, f: F) -> T
    where
        F: FnOnce(&mut Shape) -> T,
    {
        let mut shapes = self.v.shapes.write().unwrap();
        f(&mut shapes[self.idx])
    }

    pub fn is_empty(&self) -> bool {
        self.read(|x|x.is_empty())
    }

    pub fn size(&self) -> Vec3<u32> {
        self.read(|x|x.size())
    }

    pub fn min(&self, axis: Axis) -> i32 {
        self.read(|x|x.min(axis))
    }

    pub fn pos(&self) -> Vec3<i32> {
        self.read(|x|x.pos())
    }

    pub fn max(&self, axis: Axis) -> i32 {
        self.read(|x|x.max(axis))
    }

    /// Get a shape with the min position put at the given position
    pub fn with_min(&self, min: impl Into<Vec3<i32>>) -> Self {
        let min = min.into();
        let shape = self.read(|x| {
            match x {
                Shape::Empty => None,
                Shape::Prism(pos, size) => {
                    if min == *pos {
                        None
                    } else {
                        Some(Shape::Prism(min, *size))
                    }
                }
                Shape::Arbitrary(arb) => {
                    if min == arb.pos {
                        None
                    } else {
                        Some(self.do_translate(min - arb.pos))
                    }
                }
                Shape::Translated(inner, _) => {
                    let pos = x.pos();
                    if min == pos {
                        None
                    } else {
                        Some(inner.do_translate(min - pos))
                    }
                }
            }
        });
        match shape {
            Some(x) => self.add(x),
            None => self.clone(),
        }
    }

    /// Get a shape where the min pos of the given axis is at the given position
    pub fn with_axis_off(&self, axis: Axis, at: i32) -> Self {
        let mut pos = self.pos();
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
                Shape::Prism(pos, size) => {
                    if offset == (0, 0, 0).into() {
                        None
                    } else {
                        Some(Shape::Prism(*pos + offset, *size))
                    }
                }
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
        self.make_arbitrary();
        other.make_arbitrary();
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
        self.make_arbitrary();
        other.make_arbitrary();
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
        self.make_arbitrary();
        other.make_arbitrary();
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

    /// Convert self to an arbitrary shape, then apply the given function
    /// None is passed if the shape has 0 volume (i.e. is Empty)
    fn make_arbitrary(&self) {
        let mut guard = self.v.shapes.write().unwrap();
        Self::make_arbitrary_internal(&mut guard, self.idx);
    }

    // this is needed so we don't recursively lock the RwLock
    fn make_arbitrary_internal(guard: &mut RwLockWriteGuard<Vec<Shape>>, idx: usize) {
        match &guard[idx] {
            Shape::Prism(pos, size) => {
                if size.x() == 0 || size.y() == 0 || size.z() == 0 {
                    guard[idx] = Shape::Empty;
                } else {
                    let pos = *pos;
                    let size = *size;
                    guard[idx] = Shape::Arbitrary(Arbitrary::from_prism(pos, size));
                }
            }
            Shape::Translated(inner, offset) => {
                let offset = *offset;
                let idx = inner.idx;
                Self::make_arbitrary_internal(guard, idx);
                let arb = match &guard[idx] {
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
            return Self {
                v: self.v.clone(),
                idx: 0,
            }
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

#[derive(Debug, Clone)]
pub struct Arbitrary {
    points: BTreeSet<Vec3<i32>>,
    pos: Vec3<i32>,
    size: Vec3<u32>,
}

impl Arbitrary {
    pub fn from_prism(pos: Vec3<i32>, size: Vec3<u32>) -> Self {
        let mut points = BTreeSet::new();
        for x in pos.x()..pos.x() + size.x() as i32 {
            for y in pos.y()..pos.y() + size.y() as i32 {
                for z in pos.z()..pos.z() + size.z() as i32 {
                    points.insert((x, y, z).into());
                }
            }
        }
        Self {
            points,
            pos,
            size,
        }
    }

    pub fn translated(&self, offset: impl Into<Vec3<i32>>) -> Self {
        let offset = offset.into();
        let mut points = BTreeSet::new();
        for p in &self.points {
            points.insert(*p + offset);
        }
        Self {
            points,
            pos: self.pos + offset,
            size: self.size,
        }
    }

    pub fn union(&mut self, other: &Self) {
        self.points = self.points.union(&other.points).copied().collect();
        self.fix_bounds();
    }

    pub fn intersection(&mut self, other: &Self) {
        self.points = self.points.intersection(&other.points).copied().collect();
        self.fix_bounds();
    }

    pub fn difference(&mut self, other: &Self) {
        self.points = self.points.difference(&other.points).copied().collect();
        self.fix_bounds();
    }

    fn fix_bounds(&mut self) {
        if self.points.is_empty() {
            self.pos = (0, 0, 0).into();
            self.size = (0, 0, 0).into();
            return;
        }
        let mut min: Vec3<i32> = (i32::MAX, i32::MAX, i32::MAX).into();
        let mut max: Vec3<i32> = (i32::MIN, i32::MIN, i32::MIN).into();
        for p in &self.points {
            *min.x_mut() = min.x().min(p.x());
            *min.y_mut() = min.y().min(p.y());
            *min.z_mut() = min.z().min(p.z());
            *max.x_mut() = max.x().max(p.x());
            *max.y_mut() = max.y().max(p.y());
            *max.z_mut() = max.z().max(p.z());
        }
        self.pos = min;
        self.size = (
            nonneg!(max.x() - min.x()),
            nonneg!(max.y() - min.y()),
            nonneg!(max.z() - min.z()),
        ).into();
    }
}
