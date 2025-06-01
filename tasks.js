// Tasks Management Module for Miss Minutes

class TaskManager {
  constructor() {
    this.tasks = [];
    this.init();
  }
  async init() {
    try {
      await this.loadTasks();
      this.renderTasks();
      this.setupEventListeners();
    } catch (error) {
      console.error("Error initializing TaskManager:", error);
      throw error;
    }
  }

  setupEventListeners() {
    try {
      // Add task button
      const addTaskBtn = document.getElementById("addTaskBtn");
      if (!addTaskBtn) {
        throw new Error("Add task button not found");
      }
      addTaskBtn.addEventListener("click", () => {
        this.showAddTaskForm();
      });

      // Save task button
      const saveTaskBtn = document.getElementById("saveTaskBtn");
      if (!saveTaskBtn) {
        throw new Error("Save task button not found");
      }
      saveTaskBtn.addEventListener("click", () => {
        this.saveTask();
      });

      // Cancel task button
      const cancelTaskBtn = document.getElementById("cancelTaskBtn");
      if (!cancelTaskBtn) {
        throw new Error("Cancel task button not found");
      }
      cancelTaskBtn.addEventListener("click", () => {
        this.hideAddTaskForm();
      });

      // Task input enter key
      const taskInput = document.getElementById("taskInput");
      if (!taskInput) {
        throw new Error("Task input not found");
      }
      taskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.saveTask();
        }
      });
    } catch (error) {
      console.error("Error setting up task event listeners:", error);
      throw error;
    }
  }
  showAddTaskForm() {
    try {
      const addTaskForm = document.getElementById("addTaskForm");
      const taskInput = document.getElementById("taskInput");

      if (!addTaskForm || !taskInput) {
        console.warn("Add task form elements not found");
        return;
      }

      addTaskForm.style.display = "block";
      taskInput.focus();
    } catch (error) {
      console.error("Error showing add task form:", error);
    }
  }

  hideAddTaskForm() {
    try {
      const addTaskForm = document.getElementById("addTaskForm");
      const taskInput = document.getElementById("taskInput");

      if (!addTaskForm || !taskInput) {
        console.warn("Add task form elements not found");
        return;
      }

      addTaskForm.style.display = "none";
      taskInput.value = "";
    } catch (error) {
      console.error("Error hiding add task form:", error);
    }
  }

  async saveTask() {
    const taskInput = document.getElementById("taskInput");
    const text = taskInput.value.trim();

    if (!text) return;

    const task = {
      id: Date.now().toString(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    this.tasks.unshift(task);
    await this.saveTasks();
    this.renderTasks();
    this.hideAddTaskForm();
  }

  async toggleTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      await this.saveTasks();
      this.renderTasks();

      // Update analytics if task was completed
      if (task.completed) {
        await this.updateTaskAnalytics();
      }
    }
  }

  async deleteTask(taskId) {
    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    await this.saveTasks();
    this.renderTasks();
  }

  renderTasks() {
    const tasksList = document.getElementById("tasksList");
    const emptyState = document.getElementById("emptyState");

    if (this.tasks.length === 0) {
      tasksList.innerHTML = "";
      tasksList.appendChild(emptyState);
      return;
    }

    emptyState.style.display = "none";

    const tasksHtml = this.tasks
      .map(
        (task) => `
      <div class="task-item ${
        task.completed ? "completed" : ""
      }" data-task-id="${task.id}">
        <input type="checkbox" class="task-checkbox" ${
          task.completed ? "checked" : ""
        }>
        <span class="task-text">${this.escapeHtml(task.text)}</span>
        <button class="task-delete" title="Delete task">✕</button>
      </div>
    `
      )
      .join("");

    tasksList.innerHTML = tasksHtml;

    // Add event listeners to task items
    tasksList.querySelectorAll(".task-item").forEach((item) => {
      const taskId = item.dataset.taskId;

      // Checkbox toggle
      item.querySelector(".task-checkbox").addEventListener("change", () => {
        this.toggleTask(taskId);
      });

      // Delete button
      item.querySelector(".task-delete").addEventListener("click", () => {
        this.deleteTask(taskId);
      });
    });
  }

  async loadTasks() {
    try {
      const result = await chrome.storage.local.get(["tasks"]);
      this.tasks = result.tasks || [];
    } catch (error) {
      console.error("Error loading tasks:", error);
      this.tasks = [];
    }
  }

  async saveTasks() {
    try {
      await chrome.storage.local.set({ tasks: this.tasks });
    } catch (error) {
      console.error("Error saving tasks:", error);
    }
  }

  async updateTaskAnalytics() {
    try {
      const result = await chrome.storage.local.get([
        "todayTasks",
        "lastTaskDate",
      ]);
      let { todayTasks = 0, lastTaskDate } = result;

      const today = new Date().toDateString();

      // Reset daily task count if it's a new day
      if (lastTaskDate !== today) {
        todayTasks = 0;
      }

      todayTasks += 1;

      await chrome.storage.local.set({
        todayTasks,
        lastTaskDate: today,
      });

      // Update analytics display if it exists
      if (window.analytics) {
        window.analytics.loadAnalytics();
      }
    } catch (error) {
      console.error("Error updating task analytics:", error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Get tasks summary for analytics
  getTasksSummary() {
    const completed = this.tasks.filter((t) => t.completed).length;
    const total = this.tasks.length;
    const pending = total - completed;

    return { completed, total, pending };
  }
}

// Initialize task manager when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.taskManager = new TaskManager();
  });
} else {
  window.taskManager = new TaskManager();
}
