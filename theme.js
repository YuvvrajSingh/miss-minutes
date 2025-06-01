// Theme Management Module for Miss Minutes

class ThemeManager {
  constructor() {
    this.currentTheme = "light";
    this.init();
  }
  async init() {
    try {
      await this.loadTheme();
      this.setupEventListeners();
      this.applyTheme();
    } catch (error) {
      console.error("Error initializing ThemeManager:", error);
      throw error;
    }
  }

  async loadTheme() {
    try {
      const result = await chrome.storage.local.get("theme");
      this.currentTheme = result.theme || "light";
    } catch (error) {
      console.error("Error loading theme:", error);
      this.currentTheme = "light";
    }
  }
  setupEventListeners() {
    try {
      const themeToggle = document.getElementById("themeToggle");
      if (!themeToggle) {
        console.warn("Theme toggle button not found");
        return;
      }
      themeToggle.addEventListener("click", () => {
        this.toggleTheme();
      });
    } catch (error) {
      console.error("Error setting up theme event listeners:", error);
      throw error;
    }
  }

  async toggleTheme() {
    this.currentTheme = this.currentTheme === "light" ? "dark" : "light";
    await this.saveTheme();
    this.applyTheme();
  }

  async saveTheme() {
    try {
      await chrome.storage.local.set({ theme: this.currentTheme });
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }
  applyTheme() {
    const body = document.body;
    const themeToggle = document.getElementById("themeToggle");

    // Remove existing theme classes
    body.classList.remove("light-theme", "dark-theme");

    // Apply current theme
    body.classList.add(`${this.currentTheme}-theme`);

    // Update data-theme attribute for CSS custom properties
    body.setAttribute("data-theme", this.currentTheme);

    // Update toggle button text/icon
    if (themeToggle) {
      const icon = themeToggle.querySelector("i");
      const text = themeToggle.querySelector("span");

      if (this.currentTheme === "dark") {
        if (icon) icon.textContent = "☀️";
        if (text) text.textContent = "Light Mode";
        themeToggle.setAttribute("title", "Switch to Light Mode");
      } else {
        if (icon) icon.textContent = "🌙";
        if (text) text.textContent = "Dark Mode";
        themeToggle.setAttribute("title", "Switch to Dark Mode");
      }
    }

    // Update chart if analytics module is available
    if (window.missMinutes && window.missMinutes.analytics) {
      setTimeout(() => {
        window.missMinutes.analytics.updateChart();
      }, 100);
    }

    // Update CSS custom properties for dynamic theming
    this.updateCSSVariables();
  }

  updateCSSVariables() {
    const root = document.documentElement;

    if (this.currentTheme === "dark") {
      root.style.setProperty("--bg-primary", "#1a1a1a");
      root.style.setProperty("--bg-secondary", "#2d2d2d");
      root.style.setProperty("--text-primary", "#ffffff");
      root.style.setProperty("--text-secondary", "#cccccc");
      root.style.setProperty("--text-muted", "#888888");
      root.style.setProperty("--border-color", "#404040");
      root.style.setProperty("--accent-color", "#ff6b35");
      root.style.setProperty("--accent-hover", "#ff5722");
      root.style.setProperty("--success-color", "#4caf50");
      root.style.setProperty("--warning-color", "#ff9800");
      root.style.setProperty("--error-color", "#f44336");
      root.style.setProperty("--focus-ring", "rgba(255, 107, 53, 0.3)");
      root.style.setProperty("--shadow-light", "rgba(0, 0, 0, 0.3)");
      root.style.setProperty("--shadow-medium", "rgba(0, 0, 0, 0.5)");
    } else {
      root.style.setProperty("--bg-primary", "#ffffff");
      root.style.setProperty("--bg-secondary", "#f8f9fa");
      root.style.setProperty("--text-primary", "#333333");
      root.style.setProperty("--text-secondary", "#666666");
      root.style.setProperty("--text-muted", "#999999");
      root.style.setProperty("--border-color", "#e0e0e0");
      root.style.setProperty("--accent-color", "#ff6b35");
      root.style.setProperty("--accent-hover", "#ff5722");
      root.style.setProperty("--success-color", "#4caf50");
      root.style.setProperty("--warning-color", "#ff9800");
      root.style.setProperty("--error-color", "#f44336");
      root.style.setProperty("--focus-ring", "rgba(255, 107, 53, 0.3)");
      root.style.setProperty("--shadow-light", "rgba(0, 0, 0, 0.1)");
      root.style.setProperty("--shadow-medium", "rgba(0, 0, 0, 0.15)");
    }
  }

  // Get current theme for other modules
  getCurrentTheme() {
    return this.currentTheme;
  }

  // Check if current theme is dark
  isDarkMode() {
    return this.currentTheme === "dark";
  }

  // Method for other modules to listen to theme changes
  onThemeChange(callback) {
    // Store callback for theme change events
    if (!this.themeChangeCallbacks) {
      this.themeChangeCallbacks = [];
    }
    this.themeChangeCallbacks.push(callback);
  }

  // Notify listeners of theme changes
  notifyThemeChange() {
    if (this.themeChangeCallbacks) {
      this.themeChangeCallbacks.forEach((callback) => {
        try {
          callback(this.currentTheme);
        } catch (error) {
          console.error("Error in theme change callback:", error);
        }
      });
    }
  }

  // Enhanced toggle with callback notification
  async toggleThemeWithNotification() {
    await this.toggleTheme();
    this.notifyThemeChange();
  }
}

// Export for use in popup.js
window.ThemeManager = ThemeManager;
