/* =========================================================================
   TrioSphere — Constellation view
   -------------------------------------------------------------------------
   A star chart of the whole catalog. Every source is a star; stars that
   describe the same kind of thing are drawn near each other and joined by
   faint lines, so the shape of the collection is visible at a glance.

   Design lineage (both are sibling CSU projects):
     · the Task Constellation viewer — canvas star atlas, force layout,
       zoom-driven labels, colour read from CSS tokens, never hardcoded.
     · the USAMM / pocket-usamm livestock-network sheet — letterspaced serif
       captions, a restrained ground, and edges whose weight *is* the data
       (its "Connection strength: High → Low" legend is reused here).

   No dependencies, no build step, no CDN: plain canvas, in keeping with the
   rest of the site. Public surface:

       const sky = TrioSphereConstellation.create({ canvas, stage, ... });
       sky.setData(DATASETS);      // once, after the workbook is parsed
       sky.setMatches(idSet);      // on every search / filter change
       sky.activate() / deactivate();

   ========================================================================= */
(function (global) {
  "use strict";

  /* ═══ 1 · CONSTANTS ═══════════════════════════════════════════════════ */

  /* The three lobes, positioned and coloured after the One Health Institute
     rings (images/OHI-Rings.webp): Human upper-left in gold, Animal
     upper-right in teal, Environment below in green. Ring colours are
     lightened just enough to hold their own against a dark sky. */
  const LOBES = [
    { key: "People",     color: "#F2D437", anchor: [-0.30, -0.16] },
    { key: "Animals",    color: "#3FB6BE", anchor: [ 0.30, -0.16] },
    { key: "Ecosystems", color: "#4FB765", anchor: [ 0.00,  0.26] },
  ];
  const LOBE = Object.fromEntries(LOBES.map((l) => [l.key, l]));
  const TRIO_COLOR = "#EFE7CB";   // all three categories: a pale core star

  /* Region combos read narrowest to broadest ("United States; Global"), the
     order datasets.xlsx uses. Grouping stays order-insensitive so an entry
     typed the other way round still lands in the same cluster. */
  const REGION_BREADTH = { Colorado: 0, "United States": 1, Europe: 1, Global: 2 };

  const CFG = {
    restLen: 108, springK: 0.020,
    repulseK: 1900, repulseMax: 260,
    clusterK: 0.026, centerK: 0.005,
    damping: 0.86, alphaDecay: 0.030, alphaMin: 0.004,
    radius: { min: 5, max: 10.5 },   // by number of visible tags
    labelZoom: 1.05, labelBudget: 26,
    dimAlpha: 0.10,                  // non-matching stars stay as faint ghosts
    neighbors: 3,                    // top-k tag similarity considered per node
  };

  const REDUCED = global.matchMedia
    ? global.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function esc(str) {
    const d = document.createElement("span");
    d.textContent = String(str == null ? "" : str);
    return d.innerHTML;
  }

  /* Mix two #rrggbb colours in sRGB. Good enough for two-category blends,
     which only ever need to read as "between these two lobes". */
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round((pa >> 16) * (1 - t) + (pb >> 16) * t);
    const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }

  const rgba = (hex, a) => {
    const p = parseInt(hex.slice(1), 16);
    return `rgba(${p >> 16},${(p >> 8) & 255},${p & 255},${a})`;
  };

  /* ═══ 2 · FACTORY ═════════════════════════════════════════════════════ */

  function create(opts) {
    const canvas = opts.canvas;
    const stage = opts.stage;
    const ctx = canvas.getContext("2d");
    const previewSrc = opts.previewSrc || (() => "");
    const onOpen = opts.onOpen || function () {};
    const cardEl = opts.card || null;
    const captionEl = opts.caption || null;
    const listEl = opts.list || null;          // visually-hidden a11y list
    const legendEl = opts.legend || null;

    const S = {
      nodes: [], byId: new Map(), edges: [],
      clusters: new Map(), mode: "categories",
      cam: { wx: 0, wy: 0, z: 1 },
      W: 0, H: 0, DPR: 1,
      alpha: 0, running: false, raf: 0,
      hover: null, focus: null, drag: null, panning: null,
      matches: null,                          // Set of ids, or null = all
      stars: [],                              // background starfield
      needFit: false,
    };

    /* ── 2a · model ──────────────────────────────────────────────────── */

    function jaccard(a, b) {
      if (!a.size || !b.size) return 0;
      let hit = 0;
      a.forEach((t) => { if (b.has(t)) hit++; });
      return hit / (a.size + b.size - hit);
    }

    /* Which lobe-region a source belongs to: one of the seven areas of the
       three-ring Venn. Its anchor is the mean of its categories' anchors,
       so an all-three source lands in the middle of the sphere. */
    function regionOf(ds) {
      const cats = (ds.categories || []).filter((c) => LOBE[c]);
      return cats.length ? cats.slice().sort().join(" + ") : "Uncategorized";
    }

    function anchorOf(cats) {
      const known = cats.filter((c) => LOBE[c]);
      if (!known.length) return [0, 0.44];
      let x = 0, y = 0;
      known.forEach((c) => { x += LOBE[c].anchor[0]; y += LOBE[c].anchor[1]; });
      return [x / known.length, y / known.length];
    }

    function colorOf(cats) {
      const known = cats.filter((c) => LOBE[c]);
      if (known.length === 0) return "#9FB0A6";
      if (known.length === 1) return LOBE[known[0]].color;
      if (known.length === 2) return mix(LOBE[known[0]].color, LOBE[known[1]].color, 0.5);
      return TRIO_COLOR;
    }

    function isRecent(ds) {
      if (!ds.dateAdded) return false;
      const days = (Date.now() - new Date(ds.dateAdded).getTime()) / 864e5;
      return days >= 0 && days <= 30;
    }

    function setData(datasets) {
      S.nodes = datasets.map((ds) => {
        const cats = (ds.categories || []).filter((c) => LOBE[c]);
        const tags = ds.tags || [];
        const r = CFG.radius.min +
          (CFG.radius.max - CFG.radius.min) * clamp((tags.length - 2) / 5, 0, 1);
        return {
          ds, id: ds.id,
          cats, tagSet: new Set(tags),
          region: regionOf(ds),
          color: colorOf(cats),
          r,
          sparkle: String(ds.source || "").toLowerCase().indexOf("database") === -1,
          recent: isRecent(ds),
          x: 0, y: 0, vx: 0, vy: 0, sx: null, sy: null,
          av: 1, seeded: false, twinkle: Math.random() * 7,
        };
      });
      S.byId = new Map(S.nodes.map((n) => [n.id, n]));

      /* Edges: tag similarity, kept deliberately sparse. Every star keeps a
         line to its single nearest kin (so nothing floats unattached), and
         reciprocated top-3 pairs get one too. At 69 sources that lands near
         1.5 lines per star — a star chart, not a hairball. */
      const seen = new Set();
      S.edges = [];
      const ranked = new Map();
      S.nodes.forEach((n) => {
        const sims = S.nodes
          .filter((m) => m !== n)
          .map((m) => ({ m, s: jaccard(n.tagSet, m.tagSet) }))
          .sort((a, b) => b.s - a.s)
          .slice(0, CFG.neighbors);
        ranked.set(n, sims);
      });
      S.nodes.forEach((n) => {
        ranked.get(n).forEach((cand, i) => {
          if (cand.s <= 0) return;
          const mutual = ranked.get(cand.m).some((x) => x.m === n);
          if (i !== 0 && !mutual) return;
          const key = [n.id, cand.m.id].sort().join("~");
          if (seen.has(key)) return;
          seen.add(key);
          S.edges.push({ a: n, b: cand.m, s: cand.s });
        });
      });

      buildList();
      layout(true);
      updateLegend();
      S.needFit = true;
      reheat(1);
    }

    /* Every encoding on screen is named here, drove-style: a reader should
       never have to guess what a size or a line means, and the chip says
       plainly which marks are computed rather than curated. The honesty
       lines stay outside the collapsible tail. */
    function updateLegend() {
      if (!legendEl) return;
      const shown = S.matches ? S.nodes.filter(matched).length : S.nodes.length;
      const grouping = {
        categories: "the three One Health lobes — a source sits at the average of its categories, so all-three sources fall in the middle. Lobe counts overlap: a source in two lobes is counted by both",
        tags: "its rarest tag, the most telling one it carries",
        region: "geographic coverage",
        free: "nothing — pure link structure, no grouping",
      }[S.mode];
      const tail =
        "<br>star size ∝ number of visible tags · a 4-point star is a " +
        "<b>dataset</b>, a round one a <b>database</b>" +
        "<br>a segmented collar shows a source's categories · an orange " +
        "pip means added in the last 30 days" +
        "<br>grouped by " + esc(grouping) +
        "<br>position inside a group is settled by the layout and carries no meaning";
      legendEl.innerHTML =
        "<b>" + shown + " of " + S.nodes.length + " sources lit</b>" +
        (S.matches && shown < S.nodes.length
          ? ' · <span class="sky-lg-note">filtered out, kept as ghosts</span>' : "") +
        "<br>lines join sources with tags in common — computed from the " +
        "catalog's tags, not a curated relationship" +
        '<span class="sky-lgx">' + tail + "</span> " +
        '<span class="sky-lgmore" role="button" tabindex="0" aria-expanded="' +
        (legendEl.classList.contains("x") ? "true" : "false") +
        '" aria-label="Toggle the full encoding key"></span>';
    }

    if (legendEl) {
      const toggle = (e) => {
        const more = e.target.closest(".sky-lgmore");
        if (!more) return;
        if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        legendEl.classList.toggle("x");
        more.setAttribute("aria-expanded",
          legendEl.classList.contains("x") ? "true" : "false");
      };
      legendEl.addEventListener("click", toggle);
      legendEl.addEventListener("keydown", toggle);
    }

    /* ── 2b · grouping ───────────────────────────────────────────────── */

    function groupKey(n) {
      if (S.mode === "tags") return n.rareTag || "—";
      if (S.mode === "region") {
        const r = (n.ds.region || []).slice().sort(
          (a, b) => (REGION_BREADTH[a] || 1) - (REGION_BREADTH[b] || 1) ||
                    a.localeCompare(b));
        return r.length ? r.join(" + ") : "Unspecified";
      }
      if (S.mode === "free") return "";
      return n.region;
    }

    /* A source carries up to nine tags; the rarest one is the most telling,
       so that is the cluster it joins when grouping by tag. */
    function assignRareTags() {
      const freq = new Map();
      S.nodes.forEach((n) => n.tagSet.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1)));
      S.nodes.forEach((n) => {
        let best = null, bestN = Infinity;
        n.tagSet.forEach((t) => {
          const f = freq.get(t);
          if (f < bestN || (f === bestN && best && t < best)) { best = t; bestN = f; }
        });
        n.rareTag = best;
      });
    }

    function layout(reseed) {
      assignRareTags();
      S.clusters.clear();
      if (S.mode === "free") { if (reseed) seed(); return; }

      if (S.mode === "categories") {
        const counts = new Map();
        S.nodes.forEach((n) => counts.set(n.region, (counts.get(n.region) || 0) + 1));
        counts.forEach((count, key) => {
          const cats = key === "Uncategorized" ? [] : key.split(" + ");
          const [ax, ay] = anchorOf(cats);
          S.clusters.set(key, { x: ax * S.W, y: ay * S.H, n: count, cats });
        });
      } else {
        const counts = new Map();
        S.nodes.forEach((n) => {
          const k = groupKey(n);
          counts.set(k, (counts.get(k) || 0) + 1);
        });
        const keys = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
        const spread = 1 + Math.min(keys.length, 30) / 9;   // 26 tags need a wider ring than 6 regions
        const rx = S.W * 0.30 * spread, ry = S.H * 0.27 * spread;
        keys.forEach((k, i) => {
          const a = -Math.PI / 2 + (i / keys.length) * Math.PI * 2;
          S.clusters.set(k, {
            x: keys.length === 1 ? 0 : Math.cos(a) * rx,
            y: keys.length === 1 ? 0 : Math.sin(a) * ry,
            n: counts.get(k), cats: null, off: (i % 2) * 52,
          });
        });
      }
      if (reseed) seed();
    }

    function seed() {
      S.nodes.forEach((n) => {
        const c = S.clusters.get(groupKey(n));
        const jitter = () => (Math.random() - 0.5) * 90;
        if (c) { n.x = c.x + jitter(); n.y = c.y + jitter(); }
        else { n.x = jitter() * 4; n.y = jitter() * 4; }
        n.vx = n.vy = 0;
      });
    }

    function setMode(mode) {
      if (S.mode === mode) return;
      S.mode = mode;
      layout(false);
      updateLegend();
      S.needFit = true;
      reheat(1);
    }

    function matched(n) { return !S.matches || S.matches.has(n.id); }

    function setMatches(ids) {
      S.matches = ids instanceof Set ? ids : null;
      if (S.focus && !matched(S.focus)) setFocus(null);
      buildList();
      updateLegend();
      reheat(0.35);
    }

    /* ── 2c · physics ────────────────────────────────────────────────── */

    function reheat(a) { S.alpha = Math.max(S.alpha, a); }

    function tick() {
      if (S.alpha < CFG.alphaMin) return;
      const a = S.alpha, ns = S.nodes;

      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const A = ns[i], B = ns[j];
          let dx = B.x - A.x, dy = B.y - A.y, d2 = dx * dx + dy * dy;
          if (d2 > CFG.repulseMax * CFG.repulseMax) continue;
          if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
          const f = (CFG.repulseK / d2) * a, d = Math.sqrt(d2);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          A.vx -= fx; A.vy -= fy; B.vx += fx; B.vy += fy;
        }
      }

      S.edges.forEach((e) => {              // springs, stiffer for closer kin
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.hypot(dx, dy) || 1;
        const grouped = (S.mode === "tags" || S.mode === "region") ? 0.34 : 1;
        const f = (d - CFG.restLen) * CFG.springK * (0.5 + e.s) * grouped * a;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        e.a.vx += fx; e.a.vy += fy; e.b.vx -= fx; e.b.vy -= fy;
      });

      ns.forEach((n) => {
        const c = S.clusters.get(groupKey(n));
        if (c && S.mode !== "free") {
          // small groups on a big ring need a firmer hand than the three lobes
          const ck = CFG.clusterK * (S.mode === "categories" ? 1 : 2.4);
          n.vx += (c.x - n.x) * ck * a;
          n.vy += (c.y - n.y) * ck * a;
        } else {
          n.vx += -n.x * CFG.centerK * a;
          n.vy += -n.y * CFG.centerK * a;
        }
        n.vx *= CFG.damping; n.vy *= CFG.damping;
        if (n !== S.drag) { n.x += n.vx; n.y += n.vy; }
      });

      S.alpha = Math.max(0, S.alpha - CFG.alphaDecay * S.alpha - 0.0005);
    }

    /* ── 2d · render ─────────────────────────────────────────────────── */

    function resize() {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      S.DPR = global.devicePixelRatio || 1;
      S.W = rect.width; S.H = rect.height;
      canvas.width = Math.round(rect.width * S.DPR);
      canvas.height = Math.round(rect.height * S.DPR);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      S.stars = Array.from({ length: 140 }, () => ({
        x: Math.random() * S.W, y: Math.random() * S.H,
        r: 0.35 + Math.random() * 1.0,
        ph: Math.random() * 7, sp: 0.3 + Math.random() * 1.1,
      }));
      // the first resize is also the first time the stage has real dimensions,
      // so that is when positions get seeded rather than at setData time
      layout(!S.laidOut);
      S.laidOut = true;
      reheat(0.5);
      S.needFit = true;
    }

    const w2s = (x, y) => [
      (x - S.cam.wx) * S.cam.z + S.W / 2,
      (y - S.cam.wy) * S.cam.z + S.H / 2,
    ];
    const s2w = (x, y) => [
      (x - S.W / 2) / S.cam.z + S.cam.wx,
      (y - S.H / 2) / S.cam.z + S.cam.wy,
    ];

    function star4(x, y, ro, ri, rot) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? ri : ro;
        const a = (rot || 0) + (i / 8) * Math.PI * 2 - Math.PI / 2;
        ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
    }

    function draw(now) {
      const t = now / 1000;
      ctx.setTransform(S.DPR, 0, 0, S.DPR, 0, 0);

      /* sky: a deep CSU-green night rather than black, so the panel still
         belongs to the site it sits in */
      const bg = ctx.createLinearGradient(0, 0, 0, S.H);
      bg.addColorStop(0, "#0C2A1B");
      bg.addColorStop(1, "#04150D");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, S.W, S.H);

      ctx.save();                                   // star-atlas graticule
      ctx.strokeStyle = "#2E5C43"; ctx.globalAlpha = 0.30; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(S.W * 0.5, S.H * 3.1, S.H * (2.35 + i * 0.22),
          Math.PI * 1.28, Math.PI * 1.72);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();                                   // background starfield
      ctx.fillStyle = "#DCEFE2";
      S.stars.forEach((s) => {
        ctx.globalAlpha = REDUCED ? 0.16
          : 0.10 + 0.24 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      });
      ctx.restore();

      ctx.save();
      ctx.translate(S.W / 2, S.H / 2);
      ctx.scale(S.cam.z, S.cam.z);
      ctx.translate(-S.cam.wx, -S.cam.wy);

      /* edges — weight and warmth carry similarity, the way the USAMM
         network sheet reads its "connection strength" ramp */
      S.edges.forEach((e) => {
        const live = matched(e.a) && matched(e.b);
        const near = S.hover && (e.a === S.hover || e.b === S.hover);
        const alpha = (live ? 0.30 + e.s * 0.42 : 0.05) * (near ? 1.6 : 1);
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.strokeStyle = near ? "#F0E4A8"
          : mix("#2F6B4E", "#C8C372", clamp((e.s - 0.3) / 0.7, 0, 1));
        ctx.lineWidth = (near ? 1.9 : 0.7 + e.s * 1.5) / Math.max(1, S.cam.z * 0.6);
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.b.x, e.b.y);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
      S.nodes.forEach((n) => {
        const live = matched(n);
        const isHov = S.hover === n, isFoc = S.focus === n;
        const target = live ? 1 : CFG.dimAlpha;
        n.av += (target - n.av) * (REDUCED ? 1 : 0.14);
        const tw = REDUCED || !live ? 0 : Math.sin(t * 1.6 + n.twinkle) * 0.07;
        const r = n.r * (isHov || isFoc ? 1.25 : 1) * (1 + tw);
        const a = n.av;

        if (isHov || isFoc) {                       // selection glow
          ctx.save();
          ctx.shadowColor = rgba("#C8C372", 0.9);
          ctx.shadowBlur = 26;
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = n.color;
        if (n.sparkle) { star4(n.x, n.y, r * 1.55, r * 0.55, 0); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.fill(); }
        if (isHov || isFoc) ctx.restore();

        /* multi-category stars wear their lobes as a segmented collar,
           so a two- or three-category source is legible without the popup */
        if (n.cats.length > 1) {
          ctx.globalAlpha = a * 0.95;
          ctx.lineWidth = 2;
          const step = (Math.PI * 2) / n.cats.length;
          n.cats.forEach((c, i) => {
            ctx.strokeStyle = LOBE[c].color;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r + 3.4, -Math.PI / 2 + i * step + 0.10,
              -Math.PI / 2 + (i + 1) * step - 0.10);
            ctx.stroke();
          });
        } else {
          ctx.globalAlpha = a * 0.55;
          ctx.strokeStyle = "#0A2116"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.stroke();
        }

        if (n.recent && live) {   // added in the last 30 days — a pip, not a
          ctx.globalAlpha = a;    // ring: a fresh batch would otherwise put a
          ctx.fillStyle = "#D9782D";                    // halo on a third of
          ctx.beginPath();                              // the sky at once
          ctx.arc(n.x + r * 0.80, n.y - r * 0.80, 2.4, 0, 7);
          ctx.fill();
        }
        if (isFoc) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(n.x, n.y, r + 11, 0, 7); ctx.stroke();
        }

        const p = w2s(n.x, n.y);
        n.sx = p[0]; n.sy = p[1];
      });
      ctx.restore();

      /* ── screen space: cluster captions, then labels ── */
      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      /* Captions are laid out biggest-group-first and a caption that would
         collide with one already placed is simply not drawn — zooming in
         makes room and brings it back. Nothing ever overlaps. */
      const placed = [];
      const fits = (cx, cy, w) => {
        const box = { x0: cx - w / 2 - 6, x1: cx + w / 2 + 6, y0: cy - 11, y1: cy + 5 };
        if (placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 &&
                               box.y0 < b.y1 && box.y1 > b.y0)) return false;
        placed.push(box);
        return true;
      };
      if (S.mode === "categories") {
        /* One caption per lobe, pushed out past the star cloud. The seven
           Venn areas still drive the physics; labelling all seven wrote
           text straight through the stars. Counts overlap by design —
           a source in two lobes is named by both. */
        LOBES.forEach((lobe) => {
          const narrow = isNarrow();
          const label = lobe.key.toUpperCase().split("").join(" ");
          const n = S.nodes.filter((nd) => nd.cats.indexOf(lobe.key) !== -1).length;
          ctx.font = "600 " + capFont().toFixed(1) + 'px "Poppins", Georgia, serif';
          const half = ctx.measureText(label).width / 2;
          const p = narrow ? captionPinned(lobe) : w2s(...captionAt(lobe));
          if (narrow) {   // pinned names hug their edge rather than centring
            ctx.textAlign = lobe.anchor[1] > 0 ? "center"
                          : lobe.anchor[0] < 0 ? "left" : "right";
          }
          if (!fits(p[0], p[1], half * 2 + 26)) { ctx.textAlign = "center"; return; }
          ctx.fillStyle = rgba(lobe.color, 0.62);
          ctx.fillText(label, p[0], p[1]);
          ctx.font = '10px "Poppins", monospace';
          ctx.fillStyle = rgba(lobe.color, 0.42);
          if (narrow && lobe.anchor[0] > 0 && lobe.anchor[1] < 0) {
            ctx.textAlign = "right";
            ctx.fillText(String(n), p[0] - half * 2 - 8, p[1]);
          } else {
            ctx.textAlign = "left";
            ctx.fillText(String(n), p[0] + (narrow && lobe.anchor[1] < 0 ? half * 2 : half) + 8, p[1]);
          }
          ctx.textAlign = "center";
        });
      } else if (S.mode !== "free") {
        S.clusters.forEach((c, key) => {
          const p = w2s(...ringCaptionAt(c));
          const label = key.toUpperCase().split("").join(" ");
          ctx.font = "600 " + (capFont() - 1).toFixed(1) + 'px "Poppins", Georgia, serif';
          const half = ctx.measureText(label).width / 2;
          if (!fits(p[0], p[1], half * 2 + 26)) return;
          ctx.fillStyle = "rgba(220,239,226,0.42)";
          ctx.fillText(label, p[0], p[1]);
          ctx.font = '10px "Poppins", monospace';
          ctx.fillStyle = "rgba(220,239,226,0.34)";
          ctx.textAlign = "left";
          ctx.fillText(String(c.n), p[0] + half + 8, p[1]);
          ctx.textAlign = "center";
        });
      }

      const inFrame = (n) => n.sx > -120 && n.sx < S.W + 120 &&
                             n.sy > -50 && n.sy < S.H + 50;
      const visible = S.nodes.filter((n) => matched(n) && inFrame(n));
      const budget = CFG.labelBudget * Math.max(1, S.cam.z * S.cam.z);
      const showAll = S.cam.z >= CFG.labelZoom && visible.length <= budget;
      const fade = clamp((S.cam.z - CFG.labelZoom) / 0.3, 0, 1);
      const maxChars = S.cam.z >= 1.9 ? 42 : S.cam.z >= 1.4 ? 32 : 24;

      ctx.font = '11.5px "Poppins", system-ui, sans-serif';
      S.nodes.forEach((n) => {
        const focused = S.hover === n || S.focus === n;
        if (!focused && (!showAll || !matched(n) || !inFrame(n))) return;
        const name = n.ds.name.length > maxChars
          ? n.ds.name.slice(0, maxChars - 1) + "…" : n.ds.name;
        ctx.globalAlpha = focused ? 1 : n.av * fade * 0.85;
        ctx.fillStyle = focused ? "#FFFFFF" : "#C6DACD";
        ctx.fillText(name, n.sx, n.sy + (n.r + 16) * Math.sqrt(S.cam.z));
      });
      ctx.globalAlpha = 1;
    }

    /* Where a lobe's caption sits in world space: out past the cloud, on the
       same bearing as the lobe itself. fitView frames these too, so a caption
       is never cropped by the edge of the panel. */
    const isNarrow = () => S.W < 560;
    const capFont = () => clamp(Math.min(S.W, S.H) / 46, 9, 12);

    function captionAt(lobe) {
      return [lobe.anchor[0] * S.W * 1.58, lobe.anchor[1] * S.H * 2.00];
    }

    /* Narrow panels: pin each lobe name to the edge it points at, in screen
       space, so it names a direction without stealing room from the stars. */
    function captionPinned(lobe) {
      const pad = 12;
      const top = 62;              // below the Group by / Reset view row
      const bottom = S.H - 78;     // above the key
      if (lobe.anchor[1] > 0) return [S.W / 2, bottom];
      return [lobe.anchor[0] < 0 ? pad : S.W - pad, top];
    }

    /* Ring-mode captions sit just outside their own cluster, on the same
       bearing from the centre, so they never land on their own stars. */
    function ringCaptionAt(c) {
      const len = Math.hypot(c.x, c.y) || 1;
      const out = 92 + (c.off || 0);
      return [c.x + (c.x / len) * out, c.y + (c.y / len) * out - 26];
    }

    function fitView() {
      const live = S.nodes.filter(matched);
      const set = live.length ? live : S.nodes;
      if (!set.length || !S.W) return;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      set.forEach((n) => {
        x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
        x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y);
      });
      if (S.mode === "categories" && !isNarrow()) {
        LOBES.forEach((lobe) => {
          const [cx, cy] = captionAt(lobe);
          x0 = Math.min(x0, cx); y0 = Math.min(y0, cy);
          x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
        });
      } else if (S.mode !== "free") {
        S.clusters.forEach((c) => {
          const [cx, cy] = ringCaptionAt(c);
          x0 = Math.min(x0, cx); y0 = Math.min(y0, cy);
          x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
        });
      }
      /* Captions keep their size however far the camera pulls back, so their
         room is reserved in screen pixels — and measured, since "ECOSYSTEMS"
         and "LONG TERM WEATHER TRENDS" need very different margins. */
      let mx = 34, my = 34;
      if (!(S.mode === "free" || (S.mode === "categories" && isNarrow()))) {
        const labels = S.mode === "categories"
          ? LOBES.map((l) => l.key)
          : [...S.clusters.keys()];
        ctx.save();
        ctx.font = "600 " + (capFont() - (S.mode === "categories" ? 0 : 1)).toFixed(1) +
          'px "Poppins", Georgia, serif';
        const widest = labels.reduce((w, k) =>
          Math.max(w, ctx.measureText(k.toUpperCase().split("").join(" ")).width), 0);
        ctx.restore();
        // A caption is wide and short: it overhangs its anchor by half its
        // width sideways but only a line-height vertically. Reserving the
        // horizontal figure on all four sides threw away most of the height.
        mx = clamp(widest / 2 + 48, 40, S.W * 0.26);   // +48 covers the count after the label
        my = 30;
      }
      const z = clamp(Math.min((S.W - mx * 2) / Math.max(1, x1 - x0),
                               (S.H - my * 2) / Math.max(1, y1 - y0)), 0.3, 1.4);
      S.cam.wx = (x0 + x1) / 2; S.cam.wy = (y0 + y1) / 2; S.cam.z = z;
    }

    function loop(now) {
      if (!S.running) return;
      tick();
      draw(now);
      if (S.needFit && S.alpha < 0.2) { S.needFit = false; fitView(); }
      S.raf = global.requestAnimationFrame(loop);
    }

    /* ── 2e · interaction ────────────────────────────────────────────── */

    function hitTest(px, py) {
      let best = null, bestD = Infinity;
      S.nodes.forEach((n) => {
        if (n.sx == null || !matched(n)) return;
        const d = Math.hypot(px - n.sx, py - n.sy);
        const reach = Math.max(14, n.r * S.cam.z + 9);
        if (d < reach && d < bestD) { best = n; bestD = d; }
      });
      return best;
    }

    function pointerPos(e) {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }

    function showCard(n, px, py) {
      if (!cardEl) return;
      if (!n) { cardEl.classList.remove("is-on"); cardEl.setAttribute("aria-hidden", "true"); return; }
      const ds = n.ds;
      const tags = (ds.tags || []).slice(0, 4);
      cardEl.innerHTML =
        `<img class="sky-card-shot" src="${esc(previewSrc(ds))}" alt="" ` +
        `width="800" height="500" loading="lazy" decoding="async">` +
        `<div class="sky-card-body">` +
          `<h3>${esc(ds.name)}</h3>` +
          `<p>${esc(ds.description)}</p>` +
          (n.recent ? `<p class="sky-card-new">Added in the last 30 days</p>` : "") +
          `<div class="sky-card-cats">` +
            n.cats.map((c) =>
              `<span class="sky-dot" style="background:${LOBE[c].color}"></span>${esc(c)}`
            ).join("") +
          `</div>` +
          (tags.length ? `<div class="sky-card-tags">${
            tags.map((t) => `<span>${esc(t)}</span>`).join("")
          }</div>` : "") +
          `<p class="sky-card-hint">Click for full details</p>` +
        `</div>`;
      const shot = cardEl.querySelector("img");
      if (shot) shot.addEventListener("error", () => shot.remove());
      cardEl.classList.add("is-on");
      cardEl.setAttribute("aria-hidden", "false");
      const w = cardEl.offsetWidth || 260, h = cardEl.offsetHeight || 220;
      cardEl.style.left = clamp(px + 18, 8, Math.max(8, S.W - w - 8)) + "px";
      cardEl.style.top = clamp(py - h / 2, 8, Math.max(8, S.H - h - 8)) + "px";
    }

    function setHover(n, px, py) {
      if (S.hover === n) {
        if (n && cardEl && cardEl.classList.contains("is-on")) {
          const w = cardEl.offsetWidth, h = cardEl.offsetHeight;
          cardEl.style.left = clamp(px + 18, 8, Math.max(8, S.W - w - 8)) + "px";
          cardEl.style.top = clamp(py - h / 2, 8, Math.max(8, S.H - h - 8)) + "px";
        }
        return;
      }
      S.hover = n;
      canvas.style.cursor = n ? "pointer" : "grab";
      showCard(n, px, py);
    }

    function setFocus(n) {
      S.focus = n;
      if (captionEl) {
        captionEl.textContent = n
          ? `${n.ds.name}. ${n.cats.join(", ") || "Uncategorized"}. ${n.ds.description}`
          : "";
      }
      if (n) {
        S.cam.wx += (n.x - S.cam.wx) * 0.55;
        S.cam.wy += (n.y - S.cam.wy) * 0.55;
        showCard(n, ...w2s(n.x, n.y));
      } else showCard(null);
    }

    canvas.addEventListener("pointermove", (e) => {
      const [px, py] = pointerPos(e);
      if (S.drag) {
        const [wx, wy] = s2w(px, py);
        S.drag.x = wx; S.drag.y = wy; S.drag.vx = S.drag.vy = 0;
        S.drag.moved = true;
        reheat(0.25);
        return;
      }
      if (S.panning) {
        S.cam.wx -= (px - S.panning.px) / S.cam.z;
        S.cam.wy -= (py - S.panning.py) / S.cam.z;
        S.panning.px = px; S.panning.py = py;
        S.panning.moved = true;
        return;
      }
      setHover(hitTest(px, py), px, py);
    });

    canvas.addEventListener("pointerdown", (e) => {
      const [px, py] = pointerPos(e);
      const n = hitTest(px, py);
      canvas.setPointerCapture(e.pointerId);
      if (n) { S.drag = n; n.moved = false; }
      else { S.panning = { px, py, moved: false }; canvas.style.cursor = "grabbing"; }
    });

    canvas.addEventListener("pointerup", (e) => {
      const [px, py] = pointerPos(e);
      const dragged = S.drag, panned = S.panning;
      S.drag = null; S.panning = null;
      canvas.style.cursor = S.hover ? "pointer" : "grab";
      if (dragged && !dragged.moved) { setFocus(dragged); onOpen(dragged.ds); }
      else if (panned && !panned.moved) { setFocus(null); }
      reheat(0.2);
      void px; void py;
    });

    canvas.addEventListener("pointerleave", () => { setHover(null, 0, 0); });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const [px, py] = pointerPos(e);
      const before = s2w(px, py);
      S.cam.z = clamp(S.cam.z * Math.exp(-e.deltaY * 0.0015), 0.35, 4);
      const after = s2w(px, py);
      S.cam.wx += before[0] - after[0];
      S.cam.wy += before[1] - after[1];
    }, { passive: false });

    canvas.addEventListener("keydown", (e) => {
      const live = S.nodes.filter(matched)
        .sort((a, b) => a.ds.name.localeCompare(b.ds.name));
      if (!live.length) return;
      const i = S.focus ? live.indexOf(S.focus) : -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault(); setFocus(live[(i + 1) % live.length]);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault(); setFocus(live[(i - 1 + live.length) % live.length]);
      } else if (e.key === "Enter" || e.key === " ") {
        if (S.focus) { e.preventDefault(); onOpen(S.focus.ds); }
      } else if (e.key === "Escape") {
        setFocus(null);
      } else if (e.key === "+" || e.key === "=") {
        S.cam.z = clamp(S.cam.z * 1.2, 0.35, 4);
      } else if (e.key === "-") {
        S.cam.z = clamp(S.cam.z / 1.2, 0.35, 4);
      } else if (e.key === "0") {
        fitView();
      }
    });

    /* A real, focusable list of every matching source, visually hidden but
       fully available to screen readers and keyboard users — the canvas is
       decoration, this is the content. */
    function buildList() {
      if (!listEl) return;
      const live = S.nodes.filter(matched)
        .sort((a, b) => a.ds.name.localeCompare(b.ds.name));
      listEl.innerHTML =
        `<h2>Constellation view — ${live.length} sources</h2><ul>` +
        live.map((n) =>
          `<li><button type="button" data-sky-id="${esc(n.id)}">${esc(n.ds.name)} — ` +
          `${esc(n.cats.join(", ") || "Uncategorized")}. ${esc(n.ds.description)}</button></li>`
        ).join("") + "</ul>";
    }

    if (listEl) {
      listEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-sky-id]");
        if (!btn) return;
        const n = S.byId.get(btn.dataset.skyId);
        if (n) { setFocus(n); onOpen(n.ds); }
      });
    }

    let resizeT = 0;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => { if (S.running) resize(); }, 120);
    };
    global.addEventListener("resize", onResize);

    /* ── 2f · lifecycle ──────────────────────────────────────────────── */

    function activate() {
      if (S.running) return;
      S.running = true;
      resize();
      reheat(0.9);
      S.raf = global.requestAnimationFrame(loop);
    }

    function deactivate() {
      S.running = false;
      if (S.raf) global.cancelAnimationFrame(S.raf);
      S.raf = 0;
      setHover(null, 0, 0);
    }

    return {
      setData, setMatches, setMode, activate, deactivate, resize,
      fit: () => { fitView(); },
      get mode() { return S.mode; },
    };
  }

  global.TrioSphereConstellation = { create: create, LOBES: LOBES };
})(window);
