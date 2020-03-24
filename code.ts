interface Point {
  x: number;
  y: number;
}

// Square distance between two points a and b
function squareDistance(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

// Square distance from point p to a segment between points a and b.
function squareDistanceToSegment(p: Point, a: Point, b: Point): number {
  let { x, y } = a;
  let dx = b.x - x;
  let dy = b.y - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx ** 2 + dy ** 2);
    if (t > 1) {
      ({ x, y } = b);
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p.x - x;
  dy = p.y - y;
  return dx ** 2 + dy ** 2;
}

// Douglas-Peucker algorithm to simplify (smoothen) a sequence of points
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 1) {
    return points;
  }
  const len = points.length;
  const sqTolerance = tolerance ** 2;
  const markers = new Uint8Array(len);
  let first = 0;
  let last = len - 1;
  const stack = [];
  const newPoints = [];
  markers[first] = 1;
  markers[last] = 1;
  while (last) {
    let maxSqDist = 0;
    let index = 0;
    for (let i = first + 1; i < last; i++) {
      const sqDist = squareDistanceToSegment(
        points[i],
        points[first],
        points[last]
      );
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }
    if (maxSqDist > sqTolerance) {
      markers[index] = 1;
      stack.push(first, index, index, last);
    }
    last = stack.pop();
    first = stack.pop();
  }
  for (let i = 0; i < len; i++) {
    if (markers[i]) newPoints.push(points[i]);
  }
  return newPoints;
}

const RECURSION_LIMIT = 8;
const FLT_EPSILON = 1.1920929e-7;
const curve_angle_tolerance_epsilon = 0.01;
const m_angle_tolerance = 0;
const m_cusp_limit = 0;

// Entry point for recursive bezier curve rendering
function renderBezier(start: Point, c1: Point, c2: Point, end: Point): Point[] {
  const points = [];
  points.push(start);
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = c1;
  const { x: x3, y: y3 } = c2;
  const { x: x4, y: y4 } = end;
  renderBezierRecursive(x1, y1, x2, y2, x3, y3, x4, y4, points, 1, 0);
  points.push(end);
  return points;
}

// Recursively split bezier curve in two, adding newly created points to the list
function renderBezierRecursive(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  points: Point[],
  distanceTolerance: number,
  level: number
) {
  if (level > RECURSION_LIMIT) {
    return;
  }

  const pi = Math.PI;

  // Calculate all the mid-points of the line segments
  //----------------------
  const x12 = (x1 + x2) / 2;
  const y12 = (y1 + y2) / 2;
  const x23 = (x2 + x3) / 2;
  const y23 = (y2 + y3) / 2;
  const x34 = (x3 + x4) / 2;
  const y34 = (y3 + y4) / 2;
  const x123 = (x12 + x23) / 2;
  const y123 = (y12 + y23) / 2;
  const x234 = (x23 + x34) / 2;
  const y234 = (y23 + y34) / 2;
  const x1234 = (x123 + x234) / 2;
  const y1234 = (y123 + y234) / 2;

  if (level > 0) {
    // Enforce subdivision first time
    // Try to approximate the full cubic curve by a single straight line
    //------------------
    let dx = x4 - x1;
    let dy = y4 - y1;

    let d2 = Math.abs((x2 - x4) * dy - (y2 - y4) * dx);
    let d3 = Math.abs((x3 - x4) * dy - (y3 - y4) * dx);

    let da1, da2;

    if (d2 > FLT_EPSILON && d3 > FLT_EPSILON) {
      // Regular care
      //-----------------
      if ((d2 + d3) * (d2 + d3) <= distanceTolerance * (dx * dx + dy * dy)) {
        // If the curvature doesn't exceed the distanceTolerance value
        // we tend to finish subdivisions.
        //----------------------
        if (m_angle_tolerance < curve_angle_tolerance_epsilon) {
          points.push({ x: x1234, y: y1234 });
          return;
        }

        // Angle & Cusp Condition
        //----------------------
        let a23 = Math.atan2(y3 - y2, x3 - x2);
        da1 = Math.abs(a23 - Math.atan2(y2 - y1, x2 - x1));
        da2 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - a23);
        if (da1 >= pi) da1 = 2 * pi - da1;
        if (da2 >= pi) da2 = 2 * pi - da2;

        if (da1 + da2 < m_angle_tolerance) {
          // Finally we can stop the recursion
          //----------------------
          points.push({ x: x1234, y: y1234 });
          return;
        }

        if (m_cusp_limit !== 0.0) {
          if (da1 > m_cusp_limit) {
            points.push({ x: x2, y: y2 });
            return;
          }

          if (da2 > m_cusp_limit) {
            points.push({ x: x3, y: y3 });
            return;
          }
        }
      }
    } else {
      if (d2 > FLT_EPSILON) {
        // p1,p3,p4 are collinear, p2 is considerable
        //----------------------
        if (d2 * d2 <= distanceTolerance * (dx * dx + dy * dy)) {
          if (m_angle_tolerance < curve_angle_tolerance_epsilon) {
            points.push({ x: x1234, y: y1234 });
            return;
          }

          // Angle Condition
          //----------------------
          da1 = Math.abs(
            Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y2 - y1, x2 - x1)
          );
          if (da1 >= pi) da1 = 2 * pi - da1;

          if (da1 < m_angle_tolerance) {
            points.push({ x: x2, y: y2 });
            points.push({ x: x3, y: y3 });
            return;
          }

          if (m_cusp_limit !== 0.0) {
            if (da1 > m_cusp_limit) {
              points.push({ x: x2, y: y2 });
              return;
            }
          }
        }
      } else if (d3 > FLT_EPSILON) {
        // p1,p2,p4 are collinear, p3 is considerable
        //----------------------
        if (d3 * d3 <= distanceTolerance * (dx * dx + dy * dy)) {
          if (m_angle_tolerance < curve_angle_tolerance_epsilon) {
            points.push({ x: x1234, y: y1234 });
            return;
          }

          // Angle Condition
          //----------------------
          da1 = Math.abs(
            Math.atan2(y4 - y3, x4 - x3) - Math.atan2(y3 - y2, x3 - x2)
          );
          if (da1 >= pi) da1 = 2 * pi - da1;

          if (da1 < m_angle_tolerance) {
            points.push({ x: x2, y: y2 });
            points.push({ x: x3, y: y3 });
            return;
          }

          if (m_cusp_limit !== 0.0) {
            if (da1 > m_cusp_limit) {
              points.push({ x: x3, y: y3 });
              return;
            }
          }
        }
      } else {
        // Collinear case
        //-----------------
        dx = x1234 - (x1 + x4) / 2;
        dy = y1234 - (y1 + y4) / 2;
        if (dx * dx + dy * dy <= distanceTolerance) {
          points.push({ x: x1234, y: y1234 });
          return;
        }
      }
    }
  }

  // Continue subdivision
  //----------------------
  renderBezierRecursive(
    x1,
    y1,
    x12,
    y12,
    x123,
    y123,
    x1234,
    y1234,
    points,
    distanceTolerance,
    level + 1
  );
  renderBezierRecursive(
    x1234,
    y1234,
    x234,
    y234,
    x34,
    y34,
    x4,
    y4,
    points,
    distanceTolerance,
    level + 1
  );
}

// Converts array of points to a smooth SVG path data like "M x y C sx sy ex ey px py C ..."
function svgPathData(points: Point[]): string {
  const line = (a: Point, b: Point) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return {
      length: Math.sqrt(dx ** 2 + dy ** 2),
      angle: Math.atan2(dy, dx)
    };
  };
  const controlPoint = (
    current: Point,
    previous: Point,
    next: Point,
    reverse: boolean
  ): Point => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.2;
    const o = line(p, n);
    const angle = o.angle + (reverse ? Math.PI : 0);
    const length = o.length * smoothing;
    const x = current.x + Math.cos(angle) * length;
    const y = current.y + Math.sin(angle) * length;
    return { x, y };
  };
  const bezierCommand = (point: Point, i: number, a: Point[]) => {
    const cps = controlPoint(a[i - 1], a[i - 2], point, false);
    const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
    return `C ${cps.x} ${cps.y} ${cpe.x} ${cpe.y} ${point.x} ${point.y}`;
  };
  return points.reduce(
    (acc, point, i, a) =>
      i === 0
        ? `M ${point.x} ${point.y}`
        : `${acc} ${bezierCommand(point, i, a)}`,
    ""
  );
}

const vectors = figma.currentPage.selection
  .filter(n => n.type === "VECTOR");
if (vectors.length == 0) {
  figma.notify('Please, select at least one vector path to simplify.');
}
vectors.forEach(node => {
  const v = node as VectorNode;
  let allPoints: Point[] = [];
  v.vectorNetwork.segments.forEach(segment => {
    const start = v.vectorNetwork.vertices[segment.start];
    const end = v.vectorNetwork.vertices[segment.end];
    const c1 = { x: start.x, y: start.y };
    const c2 = { x: end.x, y: end.y };
    if (segment.tangentStart) {
      c1[0] = c1[0] + segment.tangentStart.x;
      c1[1] = c1[1] + segment.tangentStart.y;
    }
    if (segment.tangentEnd) {
      c2[0] = c2[0] + segment.tangentEnd.x;
      c2[1] = c2[1] + segment.tangentEnd.y;
    }
    const points = renderBezier(start, c1, c2, end);
    allPoints = allPoints.concat(points);
  });
  allPoints = simplify(allPoints, 2);
  const path: VectorPath = {
    windingRule: "NONE",
    data: svgPathData(allPoints)
  };
  v.vectorPaths = [path];
});

figma.closePlugin();
