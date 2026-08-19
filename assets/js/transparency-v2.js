/**
 * Transparency Page V2 - Interactive Financial Dashboard
 * Modern, minimal design with smooth animations
 */

// FY 2025 actual data from DBM/BLGF Table F.14 (in million pesos).
// Source: https://www.dbm.gov.ph/wp-content/uploads/BESF/BESF2026/F14.pdf
const FINANCIAL_DATA = {
  fy2025: {
    period: 'FY 2025',
    periodLabel: 'Jan - Dec',
    receipts: {
      local: 633.56,
      external: 1198.22,
      nonIncome: 5.79,
      total: 1837.57,
    },
    expenditures: {
      gps: 1036.29,
      social: 343.77,
      economic: 149.77,
      debtAndNonOperating: 277.39,
      total: 1807.22,
    },
    receiptsLessExpenditures: 30.35,
    endingCashBalance: 573.72,
  },
};

// Chart instances
let incomeChart = null;
let expenditureChart = null;
let currentPeriod = 'fy2025';

/**
 * Format number as Philippine Peso in millions
 */
function formatPeso(value) {
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} M`;
}

/**
 * Calculate percentage
 */
function calcPercent(value, total) {
  return ((value / total) * 100).toFixed(1) + '%';
}

/**
 * Animate value change
 */
function animateValue(element, newValue) {
  element.classList.add('updating');
  setTimeout(() => {
    element.textContent = newValue;
    element.classList.remove('updating');
  }, 150);
}

/**
 * Update all displayed values for the selected reporting period
 */
function updateDisplay(period) {
  const data = FINANCIAL_DATA[period];

  // Update metrics
  animateValue(document.getElementById('sre-total-receipts'), formatPeso(data.receipts.total));
  animateValue(document.getElementById('sre-total-expense'), formatPeso(data.expenditures.total));
  animateValue(
    document.getElementById('sre-receipts-less-expenditures'),
    formatPeso(data.receiptsLessExpenditures)
  );
  animateValue(
    document.getElementById('sre-ending-cash-balance'),
    formatPeso(data.endingCashBalance)
  );

  // Update receipt breakdown
  const receiptsTotal = data.receipts.total;
  document.getElementById('sre-income-local').textContent = formatPeso(data.receipts.local);
  document.getElementById('sre-income-local-pct').textContent = calcPercent(
    data.receipts.local,
    receiptsTotal
  );
  document.getElementById('sre-income-external').textContent = formatPeso(data.receipts.external);
  document.getElementById('sre-income-external-pct').textContent = calcPercent(
    data.receipts.external,
    receiptsTotal
  );
  document.getElementById('sre-income-nonincome').textContent = formatPeso(
    data.receipts.nonIncome
  );
  document.getElementById('sre-income-nonincome-pct').textContent = calcPercent(
    data.receipts.nonIncome,
    receiptsTotal
  );

  // Update expenditure breakdown
  const expTotal = data.expenditures.total;
  document.getElementById('sre-exp-gps').textContent = formatPeso(data.expenditures.gps);
  document.getElementById('sre-exp-gps-pct').textContent = calcPercent(
    data.expenditures.gps,
    expTotal
  );
  document.getElementById('sre-exp-social').textContent = formatPeso(data.expenditures.social);
  document.getElementById('sre-exp-social-pct').textContent = calcPercent(
    data.expenditures.social,
    expTotal
  );
  document.getElementById('sre-exp-economic').textContent = formatPeso(data.expenditures.economic);
  document.getElementById('sre-exp-economic-pct').textContent = calcPercent(
    data.expenditures.economic,
    expTotal
  );
  document.getElementById('sre-exp-debt').textContent = formatPeso(
    data.expenditures.debtAndNonOperating
  );
  document.getElementById('sre-exp-debt-pct').textContent = calcPercent(
    data.expenditures.debtAndNonOperating,
    expTotal
  );

  // Update charts
  if (incomeChart) {
    incomeChart.data.datasets[0].data = [
      data.receipts.local,
      data.receipts.external,
      data.receipts.nonIncome,
    ];
    incomeChart.update('active');
  }

  if (expenditureChart) {
    expenditureChart.data.datasets[0].data = [
      data.expenditures.gps,
      data.expenditures.social,
      data.expenditures.economic,
      data.expenditures.debtAndNonOperating,
    ];
    expenditureChart.update('active');
  }
}

/**
 * Initialize charts with Chart.js
 */
function initCharts() {
  const incomeCtx = document.getElementById('incomeChartV2');
  const expenditureCtx = document.getElementById('expenditureChartV2');

  if (!incomeCtx || !expenditureCtx || typeof Chart === 'undefined') return;

  const data = FINANCIAL_DATA[currentPeriod];

  // Chart.js default options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    layout: {
      padding: 4,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            return `₱${context.raw.toFixed(2)} M`;
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 600,
      easing: 'easeOutQuart',
    },
  };

  // Income Chart
  incomeChart = new Chart(incomeCtx, {
    type: 'doughnut',
    data: {
      labels: ['Local Sources', 'External Sources', 'Non-Income Receipts'],
      datasets: [
        {
          data: [data.receipts.local, data.receipts.external, data.receipts.nonIncome],
          backgroundColor: ['#10b981', '#0ea5e9', '#64748b'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 0,
          hoverBorderWidth: 3,
          hoverBorderColor: '#ffffff',
        },
      ],
    },
    options: chartOptions,
  });

  // Store original colors for highlight/restore
  incomeChart._originalColors = ['#10b981', '#0ea5e9', '#64748b'];

  // Expenditure Chart
  expenditureChart = new Chart(expenditureCtx, {
    type: 'doughnut',
    data: {
      labels: [
        'General Public Services',
        'Social Services',
        'Economic Services',
        'Debt & Other Non-Operating',
      ],
      datasets: [
        {
          data: [
            data.expenditures.gps,
            data.expenditures.social,
            data.expenditures.economic,
            data.expenditures.debtAndNonOperating,
          ],
          backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 0,
          hoverBorderWidth: 3,
          hoverBorderColor: '#ffffff',
        },
      ],
    },
    options: chartOptions,
  });

  // Store original colors for highlight/restore
  expenditureChart._originalColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
}

/**
 * Initialize reporting-period buttons
 */
function initPeriodToggle() {
  const buttons = document.querySelectorAll('.sre-period-btn');

  buttons.forEach((btn) => {
    btn.addEventListener('click', function () {
      const period = this.dataset.period;
      if (period === currentPeriod) return;

      // Update button states
      buttons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');

      // Update data
      currentPeriod = period;
      updateDisplay(period);
    });
  });
}

/**
 * Initialize scroll animations
 */
function initScrollAnimations() {
  if (typeof IntersectionObserver === 'undefined') {
    // Fallback: show all elements
    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      el.classList.add('visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    observer.observe(el);
  });
}

/**
 * Initialize breakdown item hover effects
 */
function initBreakdownInteractions() {
  const items = document.querySelectorAll('.sre-breakdown-item');

  items.forEach((item) => {
    item.addEventListener('mouseenter', function () {
      const type = this.dataset.type;
      highlightChartSegment(type, true);
    });

    item.addEventListener('mouseleave', function () {
      const type = this.dataset.type;
      highlightChartSegment(type, false);
    });
  });
}

/**
 * Highlight chart segment on hover
 */
function highlightChartSegment(type, highlight) {
  const incomeTypes = ['local', 'external', 'nonincome'];
  const expTypes = ['gps', 'social', 'economic', 'debt'];

  let chart = null;
  let index = -1;

  if (incomeTypes.includes(type)) {
    chart = incomeChart;
    index = incomeTypes.indexOf(type);
  } else if (expTypes.includes(type)) {
    chart = expenditureChart;
    index = expTypes.indexOf(type);
  }

  if (chart && index >= 0) {
    const dataset = chart.data.datasets[0];
    const numSegments = dataset.data.length;

    if (highlight) {
      // Dim other segments instead of displacing the hovered one
      const dimmedColors = dataset.backgroundColor.map((color, i) => {
        if (i === index) return color;
        // Add transparency to non-hovered segments
        return color + '40';
      });
      dataset.hoverBackgroundColor = dimmedColors;
      dataset.backgroundColor = dimmedColors;
      dataset.backgroundColor[index] = chart._originalColors[index];
    } else {
      // Restore all segments to original colors
      dataset.backgroundColor = [...chart._originalColors];
      dataset.hoverBackgroundColor = [...chart._originalColors];
    }
    chart.update('none');
  }
}

/**
 * Initialize the page
 */
function init() {
  initPeriodToggle();
  initCharts();
  initScrollAnimations();
  initBreakdownInteractions();
}

// Run when DOM is ready
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FINANCIAL_DATA, formatPeso, calcPercent };
}

// DPWH Table Filter
document.addEventListener('DOMContentLoaded', function () {
  const filterBtns = document.querySelectorAll('.dpwh-filter-btn');
  const tableRows = document.querySelectorAll('.dpwh-table tbody tr');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      const filter = this.dataset.filter;

      filterBtns.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');

      tableRows.forEach((row) => {
        if (filter === 'all' || row.dataset.category === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });
});
