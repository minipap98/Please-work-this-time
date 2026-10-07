const MAX_WIDTH = 900;

function toGrayscale(data: Uint8ClampedArray): Float32Array {
  const g = new Float32Array(data.length / 4);
  for (let i = 0; i < g.length; i++)
    g[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2];
  return g;
}

function blur3x3(gray: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(gray.length);
  const k = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let ky = -1; ky <= 1; ky++)
        for (let kx = -1; kx <= 1; kx++)
          v += gray[Math.min(Math.max(y+ky,0),h-1)*w + Math.min(Math.max(x+kx,0),w-1)]
               * k[(ky+1)*3+(kx+1)];
      out[y*w+x] = v / 16;
    }
  }
  return out;
}

function sobel(gray: Float32Array, w: number, h: number): Float32Array {
  const e = new Float32Array(gray.length);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const tl=gray[(y-1)*w+(x-1)], tc=gray[(y-1)*w+x], tr=gray[(y-1)*w+(x+1)];
      const ml=gray[y*w+(x-1)],                          mr=gray[y*w+(x+1)];
      const bl=gray[(y+1)*w+(x-1)], bc=gray[(y+1)*w+x], br=gray[(y+1)*w+(x+1)];
      const gx = -tl+tr - 2*ml+2*mr - bl+br;
      const gy = -tl-2*tc-tr + bl+2*bc+br;
      e[y*w+x] = Math.sqrt(gx*gx + gy*gy);
    }
  }
  return e;
}

/**
 * Removes background, stylises the boat into a dark-hull illustration with
 * white line-art edges and cyan water ripples — similar to an HCB/brochure
 * side-profile graphic.
 */
export function processBoatSketch(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX_WIDTH) { h = Math.round(h * MAX_WIDTH / w); w = MAX_WIDTH; }

      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const { data } = ctx.getImageData(0, 0, w, h);

      // ── Edge detection ─────────────────────────────────────
      let gray = toGrayscale(data);
      // 4 blur passes: suppresses sky/water noise so bg flood-fill isn't blocked
      gray = blur3x3(gray, w, h);
      gray = blur3x3(gray, w, h);
      gray = blur3x3(gray, w, h);
      gray = blur3x3(gray, w, h);
      const edges = sobel(gray, w, h);
      let maxEdge = 0;
      for (let i = 0; i < edges.length; i++) if (edges[i] > maxEdge) maxEdge = edges[i];
      if (maxEdge === 0) { resolve(src); return; }

      // ── Build dilated barrier mask ──────────────────────────
      const barrier = new Uint8Array(w * h);
      const et = maxEdge * 0.13; // higher threshold = fewer sky/noise edges
      for (let i = 0; i < edges.length; i++) if (edges[i] > et) barrier[i] = 1;
      // 5×5 dilation to close gaps in the boat outline
      const dil = new Uint8Array(w * h);
      for (let y = 2; y < h-2; y++) {
        for (let x = 2; x < w-2; x++) {
          outer: for (let ky = -2; ky <= 2; ky++) {
            for (let kx = -2; kx <= 2; kx++) {
              if (barrier[(y+ky)*w+(x+kx)]) { dil[y*w+x] = 1; break outer; }
            }
          }
        }
      }

      // ── BFS flood-fill from borders → background mask ──────
      const isBg  = new Uint8Array(w * h);
      const vis   = new Uint8Array(w * h);
      const queue: number[] = [];
      let head = 0;

      const seed = (i: number) => { if (!dil[i] && !vis[i]) { vis[i]=1; queue.push(i); } };
      for (let x = 0; x < w; x++) { seed(x); seed((h-1)*w+x); }
      for (let y = 1; y < h-1; y++) { seed(y*w); seed(y*w+w-1); }

      while (head < queue.length) {
        const c = queue[head++]; isBg[c] = 1;
        const x = c%w, y = (c/w)|0;
        if (x>0   && !vis[c-1] && !dil[c-1]) { vis[c-1]=1; queue.push(c-1); }
        if (x<w-1 && !vis[c+1] && !dil[c+1]) { vis[c+1]=1; queue.push(c+1); }
        if (y>0   && !vis[c-w] && !dil[c-w]) { vis[c-w]=1; queue.push(c-w); }
        if (y<h-1 && !vis[c+w] && !dil[c+w]) { vis[c+w]=1; queue.push(c+w); }
      }

      // ── Color-similarity cleanup: catch sky islands blocked by edges ─
      // Compute average background (sky/water) colour from flood-fill result
      let bgR = 0, bgG = 0, bgB = 0, bgN = 0;
      for (let i = 0; i < w*h; i++) {
        if (isBg[i]) { bgR += data[i*4]; bgG += data[i*4+1]; bgB += data[i*4+2]; bgN++; }
      }
      if (bgN > 0) {
        bgR /= bgN; bgG /= bgN; bgB /= bgN;
        // Any non-boat pixel whose colour is within tolerance of bg average → also bg
        const tol = 70; // generous: sky/water are clearly different from hull
        for (let i = 0; i < w*h; i++) {
          if (!isBg[i]) {
            const dr = data[i*4]-bgR, dg = data[i*4+1]-bgG, db = data[i*4+2]-bgB;
            if (Math.sqrt(dr*dr + dg*dg + db*db) < tol) isBg[i] = 1;
          }
        }
      }

      // ── Stylise: dark-hull illustration palette ─────────────
      const out = ctx.createImageData(w, h);
      let minBoatY = h, maxBoatY = 0;

      for (let i = 0; i < w * h; i++) {
        if (isBg[i]) { out.data[i*4+3] = 0; continue; }

        const y = (i/w)|0;
        if (y < minBoatY) minBoatY = y;
        if (y > maxBoatY) maxBoatY = y;

        const lum = gray[i]; // already computed grayscale
        // Dark hull palette
        let sr: number, sg: number, sb: number;
        if      (lum < 45)  { sr=10;  sg=10;  sb=14;  }
        else if (lum < 90)  { sr=28;  sg=30;  sb=42;  }
        else if (lum < 135) { sr=65;  sg=72;  sb=92;  }
        else if (lum < 185) { sr=145; sg=155; sb=172; }
        else                { sr=225; sg=232; sb=242; }

        // Boost edge pixels toward white (line-art)
        const ef = Math.min(1, edges[i] / maxEdge);
        if (ef > 0.18) {
          const boost = Math.min(1, (ef - 0.18) / 0.25) * 0.85;
          sr = Math.round(sr + (255-sr)*boost);
          sg = Math.round(sg + (255-sg)*boost);
          sb = Math.round(sb + (255-sb)*boost);
        }

        out.data[i*4]=sr; out.data[i*4+1]=sg; out.data[i*4+2]=sb; out.data[i*4+3]=255;
      }

      ctx.putImageData(out, 0, 0);

      // ── Water ripple lines below hull ───────────────────────
      const waterY   = maxBoatY - Math.round((maxBoatY - minBoatY) * 0.04);
      const lineGap  = Math.max(4, Math.round(h * 0.022));
      const amp      = Math.max(2.5, w / 220);
      const freq     = (Math.PI * 2) / (w / 3.5);

      for (let l = 0; l < 5; l++) {
        const ly     = waterY + l * lineGap;
        const alpha  = 0.75 - l * 0.11;
        const lw     = Math.max(1.2, (4 - l) * w / 900);
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = ly + Math.sin(x * freq + l * 1.1) * amp * (1 - l * 0.12);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(90, 210, 240, ${alpha})`;
        ctx.lineWidth   = lw;
        ctx.stroke();
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}
