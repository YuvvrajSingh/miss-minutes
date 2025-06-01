// Analytics Module for Miss Minutes

class Analytics {
  constructor() {
    this.init();
  }
  async init() {
    try {
      await this.loadAnalytics();
      this.startDailyReset();
      this.setupChart();
    } catch (error) {
      console.error("Error initializing Analytics:", error);
      throw error;
    }
  }

  async loadAnalytics() {
    try {
      const result = await chrome.storage.local.get([
        "todayFocus",
        "todaySessions",
        "weekFocus",
        "todayTasks",
        "lastFocusDate",
        "lastTaskDate",
      ]);

      let {
        todayFocus = 0,
        todaySessions = 0,
        weekFocus = 0,
        todayTasks = 0,
        lastFocusDate,
        lastTaskDate,
      } = result;

      const today = new Date().toDateString();

      // Reset daily stats if it's a new day
      if (lastFocusDate !== today) {
        todayFocus = 0;
        todaySessions = 0;
        await chrome.storage.local.set({
          todayFocus,
          todaySessions,
          lastFocusDate: today,
        });
      }

      if (lastTaskDate !== today) {
        todayTasks = 0;
        await chrome.storage.local.set({
          todayTasks,
          lastTaskDate: today,
        });
      }

      // Reset weekly stats on Monday
      const weekReset = await this.checkWeeklyReset();
      if (weekReset) {
        weekFocus = todayFocus;
        await chrome.storage.local.set({ weekFocus });
      }
      this.updateDisplayElements(todayFocus, todaySessions, weekFocus);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  }
  async checkWeeklyReset() {
    try {
      const result = await chrome.storage.local.get(["lastWeekReset"]);
      const lastWeekReset = result.lastWeekReset;
      const today = new Date();
      const currentWeek = this.getWeekStart(today);

      if (!lastWeekReset || new Date(lastWeekReset) < currentWeek) {
        await chrome.storage.local.set({
          lastWeekReset: currentWeek.toISOString(),
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking weekly reset:", error);
      return false;
    }
  }

  getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  startDailyReset() {
    // Check for day change every minute
    setInterval(() => {
      this.loadAnalytics();
    }, 60000);
  }

  // Method to be called when focus session completes
  async addFocusSession(durationMinutes) {
    await this.recordFocusSession(durationMinutes);
  }
  // Update display method that can be called from popup.js
  async updateDisplay() {
    const result = await chrome.storage.local.get([
      "todayFocus",
      "todaySessions",
      "weekFocus",
    ]);

    const { todayFocus = 0, todaySessions = 0, weekFocus = 0 } = result;
    this.updateDisplayElements(todayFocus, todaySessions, weekFocus);
    this.updateChart();
  }

  updateDisplayElements(todayFocus, todaySessions, weekFocus) {
    // Update focus time (convert minutes to hours and minutes)
    const todayHours = Math.floor(todayFocus / 60);
    const todayMinutes = todayFocus % 60;
    let focusText = "";

    if (todayHours > 0) {
      focusText = `${todayHours}h ${todayMinutes}m`;
    } else {
      focusText = `${todayMinutes}m`;
    }

    const todayFocusEl = document.getElementById("todayFocus");
    const todaySessionsEl = document.getElementById("todaySessions");
    const weekFocusEl = document.getElementById("weekFocus");

    if (todayFocusEl) todayFocusEl.textContent = focusText;
    if (todaySessionsEl) todaySessionsEl.textContent = todaySessions;

    // Update week focus
    const weekHours = Math.floor(weekFocus / 60);
    const weekMinutesRemaining = weekFocus % 60;
    let weekText = "";

    if (weekHours > 0) {
      weekText = `${weekHours}h ${weekMinutesRemaining}m`;
    } else {
      weekText = `${weekMinutesRemaining}m`;
    }

    if (weekFocusEl) weekFocusEl.textContent = weekText;
  }

  // Method to be called when focus session completes
  async recordFocusSession(durationMinutes) {
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

      // Reset if new day
      if (lastFocusDate !== today) {
        todayFocus = 0;
        todaySessions = 0;
      } // Update stats
      todayFocus += durationMinutes;
      todaySessions += 1;
      weekFocus += durationMinutes;

      // Store daily focus data for chart
      await this.storeDailyFocusData(durationMinutes);

      await chrome.storage.local.set({
        todayFocus,
        todaySessions,
        weekFocus,
        lastFocusDate: today,
      });
      // Update display
      this.updateDisplayElements(todayFocus, todaySessions, weekFocus);
    } catch (error) {
      console.error("Error recording focus session:", error);
    }
  }

  // Get productivity insights
  getProductivityInsights() {
    // This could be expanded with more complex analytics
    return {
      averageSessionLength: this.calculateAverageSession(),
      longestStreak: this.getLongestStreak(),
      totalLifetimeFocus: this.getTotalFocus(),
    };
  }

  async calculateAverageSession() {
    try {
      const result = await chrome.storage.local.get([
        "todaySessions",
        "todayFocus",
      ]);
      const { todaySessions = 0, todayFocus = 0 } = result;

      if (todaySessions === 0) return 0;
      return Math.round(todayFocus / todaySessions);
    } catch (error) {
      return 0;
    }
  }

  async getLongestStreak() {
    // This would require storing daily data over time
    // For now, return a placeholder
    return 1;
  }

  async getTotalFocus() {
    try {
      const result = await chrome.storage.local.get(["totalLifetimeFocus"]);
      return result.totalLifetimeFocus || 0;
    } catch (error) {
      return 0;
    }
  }
  // Export analytics data
  async exportData() {
    try {
      const result = await chrome.storage.local.get();
      const exportData = {
        analytics: {
          todayFocus: result.todayFocus || 0,
          todaySessions: result.todaySessions || 0,
          weekFocus: result.weekFocus || 0,
          todayTasks: result.todayTasks || 0,
        },
        tasks: result.tasks || [],
        settings: {
          focusDuration: result.focusDuration || 25,
          shortBreakDuration: result.shortBreakDuration || 5,
          longBreakDuration: result.longBreakDuration || 15,
          theme: result.theme || "light",
        },
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `miss-minutes-data-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  }
  // Chart functionality
  setupChart() {
    this.canvas = document.getElementById("focusChart");
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");

      // Set canvas size based on container
      const container = this.canvas.parentElement;
      if (container) {
        const containerWidth = container.clientWidth - 32; // account for padding
        this.canvas.width = Math.min(containerWidth, 400);
        this.canvas.height = Math.min(containerWidth * 0.5, 200);
      }

      this.updateChart();
    }
  }

  async storeDailyFocusData(minutesToAdd) {
    try {
      const today = new Date().toDateString();
      const result = await chrome.storage.local.get(["dailyFocusData"]);
      const dailyData = result.dailyFocusData || {};

      // Add to today's total
      dailyData[today] = (dailyData[today] || 0) + minutesToAdd;

      // Keep only last 7 days of data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      Object.keys(dailyData).forEach((date) => {
        if (new Date(date) < sevenDaysAgo) {
          delete dailyData[date];
        }
      });

      await chrome.storage.local.set({ dailyFocusData: dailyData });
    } catch (error) {
      console.error("Error storing daily focus data:", error);
    }
  }
  async getDailyFocusData() {
    try {
      const result = await chrome.storage.local.get(["dailyFocusData"]);
      const dailyData = result.dailyFocusData || {};

      // If no data exists, create some sample data for demonstration
      if (Object.keys(dailyData).length === 0) {
        await this.createSampleData();
        const sampleResult = await chrome.storage.local.get(["dailyFocusData"]);
        Object.assign(dailyData, sampleResult.dailyFocusData || {});
      }

      // Generate last 7 days
      const days = [];
      const data = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();
        const dayName = date.toLocaleDateString("en", { weekday: "short" });

        days.push(dayName);
        data.push(dailyData[dateString] || 0);
      }

      return { days, data };
    } catch (error) {
      console.error("Error getting daily focus data:", error);
      return { days: [], data: [] };
    }
  }

  async createSampleData() {
    try {
      const sampleData = {};
      const today = new Date();

      // Create sample data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();

        // Generate realistic sample data (0-120 minutes)
        const sampleMinutes = Math.floor(Math.random() * 120) + 15;
        sampleData[dateString] = sampleMinutes;
      }

      await chrome.storage.local.set({ dailyFocusData: sampleData });
    } catch (error) {
      console.error("Error creating sample data:", error);
    }
  }

  async updateChart() {
    if (!this.canvas || !this.ctx) return;

    const { days, data } = await this.getDailyFocusData();
    this.drawChart(days, data);
  }

  drawChart(labels, data) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get theme colors
    const isDark = document.body.getAttribute("data-theme") === "dark";
    const lineColor = "#4CAF50";
    const textColor = isDark ? "#d1d5db" : "#6b7280";
    const gridColor = isDark ? "#4b5563" : "#e5e7eb";

    // Find max value for scaling
    const maxValue = Math.max(...data, 60); // minimum scale of 60 minutes

    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw axes
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = textColor;
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.textAlign = "center";

    // X-axis labels (days)
    labels.forEach((label, index) => {
      const x = padding + (chartWidth * index) / (labels.length - 1);
      ctx.fillText(label, x, canvas.height - 10);
    });

    // Y-axis labels (minutes)
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const value = Math.round((maxValue * (4 - i)) / 4);
      const y = padding + (chartHeight * i) / 4 + 3;
      ctx.fillText(value + "m", padding - 10, y);
    }

    // Draw line chart
    if (data.length > 1) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((value, index) => {
        const x = padding + (chartWidth * index) / (data.length - 1);
        const y = padding + chartHeight - (chartHeight * value) / maxValue;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw data points
      ctx.fillStyle = lineColor;
      data.forEach((value, index) => {
        const x = padding + (chartWidth * index) / (data.length - 1);
        const y = padding + chartHeight - (chartHeight * value) / maxValue;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  }
}

// Initialize analytics when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.analytics = new Analytics();
  });
} else {
  window.analytics = new Analytics();
}
