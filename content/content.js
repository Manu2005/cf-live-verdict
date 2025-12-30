

(() => {
  // ----------- HARD STOP IF DISABLED -----------
  let enabledChecked = false;
  let enabled = true;

  chrome.storage.local.get(["cfEnabled"], (res) => {
    enabled = res.cfEnabled !== false; // default ON
    enabledChecked = true;
  });

  const waitForEnabled = setInterval(() => {
    if (!enabledChecked) return;
    clearInterval(waitForEnabled);
    if (!enabled) return;
    init();
  }, 20);

  function init() {
    const POLL_INTERVAL = 2000;
    const MAX_QUEUE = 1000;
    const STABLE_OK_BREAK = 20;
    const DRAG_THRESHOLD = 6;

    const STORAGE_KEY = "cfLastVerdict";

    let badge = null;
    let badgeText = null;
    let toggleBtn = null;

    let timer = null;
    let stopped = false;
    let currentSubLink = null;

    /* -------------------- Lifecycle -------------------- */

    function alive() {
      return typeof chrome !== "undefined" && chrome.runtime && !stopped;
    }

    function stop() {
      stopped = true;
      if (timer) clearInterval(timer);
    }

    function pollNow() {
      if (!stopped) poll();
    }

    window.addEventListener("pagehide", stop);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stop();
      } else {
        pollNow(); // instant refresh on focus
      }
    });

    document.addEventListener(
      "submit",
      () => {
        pollNow(); // instant refresh after submit
      },
      true
    );

    /* -------------------- Utils -------------------- */

    function getHandle() {
      const el = document.querySelector("a[href^='/profile/']");
      return el ? el.textContent.trim() : null;
    }

    function getContestId() {
      const m = location.pathname.match(/contest\/(\d+)/);
      return m ? Number(m[1]) : null;
    }

    /* -------------------- Persisted Verdict -------------------- */

    function saveLastVerdict(data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function loadLastVerdict() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY));
      } catch {
        return null;
      }
    }

    /* -------------------- UI State Storage -------------------- */

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

    /* -------------------- Badge UI -------------------- */

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

      badgeText = document.createElement("span");

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
      toggleBtn.style.lineHeight = "22px";
      toggleBtn.style.cursor = "pointer";
      toggleBtn.textContent = isMinimized() ? "+" : "–";

      badge.appendChild(badgeText);
      badge.appendChild(toggleBtn);
      document.body.appendChild(badge);

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

      // Drag logic
      let startX = 0, startY = 0, offsetX = 0, offsetY = 0;
      let dragged = false, dragging = false;

      badge.addEventListener("mousedown", (e) => {
        if (isMinimized()) return;
        if (e.target === toggleBtn) return;
        dragging = true;
        dragged = false;
        startX = e.clientX;
        startY = e.clientY;
        offsetX = e.clientX - badge.getBoundingClientRect().left;
        offsetY = e.clientY - badge.getBoundingClientRect().top;
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
          dragged = true;
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
        if (!dragged && currentSubLink)
          window.open(currentSubLink, "_blank");
        dragging = false;
      });

      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setMinimized(!isMinimized());
        applyMinimizedState();
      });
    }

    function applyMinimizedState() {
      if (!badge) return;
      if (isMinimized()) {
        badgeText.style.display = "none";
        toggleBtn.textContent = "+";
      } else {
        badgeText.style.display = "";
        toggleBtn.textContent = "–";
      }
    }

    function showBadge(text, cls, subLink) {
      ensureBadge();
      badgeText.textContent = text;
      badge.className = `cf-badge ${cls}`;
      currentSubLink = subLink;
    }

    /* -------------------- Queue Logic  -------------------- */

    function estimateQueue(mySub, contestSubs) {
      let count = 0, stable = 0;
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

    /* -------------------- Main -------------------- */

    const handle = getHandle();
    const contestId = getContestId();
    if (!handle || contestId === null) return;

    // Instant render from last known verdict
    const cached = loadLastVerdict();
    if (cached && cached.contestId === contestId) {
      showBadge(cached.text, cached.cls, cached.subLink);
    }

    function poll() {
      if (!alive()) return stop();

      chrome.runtime.sendMessage({ type: "FETCH_SUBS", handle }, (subs) => {
        if (!subs || !subs.length) return;

        const mySub = subs[0];
        const isPending = !mySub.verdict || mySub.verdict === "TESTING";

        let text = mySub.verdict || "IN QUEUE";
        if (mySub.problem?.index) {
          text = `[${mySub.problem.index}] ${text}`;
        }

        const cls =
          mySub.verdict === "OK"
            ? "ok"
            : isPending
            ? "pending"
            : "fail";

        const subLink =
          `https://codeforces.com/contest/${mySub.contestId}/submission/${mySub.id}`;

        saveLastVerdict({ contestId, text, cls, subLink });

        if (!isPending) {
          showBadge(text, cls, subLink);
          return;
        }

        showBadge(`${text} · Queue …`, cls, subLink);

        chrome.runtime.sendMessage(
          { type: "FETCH_CONTEST_SUBS", contestId },
          (contestSubs) => {
            if (!contestSubs) return;
            const queue = estimateQueue(mySub, contestSubs);
            showBadge(`${text} · Queue ${queue}`, cls, subLink);
          }
        );
      });
    }

    poll();
    timer = setInterval(poll, POLL_INTERVAL);
  }
})();
