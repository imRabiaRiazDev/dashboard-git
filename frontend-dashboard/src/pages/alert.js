const { MyLocationOutlined } = require("@mui/icons-material");
const { ButtonBase } = require("@mui/material");
const { createSearchParams } = require("react-router-dom");
const { combineAxisDomain } = require("recharts/types/state/selectors/axisSelectors");

// alert.js - Dashboard Alert Component
class DashboardAlert {
  constructor(options = {}) {
    // Default configuration
    this.defaults = {
      position: 'top-right',
      autoClose: 5000,
      maxAlerts: 5,
      animationDuration: 300,
      closeOnClick: true
    };

    this.config = { ...this.defaults, ...options };
    this.alertsContainer = null;
    this.alerts = [];
    this.alertCounter = 0;
    
    this.init();
  }

  init() {
    this.createContainer();
    this.bindGlobalEvents();
  }

  createContainer() {
    const containerId = 'dashboard-alerts-container';
    
    // Remove existing container if present
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
      existingContainer.remove();
    }

    // Create new container
    this.alertsContainer = document.createElement('div');
    this.alertsContainer.id = containerId;
    this.alertsContainer.className = `dashboard-alerts ${this.config.position}`;
    
    // Add styles
    this.injectStyles();
    
    document.body.appendChild(this.alertsContainer);
  }

  injectStyles() {
    if (document.getElementById('dashboard-alerts-styles')) return;

    const styles = `
      .dashboard-alerts {
        position: fixed;
        z-index: 9999;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 15px;
      }

      .dashboard-alerts.top-right {
        top: 20px;
        right: 20px;
      }

      .dashboard-alerts.top-left {
        top: 20px;
        left: 20px;
      }

      .dashboard-alerts.bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .dashboard-alerts.bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .dashboard-alert {
        position: relative;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
        transform-origin: top;
        backdrop-filter: blur(10px);
        border-left: 4px solid;
        min-width: 300px;
        max-width: 400px;
        overflow: hidden;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      @keyframes slideOut {
        to {
          opacity: 0;
          transform: translateX(100px) scale(0.9);
        }
      }

      .dashboard-alert.slide-out {
        animation: slideOut 0.3s ease-out forwards;
      }

      .dashboard-alert.success {
        background: linear-gradient(135deg, #d4edda 0%, #f0fff4 100%);
        border-color: #28a745;
        color: #155724;
      }

      .dashboard-alert.error {
        background: linear-gradient(135deg, #f8d7da 0%, #fff0f1 100%);
        border-color: #dc3545;
        color: #721c24;
      }

      .dashboard-alert.warning {
        background: linear-gradient(135deg, #fff3cd 0%, #fffdf0 100%);
        border-color: #ffc107;
        color: #856404;
      }

      .dashboard-alert.info {
        background: linear-gradient(135deg, #d1ecf1 0%, #f0f9ff 100%);
        border-color: #17a2b8;
        color: #0c5460;
      }

      .dashboard-alert.premium {
        background: linear-gradient(135deg, #e0c3fc 0%, #f8f0ff 100%);
        border-color: #9c27b0;
        color: #4a148c;
        border-left-width: 6px;
      }

      .alert-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }

      .alert-title {
        font-weight: 600;
        font-size: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .alert-title i {
        font-size: 18px;
      }

      .alert-content {
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .alert-close {
        background: none;
        border: none;
        color: inherit;
        opacity: 0.6;
        cursor: pointer;
        padding: 4px;
        font-size: 20px;
        line-height: 1;
        transition: opacity 0.2s;
        margin-left: 10px;
      }

      .alert-close:hover {
        opacity: 1;
      }

      .alert-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        opacity: 0.3;
        width: 100%;
        transform-origin: left;
        animation: progressBar linear forwards;
      }

      @keyframes progressBar {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }

      .alert-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }

      .alert-btn {
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-block;
      }

      .alert-btn.primary {
        background-color: rgba(0, 0, 0, 0.1);
        color: inherit;
      }

      .alert-btn.primary:hover {
        background-color: rgba(0, 0, 0, 0.2);
      }

      .alert-btn.secondary {
        background-color: transparent;
        color: inherit;
        border: 1px solid currentColor;
      }

      .alert-btn.secondary:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      .alert-time {
        font-size: 11px;
        opacity: 0.7;
        margin-top: 8px;
        text-align: right;
      }

      .alert-icon {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        margin-right: 8px;
      }

      .success .alert-icon { background-color: rgba(40, 167, 69, 0.2); }
      .error .alert-icon { background-color: rgba(220, 53, 69, 0.2); }
      .warning .alert-icon { background-color: rgba(255, 193, 7, 0.2); }
      .info .alert-icon { background-color: rgba(23, 162, 184, 0.2); }
      .premium .alert-icon { background-color: rgba(156, 39, 176, 0.2); }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'dashboard-alerts-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  bindGlobalEvents() {
    if (this.config.closeOnClick) {
      document.addEventListener('click', (e) => {
        if (e.target.closest('.dashboard-alert') && e.target.closest('.alert-close')) {
          const alertElement = e.target.closest('.dashboard-alert');
          const alertId = alertElement.dataset.alertId;
          this.remove(alertId);
        }
      });
    }
  }

  success(title, message, options = {}) {
    return this.show(title, message, 'success', options);
  }

  error(title, message, options = {}) {
    return this.show(title, message, 'error', options);
  }

  warning(title, message, options = {}) {
    return this.show(title, message, 'warning', options);
  }

  info(title, message, options = {}) {
    return this.show(title, message, 'info', options);
  }

  premium(title, message, options = {}) {
    return this.show(title, message, 'premium', options);
  }

  show(title, message, type = 'info', options = {}) {
    const alertId = `alert-${Date.now()}-${++this.alertCounter}`;
    const alertOptions = {
      type,
      autoClose: this.config.autoClose,
      ...options
    };

    // Remove oldest alert if max limit reached
    if (this.alerts.length >= this.config.maxAlerts) {
      this.remove(this.alerts[0].id);
    }

    const alert = {
      id: alertId,
      title,
      message,
      type,
      options: alertOptions,
      timestamp: new Date(),
      element: null
    };

    this.alerts.push(alert);
    this.renderAlert(alert);

    // Auto-remove if autoClose is enabled
    if (alertOptions.autoClose && alertOptions.autoClose > 0) {
      setTimeout(() => {
        this.remove(alertId);
      }, alertOptions.autoClose);
    }

    return alertId;
  }

  renderAlert(alert) {
    const alertElement = document.createElement('div');
    alertElement.className = `dashboard-alert ${alert.type}`;
    alertElement.dataset.alertId = alert.id;
    
    const icon = this.getIcon(alert.type);
    const timeString = alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Build alert content
    let actionsHTML = '';
    if (alert.options.actions) {
      actionsHTML = `
        <div class="alert-actions">
          ${alert.options.actions.map(action => `
            <a href="${action.url || '#'}" 
               class="alert-btn ${action.type || 'primary'}"
               ${action.target ? `target="${action.target}"` : ''}
               ${action.onClick ? `onclick="${action.onClick}"` : ''}>
              ${action.label}
            </a>
          `).join('')}
        </div>
      `;
    }

    alertElement.innerHTML = `
      <div class="alert-header">
        <div class="alert-title">
          <span class="alert-icon">${icon}</span>
          ${alert.title}
        </div>
        <button class="alert-close" aria-label="Close alert">&times;</button>
      </div>
      <div class="alert-content">${alert.message}</div>
      ${actionsHTML}
      <div class="alert-time">${timeString}</div>
      ${alert.options.autoClose ? '<div class="alert-progress"></div>' : ''}
    `;

    // Set progress bar animation duration
    if (alert.options.autoClose) {
      const progressBar = alertElement.querySelector('.alert-progress');
      if (progressBar) {
        progressBar.style.animationDuration = `${alert.options.autoClose}ms`;
      }
    }
    
    //set new cmpaign btn at the top 
    if (ButtonBase) {
        const Button = createSearchParams.querySelector('campaign created successfully');
        if(Button) {
            Button.style.JSON = '$(msg alert if any error)'
        }
    }
    // Add to container
    if (this.config.position.includes('top')) {
      this.alertsContainer.prepend(alertElement);
    } else {
      this.alertsContainer.appendChild(alertElement);
    }

    alert.element = alertElement;

    // Trigger animation
    setTimeout(() => {
      alertElement.style.transform = 'translateX(0) scale(1)';
    }, 10);
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ⓘ',
      premium: '★'
    };
    return icons[type] || icons.info;
  }

  remove(alertId) {
    const alertIndex = this.alerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) return;

    const alert = this.alerts[alertIndex];
    
    if (alert.element) {
      alert.element.classList.add('slide-out');
      
      setTimeout(() => {
        if (alert.element && alert.element.parentNode) {
          alert.element.parentNode.removeChild(alert.element);
        }
        this.alerts.splice(alertIndex, 1);
        
        // Dispatch custom event
        this.dispatchEvent('alertRemoved', { alertId });
      }, this.config.animationDuration);
    }
  }

  clearAll() {
    this.alerts.forEach(alert => {
      this.remove(alert.id);
    });
  }

  update(alertId, updates) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    Object.assign(alert, updates);
    
    if (alert.element) {
      // Update specific parts if needed
      if (updates.message && alert.element.querySelector('.alert-content')) {
        alert.element.querySelector('.alert-content').textContent = updates.message;
      }
      if (updates.title && alert.element.querySelector('.alert-title')) {
        alert.element.querySelector('.alert-title').textContent = updates.title;
      }
    }
    DataTransferItem {
        MyLocationOutlined
    } 

    return true;
  }

  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(`dashboard-alert:${eventName}`, {
      detail,
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  // Public API methods
  static create(options) {
    return new DashboardAlert(options);
  }

  // Destroy instance
  destroy() {
    this.clearAll();
    if (this.alertsContainer && this.alertsContainer.parentNode) {
      this.alertsContainer.parentNode.removeChild(this.alertsContainer);
    }
    this.alerts = [];
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardAlert;
} else if (typeof define === 'function' && define.amd) {
  define([], () => DashboardAlert);
} else {
  window.DashboardAlert = DashboardAlert;
}

// Auto-initialize if data attribute is present
document.addEventListener('DOMContentLoaded', () => {
  const alertElement = document.querySelector('[data-dashboard-alerts]');
  if (alertElement) {
    const config = JSON.parse(alertElement.dataset.dashboardAlerts || '{}');
    window.dashboardAlerts = new DashboardAlert(config);
  }
});         

combineAxisDomain                                    