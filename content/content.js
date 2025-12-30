// =======================
// CF Live Verdict + Global Queue (CONTEST ONLY + POLISHED UI)
// =======================

(() => {
  const POLL_INTERVAL = 2000;
  const MAX_QUEUE = 1000;
  const STABLE_OK_BREAK = 20;
  const DRAG_THRESHOLD = 6;

  let badge = null;
  let badgeText = null;
  let toggleBtn = null;

  let timer = null;
  let stopped = false;

  let lastVerdict = null;
  let currentSubLink = null;

  function alive() {
    return typeof chrome !== "undefined" && chrome.runtime && !stopped;
  }

  function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
  }

  window.addEventListener("pagehide", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });

  function getHandle() {
    const el = document.querySelector("a[href^='/profile/']");
    return el ? el.textContent.trim() : null;
  }

  function getContestId() {
    const m = location.pathname.match(/contest\/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  // ---------- Storage ----------
  function savePos(left, top) {
    localStorage.setItem("cfBadgePos", JSON.stringify({ left, top }));
  }

  function loadPos() {
    try {
      return JSON.parse(localStorage.getItem("cfBadgePos"));
    } catch {
      return null;
    }
  }

  function setMinimized(val) {
    localStorage.setItem("cfBadgeMinimized", val ? "1" : "0");
  }

  function isMinimized() {
    return localStorage.getItem("cfBadgeMinimized") === "1";
  }

  // ---------- Badge ----------
  function ensureBadge() {
    if (badge) return;

    badge = document.createElement("div");
    badge.id = "cf-live-verdict";
    badge.className = "cf-badge";
    badge.style.position = "fixed";
    badge.style.cursor = "grab";
    badge.style.userSelect = "none";
    badge.style.display = "flex";
    badge.style.alignItems = "center";
    badge.style.gap = "10px";
    badge.style.transition = "transform 0.3s ease";

    badgeText = document.createElement("span");

    // ✅ Polished black minimize button
    toggleBtn = document.createElement("div");
    toggleBtn.style.width = "22px";
    toggleBtn.style.height = "22px";
    toggleBtn.style.borderRadius = "50%";
    toggleBtn.style.background = "#111";
    toggleBtn.style.color = "#fff";
    toggleBtn.style.display = "flex";
    toggleBtn.style.alignItems = "center";
    toggleBtn.style.justifyContent = "center";
    toggleBtn.style.fontSize = "18px";
    toggleBtn.style.fontWeight = "600";
    toggleBtn.style.lineHeight = "22px"; // perfect centering
    toggleBtn.style.cursor = "pointer";
    toggleBtn.style.flexShrink = "0";
    toggleBtn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.35)";
    toggleBtn.style.transition = "background 0.2s ease, transform 0.1s ease";

    toggleBtn.addEventListener("mouseenter", () => {
      toggleBtn.style.background = "#000";
    });
    toggleBtn.addEventListener("mouseleave", () => {
      toggleBtn.style.background = "#111";
    });
    toggleBtn.addEventListener("mousedown", () => {
      toggleBtn.style.transform = "scale(0.9)";
    });
    toggleBtn.addEventListener("mouseup", () => {
      toggleBtn.style.transform = "scale(1)";
    });

    badge.appendChild(badgeText);
    badge.appendChild(toggleBtn);
    document.body.appendChild(badge);

    // Restore position
    const saved = loadPos();
    if (saved) {
      badge.style.left = `${saved.left}px`;
      badge.style.top = `${saved.top}px`;
      badge.style.right = "auto";
    } else {
      badge.style.top = "20px";
      badge.style.right = "20px";
    }

    applyMinimizedState();

    // ---- Drag logic ----
    let startX = 0, startY = 0;
    let offsetX = 0, offsetY = 0;
    let dragged = false;
    let dragging = false;

    badge.addEventListener("mousedown", (e) => {
      if (isMinimized()) return;
      if (e.target === toggleBtn) return;

      dragging = true;
      dragged = false;
      startX = e.clientX;
      startY = e.clientY;
      offsetX = e.clientX - badge.getBoundingClientRect().left;
      offsetY = e.clientY - badge.getBoundingClientRect().top;
      badge.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        dragged = true;
      }

      if (dragged) {
        const left = e.clientX - offsetX;
        const top = e.clientY - offsetY;
        badge.style.left = `${left}px`;
        badge.style.top = `${top}px`;
        badge.style.right = "auto";
        savePos(left, top);
      }
    });

    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      badge.style.cursor = "grab";

      if (!dragged && currentSubLink) {
        window.open(currentSubLink, "_blank");
      }
      dragging = false;
    });

    // ---- Minimize / Maximize ----
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = !isMinimized();
      setMinimized(next);
      applyMinimizedState();
    });
  }

  function applyMinimizedState() {
    if (!badge) return;
    if (isMinimized()) {
      badgeText.style.display = "none";
      toggleBtn.textContent = "+";
      badge.style.padding = "6px 8px";
    } else {
      badgeText.style.display = "";
      toggleBtn.textContent = "–";
      badge.style.padding = "";
    }
  }

  function showBadge(text, cls, subLink) {
    if (!alive()) return;
    ensureBadge();
    badgeText.textContent = text;
    badge.className = `cf-badge ${cls}`;
    currentSubLink = subLink;
  }

  // ---------- OK animation ----------
  function playOkAnimation() {
    if (!badge) return;
    badge.style.transform = "scale(1.15)";
    setTimeout(() => {
      if (badge) badge.style.transform = "scale(1)";
    }, 300);
  }

  // ---------- Queue logic (UNCHANGED) ----------
  function estimateQueue(mySub, contestSubs) {
    let count = 0;
    let stable = 0;

    for (const s of contestSubs) {
      if (s.id >= mySub.id) continue;

      if (!s.verdict || s.verdict === "TESTING") {
        count++;
        stable = 0;
        if (count >= MAX_QUEUE) return "1000+";
      } else {
        stable++;
        if (stable >= STABLE_OK_BREAK) break;
      }
    }
    return count;
  }

  const handle = getHandle();
  const contestId = getContestId();

  // 🚫 Contest pages only
  if (!handle || contestId === null) return;

  function poll() {
    if (!alive()) return stop();

    chrome.runtime.sendMessage(
      { type: "FETCH_SUBS", handle },
      (subs) => {
        if (!alive()) return stop();
        if (chrome.runtime.lastError) return;
        if (!Array.isArray(subs) || subs.length === 0) return;

        const mySub = subs[0];

        let text = mySub.verdict || "IN QUEUE";
        if (mySub.problem?.index) {
          text = `[${mySub.problem.index}] ${text}`;
        }

        const cls =
          mySub.verdict === "OK"
            ? "ok"
            : mySub.verdict === "TESTING" || !mySub.verdict
            ? "pending"
            : "fail";

        const subLink =
          `https://codeforces.com/contest/${mySub.contestId}/submission/${mySub.id}`;

        chrome.runtime.sendMessage(
          { type: "FETCH_CONTEST_SUBS", contestId },
          (contestSubs) => {
            if (!alive()) return stop();
            if (chrome.runtime.lastError) return;
            if (!Array.isArray(contestSubs)) return;

            const queue = estimateQueue(mySub, contestSubs);
            showBadge(`${text} · Queue ${queue}`, cls, subLink);

            if (lastVerdict !== "OK" && mySub.verdict === "OK") {
              playOkAnimation();
            }

            lastVerdict = mySub.verdict;
          }
        );
      }
    );
  }

  poll();
  timer = setInterval(poll, POLL_INTERVAL);
})();
