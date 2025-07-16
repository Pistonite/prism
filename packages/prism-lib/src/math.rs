use std::collections::BTreeMap;
use std::fmt::Display;
use std::sync::atomic::AtomicU64;
use std::sync::atomic::Ordering;

use csscolorparser::Color;
use derivative::Derivative;
use derive_more::derive::{Add, AddAssign, From, Into, Sub, SubAssign};
use num_traits::Num;
use serde::{Deserialize, Serialize};

macro_rules! nonneg {
    ($x:expr) => {
        u32::try_from($x).unwrap_or_default()
    };
}
pub(crate) use nonneg;

/// Vector of 3 elements
#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    PartialOrd,
    Ord,
    Eq,
    Hash,
    Default,
    Serialize,
    Deserialize,
    Add,
    Sub,
    From,
    Into,
    AddAssign,
    SubAssign,
)]
pub struct Vec3<T>(pub T, pub T, pub T);

impl<T> Vec3<T> {
    #[inline]
    pub fn x_ref(&self) -> &T {
        &self.0
    }
    #[inline]
    pub fn y_ref(&self) -> &T {
        &self.1
    }
    #[inline]
    pub fn z_ref(&self) -> &T {
        &self.2
    }
    #[inline]
    pub fn x_mut(&mut self) -> &mut T {
        &mut self.0
    }
    #[inline]
    pub fn y_mut(&mut self) -> &mut T {
        &mut self.1
    }
    #[inline]
    pub fn z_mut(&mut self) -> &mut T {
        &mut self.2
    }
    #[inline]
    pub fn on_ref(&self, axis: Axis) -> &T {
        match axis {
            Axis::X => self.x_ref(),
            Axis::Y => self.y_ref(),
            Axis::Z => self.z_ref(),
        }
    }

    #[inline]
    pub fn on_mut(&mut self, axis: Axis) -> &mut T {
        match axis {
            Axis::X => self.x_mut(),
            Axis::Y => self.y_mut(),
            Axis::Z => self.z_mut(),
        }
    }
}

impl<T: Copy> Vec3<T> {
    #[inline]
    pub fn x(&self) -> T {
        self.0
    }
    #[inline]
    pub fn y(&self) -> T {
        self.1
    }
    #[inline]
    pub fn z(&self) -> T {
        self.2
    }
    #[inline]
    pub fn on(&self, axis: Axis) -> T {
        match axis {
            Axis::X => self.x(),
            Axis::Y => self.y(),
            Axis::Z => self.z(),
        }
    }
}

impl<T: Num + PartialOrd> Vec3<T> {
    /// If all three components are positive
    pub fn all_positive(&self) -> bool {
        self.0 > T::zero() && self.1 > T::zero() && self.2 > T::zero()
    }
}

/// Geometry in 3D space (position and size)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Geom3 {
    pub size: Vec3<u32>,
    pub pos: Vec3<i32>,
}

macro_rules! geom3_sub_part {
    ($out:ident, pos: $pos:expr, size: [$x_size:expr, $y_size:expr, $z_size:expr $(,)?]) => {{
        let size = ($x_size, $y_size, $z_size);
        if size.0 > 0 && size.1 > 0 && size.2 > 0 {
            $out.push($crate::math::Geom3::new($pos, size))
        }
    }};
}

impl Geom3 {
    pub fn new(pos: impl Into<Vec3<i32>>, size: impl Into<Vec3<u32>>) -> Self {
        Self {
            pos: pos.into(),
            size: size.into(),
        }
    }

    /// Returns the intersection of this prism with another prism
    ///
    /// If the prisms do not intersect, A 0-volume prism is returned.
    pub fn intersection(&self, other: &Self) -> Self {
        let pos = Vec3::from((
            self.pos.x().max(other.pos.x()),
            self.pos.y().max(other.pos.y()),
            self.pos.z().max(other.pos.z()),
        ));
        Self::new(
            pos,
            (
                nonneg!(self.x_end().min(other.x_end()) - pos.x()),
                nonneg!(self.y_end().min(other.y_end()) - pos.y()),
                nonneg!(self.z_end().min(other.z_end()) - pos.z()),
            ),
        )
    }

    /// Subtract other from self, putting resulting non-zero-volume
    /// shapes into out
    pub fn difference(&self, operand: &Self, out: &mut Vec<Self>) {
        // this ensures we are subtracting a prism that
        // has no parts outside of self, to simplify the math
        let b = self.intersection(operand);
        if !b.has_positive_volume() {
            // nothing to subtract
            out.push(*self);
            return;
        }
        // top
        geom3_sub_part! {
            out,
            pos: Vec3(
                self.pos.x(),
                self.pos.y(),
                b.z_end(),
            ),
            size: [
                self.size.x(),
                self.size.y(),
                nonneg!(self.z_end() - b.z_end()),
            ]
        };
        // +x
        geom3_sub_part! {
            out,
            pos: Vec3(
                b.x_end(),
                self.pos.y(),
                b.pos.z(),
            ),
            size: [
                nonneg!(self.x_end() - b.x_end()),
                self.size.y(),
                b.size.z(),
            ]
        };

        // -x
        geom3_sub_part! {
            out,
            pos: Vec3(
                self.pos.x(),
                self.pos.y(),
                b.pos.z(),
            ),
            size: [
                nonneg!(b.pos.x() - self.pos.x()),
                self.size.y(),
                b.size.z(),
            ]
        };
        // +y
        geom3_sub_part! {
            out,
            pos: Vec3(
                b.pos.x(),
                b.y_end(),
                b.pos.z(),
            ),
            size: [
                b.size.x(),
                nonneg!(self.y_end() - b.y_end()),
                b.size.z(),
            ]
        };
        // -y
        geom3_sub_part! {
            out,
            pos: Vec3(
                b.pos.x(),
                self.pos.y(),
                b.pos.z(),
            ),
            size: [
                b.size.x(),
                nonneg!(b.pos.y() - self.pos.y()),
                b.size.z(),
            ]
        };
        // bottom
        geom3_sub_part! {
            out,
            pos: self.pos,
            size: [
                self.size.x(),
                self.size.y(),
                nonneg!(b.pos.z() - self.pos.z())
            ]
        };
    }

    /// The end of the prism in the x direction
    #[inline]
    pub fn x_end(&self) -> i32 {
        self.pos.x() + self.size.x() as i32
    }

    /// The end of the prism in the y direction
    #[inline]
    pub fn y_end(&self) -> i32 {
        self.pos.y() + self.size.y() as i32
    }

    /// The end of the prism in the z direction
    #[inline]
    pub fn z_end(&self) -> i32 {
        self.pos.z() + self.size.z() as i32
    }

    /// Checks if the prism has positive volume
    #[inline]
    pub fn has_positive_volume(&self) -> bool {
        self.size.x() > 0 && self.size.y() > 0 && self.size.z() > 0
    }

    /// Check if the prism contains a unit cube at the position
    #[inline]
    pub fn contains_unit_cube(&self, pos: Vec3<i32>) -> bool {
        self.pos.x() <= pos.x()
            && pos.x() < self.x_end()
            && self.pos.y() <= pos.y()
            && pos.y() < self.y_end()
            && self.pos.z() <= pos.z()
            && pos.z() < self.z_end()
    }
}

/// Axis in 3D space
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Axis {
    X = 0,
    Y = 1,
    Z = 2,
}
impl From<Axis> for u32 {
    fn from(axis: Axis) -> u32 {
        axis as u32
    }
}
impl Axis {
    pub fn from_u32(axis: u32) -> Option<Self> {
        match axis {
            0 => Some(Self::X),
            1 => Some(Self::Y),
            2 => Some(Self::Z),
            _ => None,
        }
    }
}

/// A 2D grid of (u, v) -> T
#[derive(Derivative, Debug, Clone, Serialize, Deserialize)]
#[derivative(Default(bound = "", new = "true"))]
pub struct Grid2<T>(BTreeMap<(i32, i32), T>);
impl<T> Grid2<T> {
    pub fn get(&self, u: i32, v: i32) -> Option<&T> {
        self.0.get(&(u, v))
    }
    pub fn get_mut(&mut self, u: i32, v: i32) -> Option<&mut T> {
        self.0.get_mut(&(u, v))
    }
    /// Put value at (u, v)
    pub fn set(&mut self, u: i32, v: i32, value: T) {
        self.0.insert((u, v), value);
    }
    pub fn entry(&mut self, u: i32, v: i32) -> Entry<T> {
        self.0.entry((u, v))
    }
    pub fn len(&self) -> usize {
        self.0.len()
    }
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
    pub fn remove_one(&mut self) -> Option<(i32, i32, T)> {
        self.0.pop_first().map(|((u, v), t)| (u, v, t))
    }
    pub fn remove(&mut self, u: i32, v: i32) -> Option<T> {
        self.0.remove(&(u, v))
    }
    pub fn iter(&self) -> std::collections::btree_map::Iter<(i32, i32), T> {
        self.0.iter()
    }
}

impl<T> IntoIterator for Grid2<T> {
    type Item = ((i32, i32), T);
    type IntoIter = std::collections::btree_map::IntoIter<(i32, i32), T>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

pub type Entry<'a, T> = std::collections::btree_map::Entry<'a, (i32, i32), T>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Rgba(u32);

impl Rgba {
    pub fn is_transparent(&self) -> bool {
        self.0 & 0xff == 0
    }
}

impl From<Color> for Rgba {
    fn from(color: Color) -> Self {
        (&color).into()
    }
}
impl From<&Color> for Rgba {
    fn from(color: &Color) -> Self {
        let rgba = color.to_rgba8();
        Self(u32::from_be_bytes(rgba))
    }
}

impl Display for Rgba {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let [r, g, b, a] = self.0.to_be_bytes();
        match a {
            0 => write!(f, "#00000000"),
            255 => write!(f, "#{r:02x}{g:02x}{b:02x}"),
            _ => write!(f, "#{r:02x}{g:02x}{b:02x}{a:02x}"),
        }
    }
}

#[derive(Debug, Derivative)]
#[derivative(Default(bound = "", new = "true"))]
pub struct VecMap<E: VecMapEntry>(Vec<E>);
impl<E: VecMapEntry> VecMap<E> {
    pub fn get_mut<'s>(&'s mut self, k: &E::Key) -> &'s mut E::Value {
        match self.0.iter().position(|e| e.key() == k) {
            Some(index) => self.0[index].value_mut(),
            None => {
                self.0.push(E::new(k));
                self.0.last_mut().unwrap().value_mut()
            }
        }
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

impl<E: VecMapEntry> IntoIterator for VecMap<E> {
    type Item = E;
    type IntoIter = std::vec::IntoIter<E>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

impl<E: VecMapEntry> From<VecMap<E>> for Vec<E> {
    fn from(map: VecMap<E>) -> Self {
        map.0
    }
}

pub trait VecMapEntry {
    type Key: PartialEq;
    type Value;
    fn key(&self) -> &Self::Key;
    fn value_mut(&mut self) -> &mut Self::Value;
    fn new(key: &Self::Key) -> Self;
}

impl<K: Clone + PartialEq, V: Default> VecMapEntry for (K, V) {
    type Key = K;

    type Value = V;

    fn key(&self) -> &Self::Key {
        &self.0
    }

    fn value_mut(&mut self) -> &mut Self::Value {
        &mut self.1
    }

    fn new(key: &Self::Key) -> Self {
        (key.clone(), Default::default())
    }
}

// https://github.com/rust-lang/rust/issues/72353
#[repr(transparent)]
pub struct AtomicF64 {
    storage: AtomicU64,
}
impl AtomicF64 {
    pub fn new(value: f64) -> Self {
        let as_u64 = value.to_bits();
        Self {
            storage: AtomicU64::new(as_u64),
        }
    }
    pub fn store(&self, value: f64, ordering: Ordering) {
        let as_u64 = value.to_bits();
        self.storage.store(as_u64, ordering)
    }
    pub fn load(&self, ordering: Ordering) -> f64 {
        let as_u64 = self.storage.load(ordering);
        f64::from_bits(as_u64)
    }
}
