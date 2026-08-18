/* Better Solano - Resolution Table JavaScript */

/**
 * Fetches resolution data from the JSON file
 * @returns {Promise<Array>} Array of resolution objects
 */
async function fetchResolutions() {
  try {
    const response = await fetch('../data/resolutions.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.resolutions || [];
  } catch (error) {
    console.error('Error fetching resolutions:', error);
    return [];
  }
}

/**
 * Extracts the year segment from a resolution number
 * Resolution format: "XXX-YYYY-SS" (sequence-year-session)
 * @param {string} resolutionNo - Resolution number (e.g., "246-2025-11")
 * @returns {number} The year (e.g., 2025)
 */
function getResolutionYear(resolutionNo) {
  return parseInt(resolutionNo.split('-')[1], 10);
}

/**
 * Sorts resolutions by year, then sequence number, in descending order (newest first)
 * Resolution format: "XXX-YYYY-SS" (sequence-year-session)
 * @param {Array} resolutions - Array of resolution objects
 * @returns {Array} Sorted array of resolutions
 */
function sortResolutionsByNumber(resolutions) {
  return [...resolutions].sort((a, b) => {
    const [numA, yearA] = a.resolutionNo.split('-');
    const [numB, yearB] = b.resolutionNo.split('-');
    if (yearA !== yearB) {
      return parseInt(yearB, 10) - parseInt(yearA, 10);
    }
    return parseInt(numB, 10) - parseInt(numA, 10);
  });
}

/**
 * Formats resolution number for display
 * @param {string} resolutionNo - Resolution number (e.g., "2025-001")
 * @returns {string} Resolution number as-is
 */
function formatResolutionNo(resolutionNo) {
  return resolutionNo;
}

/**
 * Formats session date for display
 * @param {string} dateString - ISO date string (e.g., "2025-01-06")
 * @returns {string} Formatted date (e.g., "January 6, 2025")
 */
function formatSessionDate(dateString) {
  try {
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.warn('Invalid date format:', dateString);
    return dateString;
  }
}

/**
 * Renders a resolution table to the DOM
 * @param {Array} resolutions - Array of resolution objects
 * @param {string} tableBodyId - The id of the tbody element to populate
 * @param {number} year - The year represented by this table (for the empty-state message)
 */
function renderResolutionTable(resolutions, tableBodyId, year) {
  const tableBody = document.getElementById(tableBodyId);

  if (!tableBody) {
    console.error('Resolution table body element not found:', tableBodyId);
    return;
  }

  // Clear existing content
  tableBody.innerHTML = '';

  // Handle empty data
  if (!resolutions || resolutions.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
            <td colspan="3" class="text-center text-muted">
                No resolutions found for ${year}
            </td>
        `;
    tableBody.appendChild(emptyRow);
    return;
  }

  // Render each resolution
  resolutions.forEach((resolution) => {
    // Skip invalid records
    if (!resolution.resolutionNo || !resolution.title || !resolution.sessionDate) {
      console.warn('Skipping invalid resolution record:', resolution);
      return;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
            <td data-label="Resolution">${formatResolutionNo(resolution.resolutionNo)}</td>
            <td data-label="Title">${resolution.title}</td>
            <td data-label="Session Date">${formatSessionDate(resolution.sessionDate)}</td>
        `;
    tableBody.appendChild(row);
  });
}

/**
 * Main initialization function for the resolution table
 */
async function initResolutionTable() {
  try {
    const resolutions = await fetchResolutions();
    const sortedResolutions = sortResolutionsByNumber(resolutions);

    const resolutions2026 = sortedResolutions.filter(
      (resolution) => getResolutionYear(resolution.resolutionNo) === 2026
    );
    const resolutions2025 = sortedResolutions.filter(
      (resolution) => getResolutionYear(resolution.resolutionNo) === 2025
    );

    renderResolutionTable(resolutions2026, 'resolution-table-body-2026', 2026);
    renderResolutionTable(resolutions2025, 'resolution-table-body', 2025);
  } catch (error) {
    console.error('Error initializing resolution table:', error);
    ['resolution-table-body-2026', 'resolution-table-body'].forEach((id) => {
      const tableBody = document.getElementById(id);
      if (tableBody) {
        tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted">
                        Unable to load resolutions. Please try again later.
                    </td>
                </tr>
            `;
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initResolutionTable);

// Export functions for testing (if module system is available)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchResolutions,
    getResolutionYear,
    sortResolutionsByNumber,
    formatResolutionNo,
    formatSessionDate,
    renderResolutionTable,
    initResolutionTable,
  };
}
