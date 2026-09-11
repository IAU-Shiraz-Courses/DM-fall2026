(function () {
  "use strict";

  /* ============================================================
     1. THEME TOGGLE (dark/light, persisted, respects system pref)
  ============================================================ */
  const root = document.documentElement;
  const themeBtn = document.getElementById("theme-toggle");
  const iconSun = document.getElementById("icon-sun");
  const iconMoon = document.getElementById("icon-moon");
  const THEME_KEY = "dm-theme";

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }
  function storeTheme(value) {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch (e) {
      /* storage unavailable — theme just won't persist */
    }
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      root.classList.add("dark");
      iconSun && iconSun.classList.add("hidden");
      iconMoon && iconMoon.classList.remove("hidden");
    } else {
      root.classList.remove("dark");
      iconMoon && iconMoon.classList.add("hidden");
      iconSun && iconSun.classList.remove("hidden");
    }
  }

  const stored = getStoredTheme();
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(stored || (prefersDark ? "dark" : "light"));

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      const isDark = root.classList.contains("dark");
      const next = isDark ? "light" : "dark";
      applyTheme(next);
      storeTheme(next);
      drawGraph(); // redraw canvas with theme-correct colors
    });
  }

  /* ============================================================
     2. MOBILE MENU
  ============================================================ */
  const menuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const burger = document.getElementById("icon-burger");
  const closeIcon = document.getElementById("icon-close");

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", function () {
      const isOpen = !mobileMenu.classList.contains("hidden");
      mobileMenu.classList.toggle("hidden");
      menuBtn.setAttribute("aria-expanded", String(!isOpen));
      burger.classList.toggle("hidden");
      closeIcon.classList.toggle("hidden");
    });

    // close mobile menu after tapping a link
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.add("hidden");
        menuBtn.setAttribute("aria-expanded", "false");
        burger.classList.remove("hidden");
        closeIcon.classList.add("hidden");
      });
    });
  }

  /* ============================================================
     3. SYLLABUS ACCORDION
  ============================================================ */
  const triggers = document.querySelectorAll(".accordion-trigger");
  triggers.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      const panel = trigger.nextElementSibling;
      const isOpen = trigger.getAttribute("aria-expanded") === "true";

      // close all others (single-open accordion keeps the list scannable)
      triggers.forEach(function (t) {
        if (t !== trigger) {
          t.setAttribute("aria-expanded", "false");
          t.nextElementSibling.style.maxHeight = null;
        }
      });

      trigger.setAttribute("aria-expanded", String(!isOpen));
      panel.style.maxHeight = isOpen ? null : panel.scrollHeight + "px";
    });
  });
  // initialize first item's open height correctly on load
  window.addEventListener("load", function () {
    const openTrigger = document.querySelector('.accordion-trigger[aria-expanded="true"]');
    if (openTrigger) {
      openTrigger.nextElementSibling.style.maxHeight =
        openTrigger.nextElementSibling.scrollHeight + "px";
    }
  });

  /* ============================================================
     4. SCHEDULE FILTER
  ============================================================ */
  const filterBtns = document.querySelectorAll(".filter-btn");
  const rows = document.querySelectorAll("#schedule-table tbody tr");
  const emptyState = document.getElementById("empty-state");

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) {
        b.classList.remove("is-active");
      });
      btn.classList.add("is-active");

      const filter = btn.getAttribute("data-filter");
      let visibleCount = 0;

      rows.forEach(function (row) {
        const types = (row.getAttribute("data-type") || "").split(" ");
        const match = filter === "all" || types.indexOf(filter) !== -1;
        row.style.display = match ? "" : "none";
        if (match) visibleCount++;
      });

      if (emptyState) {
        emptyState.classList.toggle("hidden", visibleCount !== 0);
      }
    });
  });

  /* ============================================================
     5. HERO NETWORK GRAPH (canvas)
     A quiet, single orchestrated moment: nodes representing
     course concepts drift and connect when close, evoking the
     "finding connections in data" idea at the heart of the course.
  ============================================================ */
  const canvas = document.getElementById("graph-canvas");
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ctx, nodes, animId, dpr;

  function themeColors() {
    const dark = root.classList.contains("dark");
    return {
      node: dark ? "#E7EAF0" : "#16202C",
      accentA: "#E8A33D",
      accentB: "#43C6B0",
      edge: dark ? "rgba(122,136,159,0.35)" : "rgba(91,102,117,0.25)",
    };
  }

  function initGraph() {
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    resizeCanvas();

    const count = canvas.clientWidth < 420 ? 14 : 22;
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 2 + Math.random() * 2.6,
        accent: i % 5 === 0 ? "accentA" : (i % 7 === 0 ? "accentB" : null),
      });
    }
  }

  function resizeCanvas() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawGraph() {
    if (!canvas || !ctx || !nodes) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const colors = themeColors();
    ctx.clearRect(0, 0, w, h);

    const maxDist = Math.min(w, h) * 0.32;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          ctx.strokeStyle = colors.edge;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 1 - dist / maxDist;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    nodes.forEach(function (n) {
      ctx.beginPath();
      ctx.fillStyle = n.accent ? colors[n.accent] : colors.node;
      ctx.globalAlpha = n.accent ? 0.9 : 0.55;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function stepGraph() {
    if (!nodes) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    nodes.forEach(function (n) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    });
    drawGraph();
    animId = requestAnimationFrame(stepGraph);
  }

  if (canvas) {
    initGraph();
    drawGraph();
    if (!reduceMotion) {
      animId = requestAnimationFrame(stepGraph);
    }
    window.addEventListener("resize", function () {
      resizeCanvas();
      drawGraph();
    });
  }

  /* ============================================================
     6. External link placeholders: gentle no-op guard
     (Prevents "#" placeholder hrefs from jumping to top abruptly
     when the site is previewed before real links are added.)
  ============================================================ */
  document.querySelectorAll('a[href="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
    });
  });
})();
