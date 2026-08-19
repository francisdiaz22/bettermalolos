/**
 * Statistics Page - Enhanced Animations & Charts
 * Better Malolos Portal - Minimal Professional Design
 */

// Read chart colors from the global CSS palette rather than maintaining a page palette.
function getThemeColor(token) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

const COLORS = {
  primary: getThemeColor('--color-primary'),
  primaryDark: getThemeColor('--color-primary-dark'),
  secondary: getThemeColor('--color-secondary'),
  accent: getThemeColor('--color-accent'),
  success: getThemeColor('--color-success'),
  info: getThemeColor('--color-info'),
};

// Barangay population data (2024 POPCEN)
// Source: PSA PSGC, City of Malolos (PSGC code 0301410000)
const barangayData = [
  { name: 'Longos', pop: 17863 },
  { name: 'Mojon', pop: 16706 },
  { name: 'Bulihan', pop: 16224 },
  { name: 'Tikay', pop: 13359 },
  { name: 'Bangkal', pop: 12935 },
  { name: 'Look 1st', pop: 9937 },
  { name: 'Panasahan', pop: 9664 },
  { name: 'Sumapang Matanda', pop: 9166 },
  { name: 'Santor', pop: 8745 },
  { name: 'Pinagbakahan', pop: 7947 },
  { name: 'Caingin', pop: 7375 },
  { name: 'Dakila', pop: 7215 },
  { name: 'Santisima Trinidad', pop: 6797 },
  { name: 'Matimbo', pop: 6699 },
  { name: 'Ligas', pop: 6684 },
  { name: 'Santo Rosario', pop: 6509 },
  { name: 'Mabolo', pop: 6309 },
  { name: 'Barihan', pop: 5869 },
  { name: 'Caniogan', pop: 5297 },
  { name: 'San Pablo', pop: 5106 },
  { name: 'Bagna', pop: 4944 },
  { name: 'Lugam', pop: 4871 },
  { name: 'Atlag', pop: 4778 },
  { name: 'Cofradia', pop: 4725 },
  { name: 'Balayong', pop: 4618 },
  { name: 'San Juan', pop: 4618 },
  { name: 'Guinhawa', pop: 4335 },
  { name: 'Canalate', pop: 3710 },
  { name: 'Balite', pop: 3556 },
  { name: 'Look 2nd', pop: 3364 },
  { name: 'Bungahan', pop: 3354 },
  { name: 'Bagong Bayan', pop: 3206 },
  { name: 'Mambog', pop: 3101 },
  { name: 'Anilao', pop: 3019 },
  { name: 'Pamarawan', pop: 2741 },
  { name: 'Sumapang Bata', pop: 2577 },
  { name: 'San Vicente', pop: 2475 },
  { name: 'Catmon', pop: 2357 },
  { name: 'San Gabriel', pop: 2177 },
  { name: 'San Agustin', pop: 2072 },
  { name: 'Santo Cristo', pop: 2044 },
  { name: 'Taal', pop: 1799 },
  { name: 'Santiago', pop: 1786 },
  { name: 'Liang', pop: 1403 },
  { name: 'Calero', pop: 1347 },
  { name: 'Babatnin', pop: 1002 },
  { name: 'Masile', pop: 788 },
  { name: 'Niugan', pop: 781 },
  { name: 'Namayan', pop: 664 },
  { name: 'Santo Niño', pop: 661 },
  { name: 'Caliligawan', pop: 530 },
];

// City of Malolos census population (PSA, various census years)
const historicalData = {
  years: [1990, 1995, 2000, 2007, 2010, 2015, 2020, 2024],
  populations: [125178, 147414, 175291, 225244, 234945, 252074, 261189, 269809],
};

// Chart instances
let charts = {};

/**
 * Animate number counting
 */
function animateCount(element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * easeOut);

    element.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target.toLocaleString();
    }
  }

  requestAnimationFrame(update);
}

/**
 * Intersection Observer for scroll animations
 */
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => {
            entry.target.classList.add('visible');

            // Trigger count animation for metric cards
            const countEl = entry.target.querySelector('[data-count]');
            if (countEl) {
              const target = parseInt(countEl.dataset.count);
              animateCount(countEl, target);
            }

            // Animate bars
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
 * Animate progress bars within an element
 */
function animateBars(container) {
  // Breakdown bars
  container.querySelectorAll('.breakdown-segment').forEach((bar) => {
    const width = bar.dataset.width;
    if (width) {
      setTimeout(() => {
        bar.style.width = width + '%';
      }, 300);
    }
  });

  // Barangay bars
  container.querySelectorAll('.bar-wrap .bar').forEach((bar) => {
    const width = bar.dataset.width;
    if (width) {
      setTimeout(() => {
        bar.style.width = width + '%';
      }, 100);
    }
  });

  // Sector bars
  container.querySelectorAll('.sector-bar, .sc-fill').forEach((bar) => {
    const width = bar.dataset.width;
    if (width) {
      setTimeout(() => {
        bar.style.width = width + '%';
      }, 200);
    }
  });

  // Poverty bars
  container.querySelectorAll('.poverty-fill').forEach((bar) => {
    const width = bar.dataset.width;
    if (width) {
      setTimeout(() => {
        bar.style.width = width * 10 + '%';
      }, 300);
    }
  });
}

/**
 * Render the ranked barangay lists from the same data used by the charts.
 */
function renderBarangayLists() {
  const topList = document.getElementById('barangayTopList');
  const remainingList = document.getElementById('barangayRemainingList');
  if (!topList || !remainingList) return;

  const highestPopulation = barangayData[0].pop;

  const createRow = (barangay, index) => {
    const row = document.createElement('div');
    row.className = 'barangay-row';
    row.dataset.rank = String(index + 1);

    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = `#${index + 1}`;

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = barangay.name;

    const barWrap = document.createElement('div');
    barWrap.className = 'bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.dataset.width = ((barangay.pop / highestPopulation) * 100).toFixed(1);
    barWrap.appendChild(bar);

    const population = document.createElement('span');
    population.className = 'pop';
    population.textContent = barangay.pop.toLocaleString('en-PH');

    row.append(rank, name, barWrap, population);
    return row;
  };

  barangayData.forEach((barangay, index) => {
    const target = index < 10 ? topList : remainingList;
    target.appendChild(createRow(barangay, index));
  });
}

/**
 * Create Historical Line Chart
 */
function createHistoricalChart() {
  const ctx = document.getElementById('historicalLineChart');
  if (!ctx) return;

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(0, 50, 160, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 50, 160, 0)');

  charts.historical = new Chart(ctx, {
    type: 'line',
    data: {
      labels: historicalData.years,
      datasets: [
        {
          label: 'Population',
          data: historicalData.populations,
          borderColor: COLORS.primary,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: COLORS.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointHoverBorderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 2000,
        easing: 'easeOutQuart',
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 50, 160, 0.95)',
          titleFont: { size: 14, weight: '600' },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `Population: ${ctx.raw.toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 12 } },
        },
        y: {
          beginAtZero: false,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { size: 12 },
            callback: (v) => v / 1000 + 'K',
          },
        },
      },
    },
  });
}

/**
 * Create Distribution Pie Chart
 */
function createDistributionChart() {
  const ctx = document.getElementById('distributionPieChart');
  if (!ctx) return;

  const top10 = barangayData.slice(0, 10);
  const otherPopulation = barangayData
    .slice(10)
    .reduce((total, barangay) => total + barangay.pop, 0);
  const distributionData = [...top10, { name: 'Other 41 barangays', pop: otherPopulation }];
  const colors = [
    COLORS.primary,
    COLORS.accent,
    COLORS.success,
    COLORS.info,
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F59E0B',
    '#6366F1',
    COLORS.secondary,
    '#94A3B8',
  ];

  charts.distribution = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: distributionData.map((d) => d.name),
      datasets: [
        {
          data: distributionData.map((d) => d.pop),
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 3,
          hoverBorderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: 'easeOutQuart',
      },
      cutout: '55%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 14,
            padding: 12,
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
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return `${ctx.raw.toLocaleString()} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Create Population Bar Chart
 */
function createBarChart() {
  const ctx = document.getElementById('populationBarChart');
  if (!ctx) return;

  const sorted = [...barangayData].sort((a, b) => b.pop - a.pop);

  charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map((d) => d.name),
      datasets: [
        {
          label: 'Population',
          data: sorted.map((d) => d.pop),
          backgroundColor: sorted.map((_, i) => {
            const opacity = Math.max(0.25, 1 - i * 0.015);
            return `rgba(0, 50, 160, ${opacity})`;
          }),
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1500,
        easing: 'easeOutQuart',
        delay: (ctx) => ctx.dataIndex * 50,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 50, 160, 0.95)',
          titleFont: { size: 14, weight: '600' },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (ctx) => `Population: ${ctx.raw.toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { size: 11 },
            callback: (v) => v.toLocaleString(),
          },
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
      },
    },
  });
}

/**
 * Initialize all charts with lazy loading
 */
function initCharts() {
  const chartObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const chartId = entry.target.id;

          if (chartId === 'historicalLineChart' && !charts.historical) {
            createHistoricalChart();
          } else if (chartId === 'distributionPieChart' && !charts.distribution) {
            createDistributionChart();
          } else if (chartId === 'populationBarChart' && !charts.bar) {
            createBarChart();
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

/**
 * Initialize economy section counters
 */
function initEconomyCounters() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const countEl = entry.target.querySelector('[data-count]');
          if (countEl) {
            const target = parseInt(countEl.dataset.count);
            animateCount(countEl, target, 1500);
          }
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll('.economy-card').forEach((card) => {
    observer.observe(card);
  });
}

/**
 * CMCI (Competitive Index) Data
 */
const cmciData = {
  years: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
  overall: {
    scores: [29.27, 38.16, 36.98, 32.07, 43.08, 38.38, 36.72, 39.62, 41.43],
    ranks: [82, 68, 104, 107, 33, 29, 38, 27, 28],
  },
  pillars: {
    economicDynamism: {
      label: 'Economic Dynamism',
      scores: [8.6149, 5.2478, 4.4756, 4.896, 6.8844, 7.005, 4.9146, 4.0515, 3.409],
      ranks: [63, 49, 90, 56, 36, 24, 32, 39, 87],
    },
    governmentEfficiency: {
      label: 'Government Efficiency',
      scores: [9.8593, 8.4357, 9.0068, 8.6344, 10.6755, 10.0308, 9.3361, 9.8032, 11.3715],
      ranks: [91, 102, 108, 98, 43, 43, 45, 36, 17],
    },
    infrastructure: {
      label: 'Infrastructure',
      scores: [10.7959, 7.8156, 8.0545, 7.6722, 7.876, 7.7326, 5.3883, 5.5482, 5.6172],
      ranks: [41, 44, 52, 33, 28, 31, 20, 27, 20],
    },
    resiliency: {
      label: 'Resiliency',
      scores: [null, 16.663, 15.4399, 10.8638, 17.6427, 13.613, 11.6349, 11.5328, 12.1106],
      ranks: [null, 30, 108, 110, 23, 52, 28, 53, 19],
    },
    innovation: {
      label: 'Innovation',
      scores: [null, null, null, null, null, null, 5.4465, 8.6849, 8.9204],
      ranks: [null, null, null, null, null, null, 63, 18, 17],
    },
  },
};

/**
 * Create CMCI Overview Chart
 */
function createCMCIOverviewChart() {
  const ctx = document.getElementById('cmciOverviewChart');
  if (!ctx || charts.cmciOverview) return;

  charts.cmciOverview = new Chart(ctx, {
    type: 'line',
    data: {
      labels: cmciData.years,
      datasets: [
        {
          label: 'Overall Score',
          data: cmciData.overall.scores,
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primary + '18',
          yAxisID: 'yScore',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
        },
        {
          label: 'Component-City Rank',
          data: cmciData.overall.ranks,
          borderColor: COLORS.accent,
          backgroundColor: COLORS.accent + '20',
          yAxisID: 'yRank',
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          borderDash: [6, 4],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1500, easing: 'easeOutQuart' },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 16, font: { size: 11 }, usePointStyle: true },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 50, 160, 0.95)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) =>
              ctx.dataset.yAxisID === 'yRank'
                ? `${ctx.dataset.label}: #${ctx.raw}`
                : `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        yScore: {
          position: 'left',
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 11 }, color: COLORS.primary },
          title: { display: true, text: 'Score' },
        },
        yRank: {
          position: 'right',
          reverse: true,
          beginAtZero: false,
          grid: { drawOnChartArea: false },
          ticks: { precision: 0, font: { size: 11 }, color: COLORS.accent },
          title: { display: true, text: 'Rank (lower is better)' },
        },
      },
    },
  });
}

/**
 * Create CMCI Pillar Chart
 */
function createCMCIPillarChart(pillarKey, canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || charts[canvasId]) return;

  const pillarData = cmciData.pillars[pillarKey];
  if (!pillarData) return;

  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: cmciData.years,
      datasets: [
        {
          label: `${pillarData.label} Score`,
          data: pillarData.scores,
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primary + '18',
          fill: true,
          spanGaps: false,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeOutQuart' },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, padding: 12, font: { size: 10 }, usePointStyle: true },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 50, 160, 0.95)',
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: (ctx) =>
              ctx.raw !== null
                ? `${ctx.dataset.label}: ${ctx.raw.toFixed(4)}`
                : `${ctx.dataset.label}: Not yet a CMCI pillar`,
            afterLabel: (ctx) => {
              const rank = pillarData.ranks[ctx.dataIndex];
              return rank !== null ? `Rank: #${rank}` : '';
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 10 } },
        },
      },
    },
  });
}

/**
 * Initialize CMCI Tab Navigation
 */
function initCMCITabs() {
  const tabs = document.querySelectorAll('.cmci-tab');
  const panels = document.querySelectorAll('.cmci-panel');

  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const pillar = tab.dataset.pillar;

      // Update active tab
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active panel
      panels.forEach((p) => p.classList.remove('active'));
      const activePanel = document.getElementById(`panel-${pillar}`);
      if (activePanel) {
        activePanel.classList.add('active');

        // Create chart for this panel if needed
        if (pillar === 'overview') {
          createCMCIOverviewChart();
        } else if (pillar === 'economic-dynamism') {
          createCMCIPillarChart('economicDynamism', 'cmciEconomicChart');
        } else if (pillar === 'government-efficiency') {
          createCMCIPillarChart('governmentEfficiency', 'cmciGovernmentChart');
        } else if (pillar === 'infrastructure') {
          createCMCIPillarChart('infrastructure', 'cmciInfraChart');
        } else if (pillar === 'resiliency') {
          createCMCIPillarChart('resiliency', 'cmciResiliencyChart');
        } else if (pillar === 'innovation') {
          createCMCIPillarChart('innovation', 'cmciInnovationChart');
        }

        // Animate indicator bars
        animateCMCIBars(activePanel);
      }
    });
  });
}

/**
 * Animate CMCI indicator bars
 */
function animateCMCIBars(container) {
  container.querySelectorAll('.indicator-fill').forEach((bar) => {
    const value = bar.dataset.value;
    if (value) {
      setTimeout(() => {
        bar.style.setProperty('--fill-width', value + '%');
        bar.classList.add('animated');
      }, 100);
    }
  });
}

/**
 * Initialize CMCI Section
 */
function initCMCISection() {
  const cmciSection = document.getElementById('competitive-index');
  if (!cmciSection) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          initCMCITabs();
          createCMCIOverviewChart();
          animateCMCIBars(document.getElementById('panel-overview'));
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(cmciSection);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderBarangayLists();
  initScrollAnimations();
  initCharts();
  initEconomyCounters();
  initCMCISection();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    barangayData,
    historicalData,
    cmciData,
    COLORS,
    animateCount,
  };
}
