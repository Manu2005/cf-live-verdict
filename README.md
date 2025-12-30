# CF Live Verdict & Queue Estimator

A lightweight Chrome extension that displays live Codeforces submission verdicts and contest queue estimation directly on contest pages without refreshing.

Built for competitive programmers who want real-time feedback during contests.

---

## The Problem

During Codeforces contests:

- Submissions remain in "In Queue" for long periods
- There is no visibility into how large the judging queue is
- Users repeatedly refresh pages to check verdicts
- Judging delays during contests feel opaque and unpredictable

This leads to unnecessary stress and wasted time during contests.

---

## The Solution

CF Live Verdict & Queue Estimator provides:

- Live verdict updates for your latest submission
- A floating badge that updates automatically
- An estimated count of submissions ahead of yours in the judging queue
- Efficient polling that avoids excessive API usage

All without interfering with the Codeforces website itself.

---

## Features

### Live Verdict Tracking

- Automatically updates verdicts:
  IN QUEUE -> TESTING -> OK / WA / TLE / RE
- No page refresh required

### Global Contest Queue Estimation

- Estimates how many submissions are ahead of your submission
- Counts only:
  - submissions made before yours
  - submissions still in queue or testing
- Uses smart heuristics to stop early
- Caps the display at 1000+ for clarity

### Optimized and Safe Polling

- Polls every 2 seconds
- Uses background caching (3 seconds) to reduce network load
- Designed to be contest-safe and API-friendly

### Draggable Floating Badge

- Badge can be dragged anywhere on the screen
- Position is remembered across reloads

### Minimize and Maximize

- Clean minimize button
- Minimized state is remembered
- Stays unobtrusive while solving problems

### Visual Feedback

- Subtle animation when verdict changes to OK
- Clicking the badge opens the submission directly

### Contest-Only Activation

- Runs only on contest pages:
  - /contest/X
  - /contest/X/problem/Y
  - /contest/X/submit
  - /contest/X/my
- Never runs on homepage, problemset, or other pages

---

## How Queue Estimation Works

1. Fetches contest submissions using the Codeforces API
2. Scans submissions submitted before yours
3. Counts only submissions that are still unjudged
4. Stops early after detecting many consecutively judged submissions
5. Displays an estimated queue size

This provides a useful approximation, not an exact official number.

---

## Installation (For Testing)

1. Clone the repository:

   git clone https://github.com/YOUR_USERNAME/cf-live-verdict.git

2. Open Chrome Extensions page:

   chrome://extensions

3. Enable Developer Mode (top right)

4. Click "Load unpacked" and select the cloned folder

5. Open any Codeforces contest page and submit a solution

---

## Current Configuration

- Polling interval: 2 seconds
- Background cache duration: 3 seconds
- Queue cap: 1000+
- Heuristic break threshold: 20 stable judged submissions

These values are tuned for performance and safety.

---

## Notes and Disclaimer

- This project is not affiliated with Codeforces
- Queue estimation is heuristic-based, not official
- Intended for personal use and testing
- Please be respectful of Codeforces API usage

---

## Contributing

This project is currently in active testing.

Feedback, bug reports, and improvements are welcome via GitHub Issues and Pull Requests.

---

## Planned Improvements

- User settings panel
- Adaptive polling
- Notifications on Accepted
- Chrome Web Store release

---

## License

MIT License (to be added)
