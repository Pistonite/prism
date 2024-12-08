use std::collections::BTreeMap;
use std::fmt::Display;

use csscolorparser::Color;
use derivative::Derivative;
use derive_more::derive::{Add, From, Into};
use num_traits::Num;
use serde::{Deserialize, Serialize};

macro_rules! nonneg {
    ($x:expr) => {
        u32::try_from($x).unwrap_or_default()
    };
}
pub(crate) use nonneg;
macro_rules! nonneg_sub {
    ($x:expr, $y:expr) => {
        nonneg!($x).saturating_sub(nonneg!($y))
    };
}
pub(crate) use nonneg_sub;

/// Vector of 3 elements
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Hash, Default, Serialize, Deserialize, Add, From, Into,
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
}

impl<T: Num + PartialOrd> Vec3<T> {
    /// If all three components are positive
    pub fn all_positive(&self) -> bool {
        self.0 > T::zero() && self.1 > T::zero() && self.2 > T::zero()
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
            255 => write!(f, "#{:02x}{:02x}{:02x}", r, g, b),
            _ => write!(f, "#{:02x}{:02x}{:02x}{:02x}", r, g, b, a),
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
