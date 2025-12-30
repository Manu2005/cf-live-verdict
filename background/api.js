const CACHE = {};
const RATE_LIMIT_MS = 3000;

// -------- User submissions --------
async function fetchUserSubs(handle) {
  const key = `user:${handle}`;
  const now = Date.now();

  if (CACHE[key] && now - CACHE[key].time < RATE_LIMIT_MS) {
    return CACHE[key].data;
  }

  const res = await fetch(
    `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=30`
  );
  const json = await res.json();

  CACHE[key] = {
    time: now,
    data: json.result
  };

  return json.result;
}

// -------- Contest submissions (GLOBAL) --------
async function fetchContestSubs(contestId) {
  const key = `contest:${contestId}`;
  const now = Date.now();

  if (CACHE[key] && now - CACHE[key].time < RATE_LIMIT_MS) {
    return CACHE[key].data;
  }

  const res = await fetch(
    `https://codeforces.com/api/contest.status?contestId=${contestId}&from=1&count=400`
  );
  const json = await res.json();

  CACHE[key] = {
    time: now,
    data: json.result
  };

  return json.result;
}

// -------- Message handler --------
chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.type === "FETCH_SUBS") {
    fetchUserSubs(msg.handle)
      .then(sendResponse)
      .catch(() => sendResponse(null));
    return true;
  }

  if (msg.type === "FETCH_CONTEST_SUBS") {
    fetchContestSubs(msg.contestId)
      .then(sendResponse)
      .catch(() => sendResponse(null));
    return true;
  }
});
