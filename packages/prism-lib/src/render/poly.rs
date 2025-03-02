use std::{cell::RefCell, collections::VecDeque, rc::Rc};

use derive_more::derive::{Deref, DerefMut};

use crate::math::{Grid2, Rgba, VecMapEntry};

/// Per-color coordinate map
#[derive(Debug, Clone)]
pub struct Layer {
    pub color: Rgba,
    pub grid: Grid2<()>,
}

impl VecMapEntry for Layer {
    type Key = Rgba;
    type Value = Grid2<()>;

    fn key(&self) -> &Self::Key {
        &self.color
    }

    fn value_mut(&mut self) -> &mut Self::Value {
        &mut self.grid
    }

    fn new(key: &Self::Key) -> Self {
        Self {
            color: *key,
            grid: Default::default(),
        }
    }
}

/// A polygon is a list of vertices with a fill color
#[derive(Debug, Clone)]
pub struct Polygon {
    pub color: Rgba,
    pub verts: Vec<(f64, f64)>,
}

impl Polygon {
    pub fn new(color: Rgba, verts: Vec<(f64, f64)>) -> Self {
        Self { color, verts }
    }
}

impl Layer {
    /// Convert this layer into a list of vertices
    ///
    /// This is the entrypoint for the polygon-making algorithm.
    ///
    /// We could render each triangle in the grid as a polygon, but
    /// there are 2 issues:
    /// - There will be too many polygons, causing output SVG to be HUGE
    /// - There will be gaps between all the polygons
    ///
    /// To solve this, we need to combine the adjacent triangles into
    /// a single polygon. To do this, the grid is converted first
    /// into a tree. Then, internal borders of the tree are removed,
    /// forming the outer edges of the polygon
    pub fn into_polygons(mut self, out: &mut Vec<Polygon>) {
        let trees = self.make_trees();
        for tree in trees {
            let segs = tree.to_segments();
            let verts = create_vertices(&segs);
            out.push(Polygon::new(self.color, verts));
        }
    }

    /// Consume the grid and make it into trees.
    ///
    /// The return is a vec because the grid may have multiple
    /// disjoint trees
    fn make_trees(&mut self) -> Vec<Tree3> {
        let mut trees = Vec::new();
        let mut queue = VecDeque::new();
        struct SearchNode {
            /// where to put the output tree
            out: Rc<RefCell<Option<Tree3>>>,
            u: i32,
            v: i32,
        }
        while let Some((u, v, _)) = self.grid.remove_one() {
            let root_cell = Rc::new(RefCell::new(None));
            queue.push_back(SearchNode {
                out: Rc::clone(&root_cell),
                u,
                v,
            });

            while let Some(SearchNode { out, u, v }) = queue.pop_front() {
                let curr = Tree3::new(u, v);
                // Get top subtree if possible
                let (u_top, v_top) = curr.uv_top();
                if self.grid.remove(u_top, v_top).is_some() {
                    queue.push_back(SearchNode {
                        out: Rc::clone(&curr.top),
                        u: u_top,
                        v: v_top,
                    });
                }
                // Get bottom subtree if possible
                let (u_bottom, v_bottom) = curr.uv_bottom();
                if self.grid.remove(u_bottom, v_bottom).is_some() {
                    queue.push_back(SearchNode {
                        out: Rc::clone(&curr.bottom),
                        u: u_bottom,
                        v: v_bottom,
                    });
                }
                // Get side subtree if possible
                let (u_side, v_side) = curr.uv_side();
                if self.grid.remove(u_side, v_side).is_some() {
                    queue.push_back(SearchNode {
                        out: Rc::clone(&curr.side),
                        u: u_side,
                        v: v_side,
                    });
                }
                out.replace(Some(curr));
            }

            // queue is empty, so we must be the only one owning the root
            let root = root_cell.borrow_mut().take().unwrap();
            trees.push(root);
        }
        trees
    }
}

#[derive(Debug, Clone, Deref, DerefMut)]
struct Tree3 {
    /// Center of the tree
    #[deref]
    #[deref_mut]
    uv: TreeUV,
    top: Rc<RefCell<Option<Tree3>>>,
    bottom: Rc<RefCell<Option<Tree3>>>,
    /// Left or right side, depends on the center
    side: Rc<RefCell<Option<Tree3>>>,
}

impl Tree3 {
    pub fn new(u: i32, v: i32) -> Self {
        Self {
            uv: TreeUV(u, v),
            top: Rc::new(RefCell::new(None)),
            bottom: Rc::new(RefCell::new(None)),
            side: Rc::new(RefCell::new(None)),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct TreeUV(i32, i32);
impl TreeUV {
    pub fn u(&self) -> i32 {
        self.0
    }
    pub fn v(&self) -> i32 {
        self.1
    }
    pub fn uv_top(&self) -> (i32, i32) {
        (self.u(), self.v() - 1)
    }
    pub fn uv_bottom(&self) -> (i32, i32) {
        (self.u(), self.v() + 1)
    }
    pub fn uv_side(&self) -> (i32, i32) {
        if self.is_pointing_left() {
            (self.u() + 1, self.v())
        } else {
            (self.u() - 1, self.v())
        }
    }
    pub fn is_pointing_left(&self) -> bool {
        (self.u() + self.v()) % 2 == 0
    }
}

/// A segment (edge) of a polygon
#[derive(Debug, Clone, Copy, PartialEq, Deref, DerefMut)]
struct Seg {
    #[deref]
    #[deref_mut]
    uv: TreeUV,
    vertical: bool,
}

enum TreeSide {
    Top,
    Bottom,
    Side,
}

impl Tree3 {
    /// Convert the tree into segments
    ///
    /// Internal borders are removed, but outer borders
    /// are kept even if they are internal to the polygon
    fn to_segments(&self) -> Vec<Seg> {
        let mut segs = Vec::new();
        self.add_to_segments(&mut segs, None);
        segs
    }

    fn add_to_segments(&self, segs: &mut Vec<Seg>, from_side: Option<TreeSide>) {
        let is_pointing_left = self.is_pointing_left();
        // we want to keep the order consistent when traversing the tree,
        // so the segment list are connected
        match (from_side, is_pointing_left) {
            // from root, add all 3 directions
            (None, _) => {
                self.uv.add_top(&self.top, segs);
                if is_pointing_left {
                    self.uv.add_side(&self.side, segs);
                    self.uv.add_bottom(&self.bottom, segs);
                } else {
                    self.uv.add_bottom(&self.bottom, segs);
                    self.uv.add_side(&self.side, segs);
                }
            }
            // add 2 directions based on coming from which side
            (Some(TreeSide::Top), true) => {
                self.uv.add_side(&self.side, segs);
                self.uv.add_bottom(&self.bottom, segs);
            }
            (Some(TreeSide::Bottom), true) => {
                self.uv.add_top(&self.top, segs);
                self.uv.add_side(&self.side, segs);
            }
            (Some(TreeSide::Side), true) => {
                self.uv.add_bottom(&self.bottom, segs);
                self.uv.add_top(&self.top, segs);
            }
            (Some(TreeSide::Top), false) => {
                self.uv.add_bottom(&self.bottom, segs);
                self.uv.add_side(&self.side, segs);
            }
            (Some(TreeSide::Bottom), false) => {
                self.uv.add_side(&self.side, segs);
                self.uv.add_top(&self.top, segs);
            }
            (Some(TreeSide::Side), false) => {
                self.uv.add_top(&self.top, segs);
                self.uv.add_bottom(&self.bottom, segs);
            }
        }
    }
}

impl TreeUV {
    #[inline]
    fn add_top(&self, top: &Rc<RefCell<Option<Tree3>>>, segs: &mut Vec<Seg>) {
        match top.borrow().as_ref() {
            None => {
                segs.push(Seg {
                    uv: *self,
                    vertical: false,
                });
            }
            Some(top) => {
                top.add_to_segments(segs, Some(TreeSide::Bottom));
            }
        }
    }

    #[inline]
    fn add_bottom(&self, bottom: &Rc<RefCell<Option<Tree3>>>, segs: &mut Vec<Seg>) {
        match bottom.borrow().as_ref() {
            None => {
                segs.push(Seg {
                    uv: TreeUV(self.u(), self.v() + 1),
                    vertical: false,
                });
            }
            Some(bottom) => {
                bottom.add_to_segments(segs, Some(TreeSide::Top));
            }
        }
    }

    #[inline]
    fn add_side(&self, side: &Rc<RefCell<Option<Tree3>>>, segs: &mut Vec<Seg>) {
        match side.borrow().as_ref() {
            None => {
                let uv = if self.is_pointing_left() {
                    *self
                } else {
                    TreeUV(self.u() - 1, self.v())
                };
                segs.push(Seg { uv, vertical: true });
            }
            Some(side) => {
                side.add_to_segments(segs, Some(TreeSide::Side));
            }
        }
    }
}

fn create_vertices(segs: &[Seg]) -> Vec<(f64, f64)> {
    if segs.len() < 3 {
        // not enough segments to form a polygon
        return vec![];
    }
    let mut optimized = Vec::<(Seg, Dir)>::new();
    let mut skip = false;

    for (i, seg) in segs.iter().enumerate() {
        if skip {
            skip = false;
            continue;
        }
        match optimized.last() {
            None => {
                let next = match segs.get(i + 1) {
                    None => {
                        // this should not happen
                        debug_assert!(
                            false,
                            "there should always be next segment if optimized is empty"
                        );
                        return vec![];
                    }
                    Some(next) => next,
                };
                if seg.resolve_next_direction(Dir::PosV, next).is_some() {
                    optimized.push((*seg, Dir::PosV));
                } else if seg.resolve_next_direction(Dir::NegV, next).is_some() {
                    optimized.push((*seg, Dir::NegV));
                } else {
                    // this means the next segment is the same as the current segment
                    // so we skip both segments
                    debug_assert_eq!(seg, next);
                    skip = true;
                }
            }
            Some(last) => {
                match last.0.resolve_next_direction(last.1, seg) {
                    None => {
                        // The next segment is invalid, this can only mean that the next segment
                        // is the same as last segment, but in the other direction.
                        // so we remove the last segment
                        debug_assert_eq!(&last.0, seg);
                        optimized.pop();
                    }
                    Some(dir) => {
                        optimized.push((*seg, dir));
                    }
                }
            }
        }
    }

    create_vertices_with_optimized(&optimized)
}

fn create_vertices_with_optimized(segs: &[(Seg, Dir)]) -> Vec<(f64, f64)> {
    let mut verts = Vec::new();
    for (i, (seg, dir)) in segs.iter().enumerate() {
        if i == 0 || !seg.colinear(&segs[i - 1].0) {
            verts.push(seg.get_vertice(*dir));
        }
    }
    verts
}

impl Seg {
    /// Check if the next can be the next segment of self, and return if the next
    /// direction is negative v
    pub fn resolve_next_direction(&self, dir: Dir, next: &Self) -> Option<Dir> {
        let d_u = next.u() - self.u();
        let d_v = next.v() - self.v();

        if self.vertical {
            let dir = match dir {
                Dir::NegV => match (d_u, d_v, next.vertical) {
                    (0, 0, false) => Dir::PosV,
                    (0, -1, false) => Dir::NegV,
                    (0, -2, true) => Dir::NegV,
                    (1, -1, false) => Dir::NegV,
                    (1, 0, false) => Dir::PosV,
                    _ => return None,
                },
                Dir::PosV => match (d_u, d_v, next.vertical) {
                    (1, 1, false) => Dir::NegV,
                    (1, 2, false) => Dir::PosV,
                    (0, 2, true) => Dir::PosV,
                    (0, 2, false) => Dir::PosV,
                    (0, 1, false) => Dir::NegV,
                    _ => return None,
                },
            };
            return Some(dir);
        }

        let dir = match (dir, self.is_pointing_left()) {
            (Dir::NegV, true) => match (d_u, d_v, next.vertical) {
                (0, -1, false) => Dir::NegV,
                (0, -2, true) => Dir::NegV,
                (1, -1, false) => Dir::NegV,
                (1, 0, false) => Dir::PosV,
                (0, 0, true) => Dir::PosV,
                _ => return None,
            },
            (Dir::NegV, false) => match (d_u, d_v, next.vertical) {
                (-1, 0, true) => Dir::PosV,
                (-1, 0, false) => Dir::PosV,
                (-1, -1, false) => Dir::NegV,
                (-1, -2, true) => Dir::NegV,
                (0, -1, false) => Dir::NegV,
                _ => return None,
            },
            (Dir::PosV, true) => match (d_u, d_v, next.vertical) {
                (0, 1, false) => Dir::PosV,
                (-1, 1, true) => Dir::PosV,
                (-1, 1, false) => Dir::PosV,
                (-1, 0, false) => Dir::NegV,
                (-1, -1, true) => Dir::NegV,
                _ => return None,
            },

            (Dir::PosV, false) => match (d_u, d_v, next.vertical) {
                (0, -1, true) => Dir::NegV,
                (1, 0, false) => Dir::NegV,
                (1, 1, false) => Dir::PosV,
                (0, 1, true) => Dir::PosV,
                (0, 1, false) => Dir::PosV,
                _ => return None,
            },
        };

        Some(dir)
    }

    /// Return if the segment is colinear with an adjacent segment
    pub fn colinear(&self, other: &Self) -> bool {
        if self.vertical != other.vertical {
            return false;
        }
        if self.vertical {
            return true;
        }
        // the triangle needs to be pointing in the same direction
        self.is_pointing_left() == other.is_pointing_left()
    }

    /// Convert segment to a vertice
    pub fn get_vertice(&self, dir: Dir) -> (f64, f64) {
        // NOTE:
        // even though it's technically more precise
        // to multiply the unit here as we do the trignometry,
        // it's harder to correct for the translation when we create
        // the SVG bounds.
        //
        // So we defer multiplying the unit to the SVG creation
        if self.is_pointing_left() {
            match dir {
                Dir::NegV => {
                    if self.vertical {
                        (self.u_plus1_cos30(), self.v_sin30() + 1.)
                    } else {
                        (self.u_cos30(), self.v_plus1_sin30())
                    }
                }
                Dir::PosV => {
                    // same point regardless of vertical
                    (self.u_plus1_cos30(), self.v_sin30())
                }
            }
        } else {
            // cannot be vertical
            match dir {
                Dir::NegV => (self.u_plus1_cos30(), self.v_plus1_sin30()),
                Dir::PosV => (self.u_cos30(), self.v_sin30()),
            }
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum Dir {
    NegV,
    PosV,
}

impl TreeUV {
    #[inline]
    fn u_cos30(&self) -> f64 {
        self.u() as f64 * 3_f64.sqrt() / 2.0
    }
    #[inline]
    fn u_plus1_cos30(&self) -> f64 {
        (self.u() + 1) as f64 * 3_f64.sqrt() / 2.0
    }
    #[inline]
    fn v_sin30(&self) -> f64 {
        self.v() as f64 * 0.5
    }
    #[inline]
    fn v_plus1_sin30(&self) -> f64 {
        (self.v() + 1) as f64 * 0.5
    }
}
