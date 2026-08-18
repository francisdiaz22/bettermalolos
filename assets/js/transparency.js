/**
 * Transparency Page - Charts & Animations
 * Better Malolos Portal
 */

// Read brand colors from the global CSS palette so charts stay in sync with the site.
function getThemeColor(token) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

const COLORS = {
  primary: getThemeColor('--color-primary'),
  secondary: getThemeColor('--color-secondary'),
  success: getThemeColor('--color-success'),
  danger: getThemeColor('--color-danger'),
  info: getThemeColor('--color-info'),
  accent: getThemeColor('--color-accent'),
};

// Chart instances
let charts = {};

/**
 * Initialize scroll animations
 */
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => {
            entry.target.classList.add('visible');
            animateBars(entry.target);
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  document.querySelectorAll('.animate-on-scroll, .metric-card').forEach((el) => {
    observer.observe(el);
  });
}

/**
 * Animate progress bars
 */
function animateBars(container) {
  container.querySelectorAll('.expenditure-fill').forEach((bar) => {
    const width = bar.dataset.width;
    if (width) {
      setTimeout(() => {
        bar.style.width = width + '%';
      }, 200);
    }
  });
}

/**
 * Create Income Doughnut Chart
 */
function createIncomeChart() {
  const ctx = document.getElementById('incomeChart');
  if (!ctx) return;

  charts.income = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Local Sources', 'External Sources (IRA)'],
      datasets: [
        {
          data: [149.81, 221.52],
          backgroundColor: [COLORS.success, COLORS.info],
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 14,
            padding: 16,
            font: { size: 12 },
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 50, 160, 0.95)',
          titleFont: { size: 14, weight: '600' },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function (ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return `₱${ctx.raw}M (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Create Expenditure Doughnut Chart
 */
function createExpenditureChart() {
  const ctx = document.getElementById('expenditureChart');
  if (!ctx) return;

  charts.expenditure = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['General Public Services', 'Social Services', 'Economic Services', 'Debt Service'],
      datasets: [
        {
          data: [172.28, 50.81, 37.95, 1.63],
          backgroundColor: [COLORS.primary, COLORS.success, COLORS.accent, COLORS.info],
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 14,
            padding: 12,
            font: { size: 11 },
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 50, 160, 0.95)',
          titleFont: { size: 14, weight: '600' },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function (ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return `₱${ctx.raw}M (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Initialize charts with lazy loading
 */
function initCharts() {
  const chartObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const chartId = entry.target.id;

          if (chartId === 'incomeChart' && !charts.income) {
            createIncomeChart();
          } else if (chartId === 'expenditureChart' && !charts.expenditure) {
            createExpenditureChart();
          }

          chartObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('canvas').forEach((canvas) => {
    chartObserver.observe(canvas);
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initCharts();
});
