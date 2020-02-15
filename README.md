# Simplify path plugin for Figma

A small plugin that simplifies vector paths in Figma.

It can be applied to any vector nodes. The plugin iterates through all segments, renders Bezier curves using [De Casteljau's algorithm][1], then reduces the number of points in the lines using [Douglas-Peucker algorithm][2] and converts resulting points into new Bezier curves.

This results in smoother and simpler lines, which can be especially helpful when using Pencil tool.

[1]: https://en.wikipedia.org/wiki/De_Casteljau%27s_algorithm
[2]: https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
