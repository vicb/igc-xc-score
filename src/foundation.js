'use strict';
import * as util from './util.js';
import * as vincentys from './vincentys.js';

export class Point {
    constructor(x, y) {
        if (Array.isArray(x))
            [this.x, this.y, this.r] = [x[y].longitude, x[y].latitude, y];
        else
            [this.x, this.y] = [x, y];
    }

    geojson(id, properties) {
        const feature = {
            type: 'Feature',
            id,
            properties: properties || {},
            geometry: {
                type: 'Point',
                coordinates: [this.x, this.y]
            }
        };
        return feature;
    }

    /* c8 ignore next 3 */
    toString() {
        return JSON.stringify(this.geojson());
    }

    intersects(other) {
        if (other instanceof Point)
            return (this.x == other.x && this.y == other.y);
        if (other instanceof Box)
            return other.intersects(this);
        throw new TypeError('other must be either Point or Box');
    }

    distanceEarth(p) {
        return this.distanceEarthFCC(p);
    }

    distanceEarthFCC(p) {
        const df = (p.y - this.y);
        const dg = (p.x - this.x);
        const fm = util.radians((this.y + p.y) / 2);
        const k1 = 111.13209 - 0.566605 * Math.cos(2 * fm) + 0.00120 * Math.cos(4 * fm);
        const k2 = 111.41513 * Math.cos(fm) - 0.09455 * Math.cos(3 * fm) + 0.00012 * Math.cos(5 * fm);
        const d = Math.sqrt((k1 * df) * (k1 * df) + (k2 * dg) * (k2 * dg));
        return d;
    }

    /* c8 ignore next 5 */
    distanceEarthRev(dx, dy) {
        const lon = this.x + util.degrees((dx / util.REarth) / Math.cos(util.radians(this.y)));
        const lat = this.y + util.degrees(dy / util.REarth);
        return new Point(lon, lat);
    }

    distanceEarthVincentys(p) {
        return vincentys.inverse(this, p).distance;
    }
}

export class Range {
    constructor(a, b) {
        [this.a, this.b] = [a, b];
    }

    count() {
        return Math.abs(this.a - this.b) + 1;
    }

    center() {
        return Math.min(this.a, this.b) + Math.floor(Math.abs(this.a - this.b) / 2);
    }

    left() {
        return new Range(Math.min(this.a, this.b), Math.min(this.a, this.b) + Math.floor(Math.abs(this.a - this.b) / 2));
    }

    right() {
        return new Range(Math.min(this.a, this.b) + Math.ceil(Math.abs(this.a - this.b) / 2), Math.max(this.a, this.b));
    }

    contains(p) {
        return this.a <= p && p <= this.b;
    }

    /* c8 ignore next 3 */
    toString() {
        return `${this.a}:${this.b}`;
    }
}

export class Box {
    constructor(a, b, c, d) {
        if (a instanceof Range) {
            [this.x1, this.y1, this.x2, this.y2] = [Infinity, Infinity, -Infinity, -Infinity];
            for (let i = a.a; i <= a.b; i++) {
                this.x1 = Math.min(b.flightPoints[i].x, this.x1);
                this.y1 = Math.min(b.flightPoints[i].y, this.y1);
                this.x2 = Math.max(b.flightPoints[i].x, this.x2);
                this.y2 = Math.max(b.flightPoints[i].y, this.y2);
            }
        } else {
            [this.x1, this.y1, this.x2, this.y2] = [a, b, c, d];
        }
    }

    vertices() {
        return [
            new Point(this.x1, this.y1),
            new Point(this.x2, this.y1),
            new Point(this.x2, this.y2),
            new Point(this.x1, this.y2)
        ];
    }

    intersects(other) {
        if (other instanceof Point)
            return (this.x1 <= other.x && this.y1 <= other.y && this.x2 >= other.x && this.y2 >= other.y);
        if (this.x1 > other.x2 || this.x2 < other.x1 || this.y1 > other.y2 || this.y2 < other.y1)
            return false;
        return true;
    }

    area() {
        const h = Math.abs(this.x2 - this.x1);
        const w = Math.abs(this.y2 - this.y1);
        return h * w;
    }

    /* c8 ignore next 25 */
    distance(other) {
        if (this.intersects(other))
            return 0;
        let x1, y1, x2, y2;
        if (this.x1 > other.x2)
            x1 = this.x1;
        x2 = other.x2;
        if (this.x2 < other.x1)
            x1 = this.x2;
        x2 = other.x1;
        if (this.y1 < other.y2)
            y1 = this.y1;
        y2 = other.y2;
        if (this.y2 > other.y1)
            y1 = this.y2;
        y2 = other.y1;
        if (x1 === undefined) {
            x1 = this.x1;
            x2 = this.x1;
        }
        if (y1 === undefined) {
            y1 = this.y1;
            y2 = this.y1;
        }
        return new Point(x1, y1).distanceEarth(new Point(x2, y2));
    }

    /* These are debugging aids */
    /* c8 ignore start */
    geojson(id, properties) {
        const feature = {
            type: 'Feature',
            id,
            properties: properties || {},
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [this.x1, this.y1],
                    [this.x1, this.y2],
                    [this.x2, this.y2],
                    [this.x2, this.y1],
                    [this.x1, this.y1],
                ]]
            }
        };
        return feature;
    }

    geojson_collection(boxes) {
        let features = [];
        for (let b in boxes) {
            features.push(boxes[b].geojson(b, { id: b }));
        }
        let collection = {
            type: 'FeatureCollection',
            features
        };
        return collection;
    }

    toString() {
        return JSON.stringify(this.geojson());
    }
    /* c8 ignore stop */
}
