const btn = document.getElementById("toggleBtn");

function updateUI(enabled) {
  btn.textContent = enabled ? "Stop Extension" : "Start Extension";
  btn.className = enabled ? "" : "off";
}

chrome.storage.local.get(["cfEnabled"], (res) => {
  const enabled = res.cfEnabled !== false; // default ON
  updateUI(enabled);
});

btn.addEventListener("click", () => {
  chrome.storage.local.get(["cfEnabled"], (res) => {
    const enabled = res.cfEnabled !== false;
    const newState = !enabled;

    chrome.storage.local.set({ cfEnabled: newState }, () => {
      updateUI(newState);
    });
  });
});
