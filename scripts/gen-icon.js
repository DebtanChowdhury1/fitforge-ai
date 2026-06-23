const { Jimp } = require('jimp');
const path = require('path');

const S = 1024;
const OUT = path.join(__dirname, '../assets/icon.png');

function rgbaToInt(r, g, b, a) {
  return ((r & 0xff) * 16777216) + ((g & 0xff) * 65536) + ((b & 0xff) * 256) + (a & 0xff);
}

function intToRgba(int) {
  return {
    r: (int >> 24) & 0xff,
    g: (int >> 16) & 0xff,
    b: (int >> 8) & 0xff,
    a: int & 0xff,
  };
}

async function main() {
  const img = new Jimp({ width: S, height: S, color: rgbaToInt(6, 6, 13, 255) });

  const getColor = (x, y) => img.getPixelColor(x, y);
  const setColor = (x, y, r, g, b, a = 255) => {
    if (x < 0 || x >= S || y < 0 || y >= S) return;
    img.setPixelColor(rgbaToInt(r, g, b, a), x, y);
  };

  const blendPx = (x, y, R, G, B, A) => {
    if (x < 0 || x >= S || y < 0 || y >= S || A <= 0) return;
    const e = intToRgba(getColor(x, y));
    const a = A / 255;
    setColor(x, y,
      Math.round(R * a + e.r * (1 - a)),
      Math.round(G * a + e.g * (1 - a)),
      Math.round(B * a + e.b * (1 - a)),
      255
    );
  };

  const cx = S / 2, cy = S / 2;

  // 1. Radial gradient background
  console.log('1/5 Background...');
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (S * 0.55);
      const bg = Math.max(0, 1 - d * 1.1);
      setColor(x, y,
        Math.min(255, Math.round(6 + bg * 22)),
        Math.min(255, Math.round(6 + bg * 5)),
        Math.min(255, Math.round(13 + bg * 12)),
        255
      );
    }
  }

  // 2. Orange center glow
  console.log('2/5 Glow...');
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const glow = Math.max(0, 1 - d / 350);
      const alpha = Math.round(glow * glow * 55);
      if (alpha > 0) blendPx(x, y, 255, 107, 53, alpha);
    }
  }

  // Bolt polygon vertices (centered at 512,512)
  const boltPts = [
    [555, 155],
    [435, 490],
    [555, 490],
    [469, 869],
    [589, 549],
    [469, 549],
  ];

  const edgeIntersections = (y, pts) => {
    const xs = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % n];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
      }
    }
    return xs.sort((a, b) => a - b);
  };

  const minY = Math.min(...boltPts.map(p => p[1]));
  const maxY = Math.max(...boltPts.map(p => p[1]));

  // 3. Glow bloom passes (draw BEFORE bolt so bolt is on top)
  console.log('3/5 Bloom...');
  const glowR = [10, 24, 48, 90];
  const glowA = [150, 80, 40, 18];
  for (let pass = 0; pass < glowR.length; pass++) {
    const gr = glowR[pass];
    const ga = glowA[pass];
    for (let y = minY - gr; y <= maxY + gr; y++) {
      const xs = edgeIntersections(y, boltPts);
      if (xs.length < 2) {
        // No intersection — check horizontal distance to boltPts
        for (let x = cx - 250 - gr; x <= cx + 250 + gr; x++) {
          // Approximate distance: pick nearest boltPt
          let nd = gr + 1;
          boltPts.forEach(([bx, by]) => {
            nd = Math.min(nd, Math.sqrt((x - bx) ** 2 + (y - by) ** 2));
          });
          if (nd < gr) blendPx(x, y, 255, 107, 53, Math.round(ga * (1 - nd / gr)));
        }
        continue;
      }
      for (let i = 0; i < xs.length - 1; i += 2) {
        const xl = xs[i] - gr, xr = xs[i + 1] + gr;
        for (let x = Math.round(xl); x <= Math.round(xr); x++) {
          const inside = x >= xs[i] && x <= xs[i + 1];
          if (!inside) {
            const nd = Math.min(Math.abs(x - xs[i]), Math.abs(x - xs[i + 1]));
            if (nd < gr) blendPx(x, y, 255, 107, 53, Math.round(ga * (1 - nd / gr)));
          }
        }
      }
    }
  }

  // 4. Fill bolt
  console.log('4/5 Bolt...');
  for (let y = minY; y <= maxY; y++) {
    const xs = edgeIntersections(y, boltPts);
    for (let i = 0; i < xs.length - 1; i += 2) {
      const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
      for (let x = x0; x <= x1; x++) {
        const t = (y - minY) / (maxY - minY);
        blendPx(x, y, 255, Math.round(155 - t * 100), 0, 255);
      }
    }
  }

  // Highlight (bright white upper bolt)
  for (let y = minY; y <= minY + (maxY - minY) * 0.42; y++) {
    const xs = edgeIntersections(y, boltPts);
    for (let i = 0; i < xs.length - 1; i += 2) {
      const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
      const t = (y - minY) / ((maxY - minY) * 0.42);
      const alpha = Math.round(200 * (1 - t));
      for (let x = x0; x <= x1; x++) blendPx(x, y, 255, 235, 190, alpha);
    }
  }

  // Center spark
  for (let dy = -30; dy <= 30; dy++) {
    for (let dx = -30; dx <= 30; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 30) {
        const a = Math.round(220 * Math.max(0, 1 - d / 18) + 90 * Math.max(0, 1 - d / 30));
        blendPx(cx + dx, 490 + dy, 255, 240, 200, Math.min(255, a));
      }
    }
  }

  // Energy spark lines from bolt
  const sparks = [
    [580, 280, 640, 235, 8],
    [595, 390, 658, 388, 6],
    [440, 390, 378, 388, 6],
    [455, 280, 392, 235, 7],
  ];
  sparks.forEach(([x1, y1, x2, y2, w]) => {
    const steps = Math.round(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = Math.round(x1 + (x2 - x1) * t);
      const y = Math.round(y1 + (y2 - y1) * t);
      const a = Math.round(200 * (1 - t * 0.5));
      for (let r = 0; r < w; r++) {
        blendPx(x + r - Math.floor(w / 2), y, 255, 180, 60, Math.round(a * (1 - r / w)));
      }
    }
    // Endpoint dot
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        if (dx * dx + dy * dy <= 25) blendPx(x2 + dx, y2 + dy, 255, 210, 100, 200);
      }
    }
  });

  // Save
  console.log('5/5 Saving...');
  await img.write(OUT);
  console.log('Done —', OUT);
}

main().catch(console.error);
