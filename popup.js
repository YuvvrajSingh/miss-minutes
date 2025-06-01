// Main Popup Controller for Miss Minutes Chrome Extension

class MissMinutes {
  constructor() {
    this.timer = null;
    this.taskManager = null;
    this.analytics = null;
    this.themeManager = null;
    this.currentView = "timer"; // 'timer', 'tasks', 'analytics', 'settings'
    this.initialized = false; // Don't auto-initialize, let the caller do it
  }
  async init() {
    try {
      if (this.initialized) {
        return;
      }

      // Wait for DOM to be ready
      if (document.readyState === "loading") {
        return new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", async () => {
            await this.initializeApp();
            resolve();
          });
        });
      } else {
        await this.initializeApp();
      }
    } catch (error) {
      console.error("Error in MissMinutes.init():", error);
      throw error;
    }
  }
  async initializeApp() {
    try {
      if (this.initialized) {
        return;
      }

      // Initialize theme first for proper styling
      this.themeManager = new ThemeManager();

      // Initialize core modules
      this.timer = new Timer();
      this.taskManager = new TaskManager();
      this.analytics = new Analytics();

      // Setup navigation and UI
      this.setupNavigation();
      this.setupKeyboardShortcuts();
      this.setupSettingsPanel();

      // Show initial view
      this.showView("timer"); // Setup background communication
      this.setupBackgroundCommunication();

      this.initialized = true;

      // Make instance globally accessible for theme updates
      window.missMinutes = this;
    } catch (error) {
      console.error("Error during app initialization:", error);
      console.error("Error stack:", error.stack);
      this.showErrorMessage(
        "Failed to initialize application: " + error.message
      );
      throw error;
    }
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const view =
          e.target.dataset.view || e.target.closest(".nav-btn").dataset.view;
        if (view) {
          this.showView(view);
        }
      });
    });

    // Settings toggle
    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        this.toggleSettings();
      });
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Only process shortcuts when not typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key) {
        case " ": // Spacebar - Start/Pause timer
          e.preventDefault();
          if (this.timer) {
            this.timer.toggleTimer();
          }
          break;
        case "r": // R - Reset timer
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (this.timer) {
              this.timer.resetTimer();
            }
          }
          break;
        case "1": // 1 - Timer view
          e.preventDefault();
          this.showView("timer");
          break;
        case "2": // 2 - Tasks view
          e.preventDefault();
          this.showView("tasks");
          break;
        case "3": // 3 - Analytics view
          e.preventDefault();
          this.showView("analytics");
          break;
        case "s": // S - Settings
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.toggleSettings();
          }
          break;
        case "t": // T - Toggle theme
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (this.themeManager) {
              this.themeManager.toggleThemeWithNotification();
            }
          }
          break;
      }
    });
  }

  setupSettingsPanel() {
    // Settings save button
    const saveSettingsBtn = document.getElementById("saveSettings");
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener("click", () => {
        this.saveSettings();
      });
    }

    // Settings cancel button
    const cancelSettingsBtn = document.getElementById("cancelSettings");
    if (cancelSettingsBtn) {
      cancelSettingsBtn.addEventListener("click", () => {
        this.hideSettings();
      });
    }

    // Settings close button
    const closeSettingsBtn = document.getElementById("closeSettings");
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener("click", () => {
        this.hideSettings();
      });
    }

    // Click outside to close settings
    const settingsOverlay = document.getElementById("settingsOverlay");
    if (settingsOverlay) {
      settingsOverlay.addEventListener("click", (e) => {
        if (e.target === settingsOverlay) {
          this.hideSettings();
        }
      });
    }
  }

  setupBackgroundCommunication() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case "timerComplete":
          this.handleTimerComplete(message.mode);
          break;
        case "timerTick":
          if (this.timer) {
            this.timer.handleBackgroundTick(message.timeRemaining);
          }
          break;
        case "timerStateUpdate":
          if (this.timer) {
            this.timer.syncWithBackground(message.state);
          }
          break;
      }

      sendResponse({ received: true });
      return true;
    });

    // Request timer state from background on startup
    chrome.runtime.sendMessage({ type: "getTimerState" }, (response) => {
      if (response && response.state && this.timer) {
        this.timer.syncWithBackground(response.state);
      }
    });
  }

  showView(viewName) {
    // Update navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (activeBtn) {
      activeBtn.classList.add("active");
    }

    // Show/hide views
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.remove("active");
    });

    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
      targetView.classList.add("active");
    }

    this.currentView = viewName;

    // Update view-specific content
    this.updateViewContent(viewName);
  }

  updateViewContent(viewName) {
    switch (viewName) {
      case "analytics":
        if (this.analytics) {
          this.analytics.updateDisplay();
        }
        break;
      case "tasks":
        if (this.taskManager) {
          this.taskManager.renderTasks();
        }
        break;
      case "timer":
        if (this.timer) {
          this.timer.updateDisplay();
        }
        break;
    }
  }

  toggleSettings() {
    const settingsOverlay = document.getElementById("settingsOverlay");
    if (settingsOverlay) {
      const isVisible = settingsOverlay.style.display === "flex";
      if (isVisible) {
        this.hideSettings();
      } else {
        this.showSettings();
      }
    }
  }

  showSettings() {
    const settingsOverlay = document.getElementById("settingsOverlay");
    if (settingsOverlay) {
      settingsOverlay.style.display = "flex";
      // Load current settings into form
      this.loadSettingsForm();
    }
  }

  hideSettings() {
    const settingsOverlay = document.getElementById("settingsOverlay");
    if (settingsOverlay) {
      settingsOverlay.style.display = "none";
    }
  }

  async loadSettingsForm() {
    try {
      const result = await chrome.storage.local.get([
        "focusDuration",
        "shortBreakDuration",
        "longBreakDuration",
        "autoStartBreaks",
        "autoStartPomodoros",
        "soundEnabled",
        "notificationsEnabled",
      ]);

      // Update form inputs
      const inputs = {
        focusDuration: result.focusDuration || 25,
        shortBreakDuration: result.shortBreakDuration || 5,
        longBreakDuration: result.longBreakDuration || 15,
        autoStartBreaks: result.autoStartBreaks || false,
        autoStartPomodoros: result.autoStartPomodoros || false,
        soundEnabled: result.soundEnabled !== false, // default true
        notificationsEnabled: result.notificationsEnabled !== false, // default true
      };

      Object.keys(inputs).forEach((key) => {
        const element = document.getElementById(key);
        if (element) {
          if (element.type === "checkbox") {
            element.checked = inputs[key];
          } else {
            element.value = inputs[key];
          }
        }
      });
    } catch (error) {
      console.error("Error loading settings form:", error);
    }
  }

  async saveSettings() {
    try {
      const settings = {
        focusDuration:
          parseInt(document.getElementById("focusDuration").value) || 25,
        shortBreakDuration:
          parseInt(document.getElementById("shortBreakDuration").value) || 5,
        longBreakDuration:
          parseInt(document.getElementById("longBreakDuration").value) || 15,
        autoStartBreaks: document.getElementById("autoStartBreaks").checked,
        autoStartPomodoros:
          document.getElementById("autoStartPomodoros").checked,
        soundEnabled: document.getElementById("soundEnabled").checked,
        notificationsEnabled: document.getElementById("notificationsEnabled")
          .checked,
      };

      await chrome.storage.local.set(settings);

      // Update timer durations
      if (this.timer) {
        this.timer.durations.focus = settings.focusDuration;
        this.timer.durations.shortBreak = settings.shortBreakDuration;
        this.timer.durations.longBreak = settings.longBreakDuration;

        // Reset current timer if it's not running
        if (!this.timer.isRunning) {
          this.timer.resetToCurrentMode();
        }
      }

      this.hideSettings();
      this.showSuccessMessage("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      this.showErrorMessage("Failed to save settings");
    }
  }

  handleTimerComplete(mode) {
    // Update analytics
    if (this.analytics && mode === "focus") {
      this.analytics.addFocusSession(this.timer.totalTime / 60);
    }

    // Show completion notification
    this.showCompletionMessage(mode);

    // Auto-switch modes if enabled
    this.handleAutoModeSwitch(mode);
  }

  async handleAutoModeSwitch(completedMode) {
    try {
      const result = await chrome.storage.local.get([
        "autoStartBreaks",
        "autoStartPomodoros",
      ]);

      if (completedMode === "focus" && result.autoStartBreaks) {
        // Auto-start break
        setTimeout(() => {
          if (this.timer) {
            this.timer.switchToBreak();
            this.timer.startTimer();
          }
        }, 2000);
      } else if (
        (completedMode === "shortBreak" || completedMode === "longBreak") &&
        result.autoStartPomodoros
      ) {
        // Auto-start next pomodoro
        setTimeout(() => {
          if (this.timer) {
            this.timer.switchToFocus();
            this.timer.startTimer();
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Error handling auto mode switch:", error);
    }
  }

  showCompletionMessage(mode) {
    const messages = {
      focus: "🎉 Focus session complete! Time for a break.",
      shortBreak: "✨ Break complete! Ready for another focus session?",
      longBreak: "🌟 Long break complete! You're doing great!",
    };

    this.showSuccessMessage(messages[mode] || "Timer complete!");
  }

  showSuccessMessage(message) {
    this.showMessage(message, "success");
  }

  showErrorMessage(message) {
    this.showMessage(message, "error");
  }

  showMessage(message, type = "info") {
    // Create or update message element
    let messageEl = document.getElementById("appMessage");
    if (!messageEl) {
      messageEl = document.createElement("div");
      messageEl.id = "appMessage";
      messageEl.className = "app-message";
      document.body.appendChild(messageEl);
    }

    messageEl.textContent = message;
    messageEl.className = `app-message ${type} show`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      messageEl.classList.remove("show");
    }, 3000);

    // Remove element after animation
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3500);
  }

  // Cleanup method
  destroy() {
    if (this.timer) {
      this.timer.destroy();
    }
    // Clean up any other resources
  }
}

// Initialize the app when the popup loads
let missMinutes;

function initializeExtension() {
  try {
    // Double check that DOM is ready
    if (
      document.readyState !== "complete" &&
      document.readyState !== "interactive"
    ) {
      document.addEventListener("DOMContentLoaded", initializeExtension);
      return;
    }

    // Check if already initialized
    if (missMinutes) {
      return;
    }

    missMinutes = new MissMinutes();

    // Initialize the app
    missMinutes
      .init()
      .then(() => {
        // Extension ready
      })
      .catch((error) => {
        console.error("Extension initialization failed:", error);
        throw error;
      });
  } catch (error) {
    console.error("Failed to initialize extension:", error);
    console.error("Error stack:", error.stack);

    // Show error message on page
    document.body.innerHTML = `
      <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
        <h3>Extension Initialization Failed</h3>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Stack:</strong> <pre>${error.stack}</pre></p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  // DOM already loaded
  initializeExtension();
}

// Handle popup unload
window.addEventListener("beforeunload", () => {
  if (missMinutes) {
    missMinutes.destroy();
  }
});
