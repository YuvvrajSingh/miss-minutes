// Timer Logic Module for Miss Minutes

class Timer {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentMode = "focus"; // 'focus', 'shortBreak', 'longBreak'
    this.timeRemaining = 25 * 60; // seconds
    this.totalTime = 25 * 60;
    this.interval = null;

    this.durations = {
      focus: 25,
      shortBreak: 5,
      longBreak: 15,
    };

    // White noise properties
    this.whiteNoiseAudio = null;
    this.currentWhiteNoise = "none";
    this.whiteNoiseVolume = 0.5;
    this.isWhiteNoisePlaying = false;

    this.init();
  }
  async init() {
    try {
      await this.loadSettings();
      await this.loadTimerState();
      await this.loadWhiteNoiseSettings();
      this.setupWhiteNoise();
      this.updateDisplay();
      this.setupEventListeners();
    } catch (error) {
      console.error("Error initializing Timer:", error);
      throw error;
    }
  }
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        "focusDuration",
        "shortBreakDuration",
        "longBreakDuration",
      ]);

      this.durations.focus = result.focusDuration || 25;
      this.durations.shortBreak = result.shortBreakDuration || 5;
      this.durations.longBreak = result.longBreakDuration || 15;
    } catch (error) {
      console.error("Error loading timer settings:", error);
    }
  }

  async loadTimerState() {
    try {
      const result = await chrome.storage.local.get([
        "isRunning",
        "currentMode",
        "timeRemaining",
        "startTime",
      ]);

      if (result.isRunning && result.timeRemaining && result.startTime) {
        // Calculate actual time remaining based on elapsed time
        const elapsed = Math.floor((Date.now() - result.startTime) / 1000);
        this.timeRemaining = Math.max(0, result.timeRemaining - elapsed);
        this.currentMode = result.currentMode || "focus";
        this.totalTime = this.durations[this.currentMode] * 60;

        if (this.timeRemaining > 0) {
          this.isRunning = true;
          this.startInterval();
        } else {
          // Timer completed while popup was closed
          await this.completeTimer();
        }
      } else {
        this.setMode(this.currentMode);
      }
    } catch (error) {
      console.error("Error loading timer state:", error);
    }
  }
  setupEventListeners() {
    try {
      // Start/Pause button
      const startPauseBtn = document.getElementById("startPauseBtn");
      if (!startPauseBtn) {
        throw new Error("Start/Pause button not found");
      }
      startPauseBtn.addEventListener("click", () => {
        if (this.isRunning) {
          this.pause();
        } else {
          this.start();
        }
      });

      // Reset button
      const resetBtn = document.getElementById("resetBtn");
      if (!resetBtn) {
        throw new Error("Reset button not found");
      }
      resetBtn.addEventListener("click", () => {
        this.reset();
      });

      // Mode buttons
      const modeButtons = document.querySelectorAll(".mode-btn");
      if (modeButtons.length === 0) {
        throw new Error("Mode buttons not found");
      }
      modeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.dataset.mode;
          this.setMode(mode);
        });
      });

      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "TIMER_COMPLETE") {
          this.completeTimer();
        }
      });
    } catch (error) {
      console.error("Error setting up timer event listeners:", error);
      throw error;
    }
  }

  setMode(mode) {
    if (this.isRunning) return;

    this.currentMode = mode;
    this.timeRemaining = this.durations[mode] * 60;
    this.totalTime = this.timeRemaining;

    // Update active mode button
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    this.updateDisplay();
    this.saveTimerState();
  }
  start() {
    this.isRunning = true;
    this.isPaused = false;

    // Start white noise if enabled and not playing
    if (this.currentWhiteNoise !== "none" && !this.isWhiteNoisePlaying) {
      this.playWhiteNoise();
    }

    // Start background timer
    chrome.runtime.sendMessage({
      type: "START_TIMER",
      duration: this.timeRemaining / 60,
    });

    this.startInterval();
    this.updateControls();
    this.saveTimerState();
  }
  pause() {
    this.isRunning = false;
    this.isPaused = true;

    // Keep white noise playing during pause (user preference)
    // Users can manually stop it if they want

    // Stop background timer
    chrome.runtime.sendMessage({ type: "STOP_TIMER" });

    this.stopInterval();
    this.updateControls();
    this.saveTimerState();
  }
  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.timeRemaining = this.durations[this.currentMode] * 60;
    this.totalTime = this.timeRemaining;

    // Stop white noise on reset
    this.stopWhiteNoise();

    // Stop background timer
    chrome.runtime.sendMessage({ type: "STOP_TIMER" });

    this.stopInterval();
    this.updateDisplay();
    this.updateControls();
    this.saveTimerState();
  }

  startInterval() {
    this.stopInterval();
    this.interval = setInterval(() => {
      this.timeRemaining--;
      this.updateDisplay();

      if (this.timeRemaining <= 0) {
        this.completeTimer();
      } else {
        this.saveTimerState();
      }
    }, 1000);
  }

  stopInterval() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  async completeTimer() {
    this.isRunning = false;
    this.isPaused = false;
    this.stopInterval();

    // Stop white noise on timer completion
    this.stopWhiteNoise();

    // Play completion sound
    this.playCompletionSound();

    // Auto-switch to next mode
    const nextMode = this.getNextMode();
    this.setMode(nextMode);

    this.updateControls();
    await this.clearTimerState();
  }

  getNextMode() {
    // Simple pattern: Focus -> Short Break -> Focus -> Short Break -> Focus -> Long Break
    if (this.currentMode === "focus") {
      return "shortBreak";
    } else {
      return "focus";
    }
  }

  playCompletionSound() {
    const audio = document.getElementById("timerAudio");
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(console.error);
    }
  }
  updateDisplay() {
    try {
      const minutes = Math.floor(this.timeRemaining / 60);
      const seconds = this.timeRemaining % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      const timerDisplay = document.getElementById("timerDisplay");
      const timerMode = document.getElementById("timerMode");

      if (!timerDisplay || !timerMode) {
        console.warn("Timer display elements not found");
        return;
      }

      timerDisplay.textContent = timeString;
      timerMode.textContent = this.getModeLabel();

      // Update progress ring
      const progress = 1 - this.timeRemaining / this.totalTime;
      const circumference = 2 * Math.PI * 85;
      const strokeDasharray = circumference;
      const strokeDashoffset = circumference * (1 - progress);

      const progressRing = document.getElementById("progressRing");
      if (progressRing) {
        progressRing.style.strokeDasharray = strokeDasharray;
        progressRing.style.strokeDashoffset = strokeDashoffset;
      }

      // Update timer circle class for animation
      const timerCircle = document.querySelector(".timer-circle");
      if (timerCircle) {
        timerCircle.classList.toggle("running", this.isRunning);
      }
    } catch (error) {
      console.error("Error updating timer display:", error);
    }
  }
  updateControls() {
    try {
      const startPauseBtn = document.getElementById("startPauseBtn");
      const startPauseIcon = document.getElementById("startPauseIcon");
      const startPauseText = document.getElementById("startPauseText");

      if (!startPauseBtn || !startPauseIcon || !startPauseText) {
        console.warn("Timer control elements not found");
        return;
      }

      if (this.isRunning) {
        startPauseIcon.textContent = "⏸️";
        startPauseText.textContent = "Pause";
      } else {
        startPauseIcon.textContent = "▶️";
        startPauseText.textContent = this.isPaused ? "Resume" : "Start";
      }
    } catch (error) {
      console.error("Error updating timer controls:", error);
    }
  }

  getModeLabel() {
    const labels = {
      focus: "Focus",
      shortBreak: "Short Break",
      longBreak: "Long Break",
    };
    return labels[this.currentMode] || "Focus";
  }

  async updateDuration(type, value) {
    const key = type.replace("Duration", "");
    this.durations[key] = value;

    // Save to storage
    const saveKey = type;
    await chrome.storage.local.set({ [saveKey]: value });

    // Update current timer if not running and same mode
    if (!this.isRunning && this.currentMode === key) {
      this.setMode(key);
    }
  }

  async saveTimerState() {
    await chrome.storage.local.set({
      isRunning: this.isRunning,
      currentMode: this.currentMode,
      timeRemaining: this.timeRemaining,
      startTime: this.isRunning ? Date.now() : null,
    });
  }

  async clearTimerState() {
    await chrome.storage.local.set({
      isRunning: false,
      timeRemaining: null,
      startTime: null,
    });
  }

  resetToCurrentMode() {
    this.reset();
  }

  // Method to handle mode switching from popup.js
  switchToBreak() {
    // Simple logic: switch to short break
    this.setMode("shortBreak");
  }

  switchToFocus() {
    this.setMode("focus");
  }

  // Method to handle timer ticks from background
  handleBackgroundTick(timeRemaining) {
    this.timeRemaining = timeRemaining;
    this.updateDisplay();
  }

  // Method to sync with background state
  syncWithBackground(state) {
    if (state) {
      this.isRunning = state.isRunning || false;
      this.currentMode = state.currentMode || "focus";
      this.timeRemaining =
        state.timeRemaining || this.durations[this.currentMode] * 60;
      this.totalTime = this.durations[this.currentMode] * 60;

      if (this.isRunning) {
        this.startInterval();
      }

      this.updateDisplay();
      this.updateControls();
    }
  }

  // Method to toggle timer (for keyboard shortcuts)
  toggleTimer() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  // Method to reset timer (for keyboard shortcuts)
  resetTimer() {
    this.reset();
  }
  // Cleanup method
  destroy() {
    this.stopInterval();
    // Clean up white noise audio
    this.stopWhiteNoise();
    if (this.whiteNoiseAudio) {
      this.whiteNoiseAudio.src = "";
      this.whiteNoiseAudio = null;
    }
  }
  async loadWhiteNoiseSettings() {
    try {
      const result = await chrome.storage.local.get([
        "whiteNoiseTrack",
        "whiteNoiseVolume",
        "whiteNoiseEnabled",
      ]);

      this.currentWhiteNoise = result.whiteNoiseTrack || "none";
      this.whiteNoiseVolume = result.whiteNoiseVolume || 0.5;
      this.isWhiteNoisePlaying = result.whiteNoiseEnabled || false;
    } catch (error) {
      console.error("Error loading white noise settings:", error);
    }
  }

  setupWhiteNoise() {
    try {
      // Setup white noise select dropdown
      const whiteNoiseSelect = document.getElementById("whiteNoiseSelect");
      if (whiteNoiseSelect) {
        whiteNoiseSelect.value = this.currentWhiteNoise;
        whiteNoiseSelect.addEventListener("change", (e) => {
          this.setWhiteNoise(e.target.value);
        });
      }

      // Setup white noise toggle button
      const whiteNoiseToggle = document.getElementById("whiteNoiseToggle");
      if (whiteNoiseToggle) {
        whiteNoiseToggle.addEventListener("click", () => {
          this.toggleWhiteNoise();
        });
      }

      // Setup volume slider
      const volumeSlider = document.getElementById("whiteNoiseVolume");
      if (volumeSlider) {
        volumeSlider.value = this.whiteNoiseVolume * 100;
        volumeSlider.addEventListener("input", (e) => {
          this.setWhiteNoiseVolume(e.target.value / 100);
        });
      }

      // Update UI
      this.updateWhiteNoiseUI();
    } catch (error) {
      console.error("Error setting up white noise:", error);
    }
  }

  setWhiteNoise(track) {
    try {
      // Stop current white noise if playing
      if (this.whiteNoiseAudio && !this.whiteNoiseAudio.paused) {
        this.whiteNoiseAudio.pause();
        this.whiteNoiseAudio.currentTime = 0;
      }

      this.currentWhiteNoise = track;
      if (track !== "none") {
        // Create new audio element
        this.whiteNoiseAudio = new Audio(`audio/${track}`);
        this.whiteNoiseAudio.loop = true;
        this.whiteNoiseAudio.volume = this.whiteNoiseVolume;

        // Add error handling for audio loading
        this.whiteNoiseAudio.addEventListener("error", (e) => {
          console.error(`Failed to load white noise audio: ${track}`, e);
          this.currentWhiteNoise = "none";
          this.isWhiteNoisePlaying = false;
          this.updateWhiteNoiseUI();
        });

        // If white noise was playing, start the new track
        if (this.isWhiteNoisePlaying) {
          this.playWhiteNoise();
        }
      } else {
        this.whiteNoiseAudio = null;
        this.isWhiteNoisePlaying = false;
      }

      this.updateWhiteNoiseUI();
      this.saveWhiteNoiseSettings();
    } catch (error) {
      console.error("Error setting white noise:", error);
    }
  }

  toggleWhiteNoise() {
    try {
      if (this.currentWhiteNoise === "none") {
        return;
      }

      if (this.isWhiteNoisePlaying) {
        this.stopWhiteNoise();
      } else {
        this.playWhiteNoise();
      }
    } catch (error) {
      console.error("Error toggling white noise:", error);
    }
  }

  playWhiteNoise() {
    try {
      if (this.whiteNoiseAudio && this.currentWhiteNoise !== "none") {
        this.whiteNoiseAudio.play().catch(console.error);
        this.isWhiteNoisePlaying = true;
        this.updateWhiteNoiseUI();
        this.saveWhiteNoiseSettings();
      }
    } catch (error) {
      console.error("Error playing white noise:", error);
    }
  }

  stopWhiteNoise() {
    try {
      if (this.whiteNoiseAudio) {
        this.whiteNoiseAudio.pause();
        this.whiteNoiseAudio.currentTime = 0;
        this.isWhiteNoisePlaying = false;
        this.updateWhiteNoiseUI();
        this.saveWhiteNoiseSettings();
      }
    } catch (error) {
      console.error("Error stopping white noise:", error);
    }
  }

  setWhiteNoiseVolume(volume) {
    try {
      this.whiteNoiseVolume = Math.max(0, Math.min(1, volume));

      if (this.whiteNoiseAudio) {
        this.whiteNoiseAudio.volume = this.whiteNoiseVolume;
      }

      // Update volume label
      const volumeLabel = document.getElementById("volumeLabel");
      if (volumeLabel) {
        volumeLabel.textContent = `${Math.round(this.whiteNoiseVolume * 100)}%`;
      }

      this.saveWhiteNoiseSettings();
    } catch (error) {
      console.error("Error setting white noise volume:", error);
    }
  }

  updateWhiteNoiseUI() {
    try {
      const whiteNoiseToggle = document.getElementById("whiteNoiseToggle");
      const whiteNoiseIcon = document.getElementById("whiteNoiseIcon");
      const volumeLabel = document.getElementById("volumeLabel");

      if (whiteNoiseToggle && whiteNoiseIcon) {
        if (this.currentWhiteNoise === "none") {
          whiteNoiseToggle.classList.remove("active");
          whiteNoiseIcon.textContent = "🔇";
          whiteNoiseToggle.disabled = true;
        } else {
          whiteNoiseToggle.disabled = false;
          if (this.isWhiteNoisePlaying) {
            whiteNoiseToggle.classList.add("active");
            whiteNoiseIcon.textContent = "🔊";
          } else {
            whiteNoiseToggle.classList.remove("active");
            whiteNoiseIcon.textContent = "🔇";
          }
        }
      }

      if (volumeLabel) {
        volumeLabel.textContent = `${Math.round(this.whiteNoiseVolume * 100)}%`;
      }
    } catch (error) {
      console.error("Error updating white noise UI:", error);
    }
  }

  async saveWhiteNoiseSettings() {
    try {
      await chrome.storage.local.set({
        whiteNoiseTrack: this.currentWhiteNoise,
        whiteNoiseVolume: this.whiteNoiseVolume,
        whiteNoiseEnabled: this.isWhiteNoisePlaying,
      });
    } catch (error) {
      console.error("Error saving white noise settings:", error);
    }
  }
}

// Initialize timer when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.timer = new Timer();
  });
} else {
  window.timer = new Timer();
}
