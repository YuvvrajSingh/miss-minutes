// Background Service Worker for Miss Minutes Chrome Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Miss Minutes extension installed");

  // Initialize default settings
  chrome.storage.local.set({
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    theme: "light",
    todayFocus: 0,
    todaySessions: 0,
    weekFocus: 0,
    tasks: [],
  });
});

// Listen for alarms (timer completion)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoroTimer") {
    handleTimerComplete();
  }
});

// Handle timer completion
async function handleTimerComplete() {
  try {
    // Get current timer state
    const result = await chrome.storage.local.get([
      "currentMode",
      "focusDuration",
    ]);
    const { currentMode, focusDuration } = result;

    // Update analytics if it was a focus session
    if (currentMode === "focus") {
      await updateFocusAnalytics(focusDuration);
    }

    // Show notification
    await showTimerNotification(currentMode);

    // Clear timer state
    await chrome.storage.local.set({
      isRunning: false,
      timeRemaining: null,
      currentMode: "focus",
    });

    // Send message to popup if open
    try {
      await chrome.runtime.sendMessage({
        type: "TIMER_COMPLETE",
        mode: currentMode,
      });
    } catch (error) {
      // Popup not open, that's fine
    }
  } catch (error) {
    console.error("Error handling timer completion:", error);
  }
}

// Update focus analytics
async function updateFocusAnalytics(focusDuration) {
  try {
    const result = await chrome.storage.local.get([
      "todayFocus",
      "todaySessions",
      "weekFocus",
      "lastFocusDate",
    ]);
    let {
      todayFocus = 0,
      todaySessions = 0,
      weekFocus = 0,
      lastFocusDate,
    } = result;

    const today = new Date().toDateString();

    // Reset daily stats if it's a new day
    if (lastFocusDate !== today) {
      todayFocus = 0;
      todaySessions = 0;
    }

    // Update stats
    todayFocus += focusDuration;
    todaySessions += 1;
    weekFocus += focusDuration;

    await chrome.storage.local.set({
      todayFocus,
      todaySessions,
      weekFocus,
      lastFocusDate: today,
    });
  } catch (error) {
    console.error("Error updating analytics:", error);
  }
}

// Show timer completion notification
async function showTimerNotification(mode) {
  const messages = {
    focus: {
      title: "🍅 Focus Session Complete!",
      message: "Great job! Time for a well-deserved break.",
    },
    shortBreak: {
      title: "☕ Break Time Over",
      message: "Ready to get back to focused work?",
    },
    longBreak: {
      title: "🏆 Long Break Complete",
      message: "Refreshed and ready for the next session!",
    },
  };

  const notification = messages[mode] || messages.focus;

  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "images/logo48.png",
      title: notification.title,
      message: notification.message,
      priority: 1,
    });
  } catch (error) {
    console.error("Error showing notification:", error);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_TIMER") {
    startTimer(message.duration);
    sendResponse({ success: true });
  } else if (message.type === "STOP_TIMER") {
    stopTimer();
    sendResponse({ success: true });
  }
});

// Start timer with chrome.alarms
function startTimer(durationMinutes) {
  chrome.alarms.clear("pomodoroTimer");
  chrome.alarms.create("pomodoroTimer", {
    delayInMinutes: durationMinutes,
  });
}

// Stop timer
function stopTimer() {
  chrome.alarms.clear("pomodoroTimer");
}
