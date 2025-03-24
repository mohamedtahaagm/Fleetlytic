// Import required variables and functions
import { vehicles, fuelRecords, currentUser, API_URL, openModal, closeModal, showNotification, charts, drivers } from './script.js';

// Chart instances
let fuelConsumptionChart = null;
let fuelCostChart = null;
let fuelTypeChart = null;
let vehiclePerformanceChart = null;
let driverEfficiencyChart = null;
let vehicleEfficiencyChart = null; // New chart instance
let branchPerformanceChart = null; // New chart for branch performance comparison
let costReadingDifferenceChart = null; // New chart instance for Cost and Reading Difference
let costPerKilometerChart = null; // New chart instance for Cost per Kilometer
let monthlyConsumptionChart = null; // New chart instance for Monthly Consumption
let pumpReadingDifferencesChart = null; // New chart instance for Pump Reading Differences

// Initialize fuel page
export function initializeFuelPage() {
    console.log('Initializing fuel page');
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Loading script dynamically...');
        loadChartJS().then(() => {
            initializeFuelTable();
            // We'll call renderFuelDashboard directly inside initializeFuelTable
            // to ensure dashboard is rendered after the UI is ready
        }).catch(error => {
            console.error('Failed to load Chart.js:', error);
            initializeFuelTable(); // At least render the table
        });
    } else {
        initializeFuelTable();
        // We'll call renderFuelDashboard directly inside initializeFuelTable
    }
}

// Improved function to automatically apply default filters on page load
function applyDefaultFilters() {
    console.log('Applying default filters: Date Range = Last 30 Days');
    
    // Set the default date range to "Last 30 Days"
    const dateRangeSelect = document.getElementById('fuel-date-range');
    if (dateRangeSelect) {
        dateRangeSelect.value = '30'; // Select "Last 30 Days"
        
        // Hide custom date range inputs
        const customDateRange = document.getElementById('custom-date-range');
        if (customDateRange) {
            customDateRange.style.display = 'none';
        }
        
        // Get the filtered data based on the default 30-day filter
        const filteredData = getFilteredFuelData();
        
        // Update stats and render charts with this data
        console.log('Automatically rendering dashboard with filtered data:', filteredData.length, 'records');
        updateFuelStats(filteredData);
        renderFuelCharts(filteredData);
        
        // Also render the branch performance chart with default metric (consumption)
        renderBranchPerformanceChart(filteredData, 'consumption');
    } else {
        console.error('Cannot find date range selector element');
    }
}

// Dynamically load Chart.js if not available
function loadChartJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Render fuel table
export function renderFuelTable() {
    const tableBody = document.querySelector('#fuel-page .fuel-records-table tbody');
    if (!tableBody) {
        initializeFuelTable();
        return;
    }

    // Filter records by manager
    let filteredRecords = fuelRecords;
    if (currentUser.role === 'manager') {
        const managerVehicles = vehicles.filter(v => v.manager === currentUser.id).map(v => v.id);
        filteredRecords = fuelRecords.filter(f => managerVehicles.includes(f.vehicle));
    }

    // Create table rows
    tableBody.innerHTML = filteredRecords.length ? 
        filteredRecords.map(createFuelRow).join('') :
        '<tr><td colspan="8" class="text-center">No fuel records found</td></tr>';

    // Add event listeners to buttons
    addFuelActionListeners();
}

// Initialize fuel table - updated to remove the fuel type distribution chart and update currency
function initializeFuelTable() {
    const fuelPage = document.getElementById('fuel-page');
    if (!fuelPage) return;

    // Create HTML for the fuel page with dashboard and table
    let fuelPageContent = `
        <div id="fuel-dashboard-container" class="fuel-dashboard-container">
            <h3 class="section-title">Fuel Dashboard</h3>
            <div class="dashboard-controls">
                <!-- Add search box at the top of filters -->
                <div class="filter-group search-filter">
                    <label for="fuel-search">Search</label>
                    <div class="search-input-container">
                        <input type="text" id="fuel-search" placeholder="Search vehicle, driver, or branch...">
                        <button id="clear-search" class="search-clear-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="filter-group">
                    <label for="fuel-date-range">Date Range</label>
                    <select id="fuel-date-range">
                        <option value="7">Last 7 Days</option>
                        <option value="30" selected>Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last Year</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>
                <div class="filter-group" id="custom-date-range" style="display: none;">
                    <div class="date-range-inputs">
                        <div>
                            <label for="fuel-date-from">From</label>
                            <input type="date" id="fuel-date-from">
                        </div>
                        <div>
                            <label for="fuel-date-to">To</label>
                            <input type="date" id="fuel-date-to">
                        </div>
                    </div>
                </div>
                <div class="filter-group">
                    <label for="fuel-vehicle-filter">Vehicle</label>
                    <select id="fuel-vehicle-filter">
                        <option value="all">All Vehicles</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="driver-filter">Driver</label>
                    <select id="driver-filter">
                        <option value="">All Drivers</option>
                        <!-- Driver options will be populated dynamically -->
                    </select>
                </div>
                <div class="filter-group">
                    <label for="branch-filter">Branch</label>
                    <select id="branch-filter">
                        <option value="">All Branches</option>
                        <!-- Branch options will be populated dynamically -->
                    </select>
                </div>
                <button id="apply-fuel-filters" class="btn btn-primary">
                    <i class="fas fa-filter"></i> Apply Filters
                </button>
            </div>
            
            <!-- Moving stat cards to top of page before charts -->
            <div class="fuel-stats">
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-gas-pump"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Fuel</h3>
                        <p id="total-fuel-stat">0 L</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-route"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Distance</h3>
                        <p id="total-distance-stat">0 Km</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Cost</h3>
                        <p id="total-cost-stat">EGP 0</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">
                        <i class="fas fa-tachometer-alt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Avg. Consumption</h3>
                        <p id="avg-consumption-stat">0 Km/L</p>
                    </div>
                </div>
            </div>
            
            <!-- Modified Cost and Reading Difference Tracking Chart - removed vehicle selector -->
            <div class="chart-container full-width" style="margin-bottom: 1.5rem;">
                <div class="chart-header">
                    <h4>Cost and Reading Difference Tracking</h4>
                    <div class="chart-actions">
                        <button class="btn-chart-view active" data-chart="cost-reading" data-view="cost">Cost View</button>
                        <button class="btn-chart-view" data-chart="cost-reading" data-view="reading">Reading Difference</button>
                    </div>
                </div>
                <canvas id="cost-reading-chart"></canvas>
            </div>
            
            <!-- NEW: Add Monthly Fuel Consumption per Vehicle Chart -->
            <div class="chart-container full-width" style="margin-bottom: 1.5rem;">
                <div class="chart-header">
                    <h4>Average Monthly Fuel Consumption per Vehicle</h4>
                    <div class="chart-actions">
                        <div class="vehicle-selector-wrapper" style="margin-right: 15px;">
                            <select id="monthly-consumption-vehicle-selector" class="chart-vehicle-selector">
                                <option value="compare">Compare Top Vehicles</option>
                                <!-- Vehicle options will be populated dynamically -->
                            </select>
                        </div>
                        <button class="btn-chart-view active" data-chart="monthly-consumption" data-view="quantity">Fuel Quantity (L)</button>
                        <button class="btn-chart-view" data-chart="monthly-consumption" data-view="consumption">Efficiency (Km/L)</button>
                    </div>
                </div>
                <canvas id="monthly-consumption-chart"></canvas>
            </div>
            
            <!-- NEW: Add Fuel Cost per Kilometer Chart -->
            <div class="chart-container full-width" style="margin-bottom: 1.5rem;">
                <div class="chart-header">
                    <h4>Fuel Cost per Kilometer</h4>
                    <div class="chart-actions">
                        <button class="btn-chart-view active" data-chart="cost-per-km" data-view="vehicles">By Vehicle</button>
                        <button class="btn-chart-view" data-chart="cost-per-km" data-view="branches">By Branch</button>
                    </div>
                </div>
                <canvas id="cost-per-km-chart"></canvas>
            </div>
            
            <!-- Pump Reading Differences Chart -->
            <div class="chart-container full-width" style="margin-bottom: 1.5rem;">
                <div class="chart-header">
                    <h4>Pump Reading Differences</h4>
                </div>
                <canvas id="pump-reading-differences-chart"></canvas>
            </div>
            
            <div class="dashboard-charts">
                <!-- Main consumption trend chart (full width) -->
                <div class="chart-container full-width">
                    <div class="chart-header">
                        <h4>Fuel Consumption Trend</h4>
                        <div class="chart-actions">
                            <button class="btn-chart-view active" data-chart="consumption" data-view="weekly">Weekly</button>
                            <button class="btn-chart-view" data-chart="consumption" data-view="monthly">Monthly</button>
                        </div>
                    </div>
                    <canvas id="fuel-consumption-chart"></canvas>
                </div>
                
                <!-- NEW: Fuel Performance Comparison Between Branches (full width) -->
                <div class="chart-container full-width">
                    <div class="chart-header">
                        <h4>Fuel Performance Comparison Between Branches</h4>
                        <div class="chart-actions">
                            <button class="btn-branch-comparison active" data-metric="consumption">Consumption (Km/L)</button>
                            <button class="btn-branch-comparison" data-metric="cost">Cost Efficiency (EGP/Km)</button>
                        </div>
                    </div>
                    <canvas id="branch-performance-chart"></canvas>
                </div>
                
                <!-- Add new Driver Efficiency Comparison chart (full width) -->
                <div class="chart-container full-width">
                    <div class="chart-header">
                        <h4>Comparison of Fuel Efficiency Among Drivers</h4>
                    </div>
                    <canvas id="driver-efficiency-chart"></canvas>
                </div>
                
                <!-- NEW: Vehicle Efficiency Comparison chart (full width) -->
                <div class="chart-container full-width">
                    <div class="chart-header">
                        <h4>Comparison of Fuel Efficiency Among Vehicles</h4>
                    </div>
                    <canvas id="vehicle-efficiency-chart"></canvas>
                </div>
                
                <!-- NEW: Best & Worst Fuel Efficiency Vehicles Ranking Table -->
                <div class="chart-container full-width" style="margin-bottom: 1.5rem;">
                    <div class="chart-header">
                        <h4>Best & Worst Fuel Efficiency Vehicles</h4>
                        <div class="chart-actions">
                            <button class="btn-chart-view active" data-chart="efficiency-ranking" data-view="all">All Vehicles</button>
                            <button class="btn-chart-view" data-chart="efficiency-ranking" data-view="best">Best Performers</button>
                            <button class="btn-chart-view" data-chart="efficiency-ranking" data-view="worst">Worst Performers</button>
                        </div>
                    </div>
                    <div id="fuel-efficiency-ranking-table" class="ranking-table-container"></div>
                </div>
            </div>
        </div>

        <div class="page-header">
            <h3 class="section-title">Fuel Records</h3>
            <div class="header-actions">
                <button id="toggle-fuel-table-btn" class="btn btn-secondary">
                    <i class="fas fa-eye-slash"></i> <span>Show Records</span>
                </button>
                <button id="add-fuel-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add Fuel Record
                </button>
            </div>
        </div>
        <div class="table-responsive" id="fuel-table-container" style="display: none;">
            <table class="fuel-records-table">
                <thead>
                    <tr>
                        <th>Vehicle</th>
                        <th>Date</th>
                        <th>Driver</th>
                        <th>Fuel Type</th>
                        <th>Quantity (L)</th>
                        <th>Cost (EGP)</th>
                        <th>Distance (Km)</th>
                        <th>Consumption (Km/L)</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;
    
    fuelPage.innerHTML = fuelPageContent;
    
    // Apply uniform dimensions and spacing to all chart canvases
    setTimeout(() => {
        const canvases = document.querySelectorAll('#fuel-page canvas');
        canvases.forEach(canvas => {
            const container = canvas.closest('.chart-container');
            if (container.classList.contains('full-width')) {
                canvas.style.height = '400px';
                canvas.style.maxHeight = '400px';
            } else {
                canvas.style.height = '300px';
                canvas.style.maxHeight = '300px';
            }
        });

        // Add consistent spacing between all chart containers
        const chartContainers = document.querySelectorAll('#fuel-page .chart-container');
        chartContainers.forEach(container => {
            container.style.marginBottom = '1.5rem';
        });
        
        // Initialize event listeners for filters
        initializeFuelDashboardFilters();
        
        // Initialize search functionality
        initializeSearchFunctionality();
        
        // Add event listeners for branch comparison chart toggle buttons
        initializeBranchComparisonToggle();
        
        // Setup fuel table toggle button
        initializeFuelTableToggle();
        
        // Render table
        renderFuelTable();
        
        // Apply default filters and render charts AFTER all UI is initialized
        // This ensures that all elements are ready when we try to update them
        setTimeout(() => {
            applyDefaultFilters();
        }, 100);
    }, 100);
}

// Initialize branch comparison toggle buttons
function initializeBranchComparisonToggle() {
    const toggleButtons = document.querySelectorAll('.btn-branch-comparison');
    if (!toggleButtons.length) return;
    
    // Make sure the first button is marked as active (consumption is default)
    const consumptionButton = document.querySelector('.btn-branch-comparison[data-metric="consumption"]');
    if (consumptionButton) {
        consumptionButton.classList.add('active');
    }
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get selected metric
            const metric = this.getAttribute('data-metric');
            
            // Get filtered data
            const filteredData = getFilteredFuelData();
            
            // Render branch performance chart with selected metric
            renderBranchPerformanceChart(filteredData, metric);
        });
    });
}

// Initialize fuel dashboard filters
function initializeFuelDashboardFilters() {
    const dateRangeSelect = document.getElementById('fuel-date-range');
    const customDateRange = document.getElementById('custom-date-range');
    const vehicleFilter = document.getElementById('fuel-vehicle-filter');
    const applyButton = document.getElementById('apply-fuel-filters');
    
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customDateRange.style.display = 'block';
            } else {
                customDateRange.style.display = 'none';
            }
        });
    }
    
    // Populate vehicle filter from Google Sheets data
    if (vehicleFilter) {
        console.log('Populating vehicle filter from Google Sheets data');
        
        // Clear existing options except the first one
        while (vehicleFilter.options.length > 1) {
            vehicleFilter.remove(1);
        }
        
        // Get vehicles from the combined data sources
        let availableVehicles = [];
        
        // First try to get vehicles from the global vehicles array
        if (vehicles && Array.isArray(vehicles)) {
            // Filter by manager if applicable
            if (currentUser && currentUser.role === 'manager') {
                availableVehicles = vehicles.filter(v => v.manager === currentUser.id);
            } else {
                availableVehicles = [...vehicles];
            }
        }
        
        // Also collect unique vehicle IDs from the fuel records themselves
        const uniqueVehicleIds = new Set();
        const uniqueLicensePlates = new Set();
        
        if (fuelRecords && Array.isArray(fuelRecords)) {
            fuelRecords.forEach(record => {
                // Check all possible vehicle identifier fields
                if (record['Vehicle ID']) {
                    uniqueVehicleIds.add(record['Vehicle ID']);
                }
                if (record['Vehicle VIN/SN']) {
                    uniqueVehicleIds.add(record['Vehicle VIN/SN']);
                }
                if (record.vehicle) {
                    uniqueVehicleIds.add(record.vehicle);
                }
                if (record['License Plate']) {
                    uniqueLicensePlates.add(record['License Plate']);
                }
            });
        }
        
        console.log(`Found ${uniqueVehicleIds.size} unique Vehicle IDs and ${uniqueLicensePlates.size} License Plates`);
        
        // Add vehicles from global array first
        const addedIds = new Set();
        availableVehicles.forEach(vehicle => {
            const vehicleId = vehicle['Vehicle ID'] || vehicle.id;
            if (!vehicleId) return;
            
            const option = document.createElement('option');
            option.value = vehicleId;
            option.textContent = vehicle['License Plate'] || vehicleId;
            vehicleFilter.appendChild(option);
            
            addedIds.add(vehicleId);
        });
        
        // Then add any vehicle IDs from fuel records that weren't already added
        uniqueVehicleIds.forEach(vehicleId => {
            if (addedIds.has(vehicleId)) return;
            
            // Try to find license plate for this ID
            let licensePlate = '';
            for (const record of fuelRecords) {
                if ((record['Vehicle ID'] === vehicleId || 
                     record['Vehicle VIN/SN'] === vehicleId || 
                     record.vehicle === vehicleId) && 
                    record['License Plate']) {
                    licensePlate = record['License Plate'];
                    break;
                }
            }
            
            const option = document.createElement('option');
            option.value = vehicleId;
            option.textContent = licensePlate ? `${licensePlate} (${vehicleId})` : vehicleId;
            vehicleFilter.appendChild(option);
            
            addedIds.add(vehicleId);
        });
        
        console.log(`Added ${addedIds.size} vehicles to filter dropdown`);
    }
    
    // Populate driver filter options
    updateDriverFilterOptions();
    
    // Populate branch filter
    updateBranchFilterOptions();
    
    // Apply filters button
    if (applyButton) {
        applyButton.addEventListener('click', renderFuelDashboard);
    }
}

// Fix the createFuelRow function to use EGP currency
function createFuelRow(fuel) {
    // Use Vehicle ID field for finding the vehicle
    const vehicleId = fuel['Vehicle ID'] || fuel.vehicle;
    const vehicle = vehicles.find(v => 
        v['Vehicle ID'] === vehicleId || 
        v.id === vehicleId || 
        v['Vehicle VIN/SN'] === vehicleId
    );
    
    // Format the date properly
    let fuelDate;
    try {
        fuelDate = new Date(fuel.Date).toLocaleDateString();
    } catch (error) {
        fuelDate = fuel.Date || 'N/A';
    }
    
    // Add type checking to handle both string and number values
    let fuelCost;
    if (typeof fuel.Amount === 'string') {
        // Replace £ with EGP in existing strings
        fuelCost = fuel.Amount.replace('£', 'EGP ');
    } else if (typeof fuel.Amount === 'number') {
        fuelCost = `EGP ${fuel.Amount.toFixed(2)}`;
    } else {
        fuelCost = 'EGP 0.00';
    }
    
    // Use Vehicle ID for the profile button
    const displayVehicleId = vehicleId || '';
    
    // Add driver name to display in the details column
    const driverName = fuel['Driver Name (EN)'] || fuel['Driver Name (AR)'] || fuel['Driver Name'] || 'N/A';
    
    // Add a new column to display the driver name
    return `
        <tr>
            <td>${vehicle ? vehicle['License Plate'] : (fuel['License Plate'] || 'Unknown')}</td>
            <td>${fuelDate}</td>
            <td>${driverName}</td>
            <td>${fuel['Fuel Type'] || 'N/A'}</td>
            <td>${fuel.Quantity || '0'}</td>
            <td>${fuelCost}</td>
            <td>${fuel.Distance || '0'}</td>
            <td>${fuel['Consumption Rate'] || '0'}</td>
            <td>
                <div class="action-buttons">
                    <button class="profile-btn" data-vehicle-id="${displayVehicleId}">
                        <i class="fas fa-id-card"></i> Profile
                    </button>
                    ${currentUser && currentUser.role !== 'employee' ? `
                        <button class="action-btn edit-btn" data-id="${fuel.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${fuel.id}" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// Add event listeners for fuel action buttons - fixed profile button handling
function addFuelActionListeners() {
    // Profile buttons
    document.querySelectorAll('#fuel-page .profile-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const vehicleId = this.getAttribute('data-vehicle-id');
            if (vehicleId) {
                console.log('Fuel page: Opening vehicle details for ID:', vehicleId);
                if (typeof window.openVehicleDetailsModal === 'function') {
                    window.openVehicleDetailsModal(vehicleId);
                } else {
                    console.error('openVehicleDetailsModal function not available');
                }
            } else {
                console.error('No vehicle ID found on profile button');
            }
        });
    });
    
    // Edit buttons
    document.querySelectorAll('#fuel-page .edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const fuelId = btn.getAttribute('data-id');
            openFuelModal(fuelId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('#fuel-page .delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const fuelId = btn.getAttribute('data-id');
            confirmDeleteFuel(fuelId);
        });
    });
    
    // Add fuel button
    const addFuelBtn = document.getElementById('add-fuel-btn');
    if (addFuelBtn) {
        addFuelBtn.addEventListener('click', () => {
            openFuelModal();
        });
    }
}

// Render fuel dashboard
function renderFuelDashboard() {
    console.log('Rendering fuel dashboard');
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Cannot render charts.');
        return;
    }
    
    try {
        const filteredData = getFilteredFuelData();
        console.log('Filtered data for charts:', filteredData);
        
        updateFuelStats(filteredData);
        
        // Check if chart containers exist
        const containers = [
            document.getElementById('fuel-consumption-chart'),
            document.getElementById('fuel-cost-chart'),
            document.getElementById('fuel-type-chart'),
            document.getElementById('vehicle-performance-chart')
        ];
        
        if (!containers.every(container => container)) {
            console.warn('One or more chart containers are missing');
        }
        
        renderFuelCharts(filteredData);
        
        // Apply consistent sizes after charts are created
        applyConsistentChartSizes();
    } catch (error) {
        console.error('Error rendering fuel dashboard:', error);
    }
}

// Get filtered fuel data based on current filters
function getFilteredFuelData() {
    const dateRangeSelect = document.getElementById('fuel-date-range');
    const dateFromInput = document.getElementById('fuel-date-from');
    const dateToInput = document.getElementById('fuel-date-to');
    const vehicleFilter = document.getElementById('fuel-vehicle-filter');
    const driverFilter = document.getElementById('driver-filter');
    const branchFilter = document.getElementById('branch-filter');
    
    // Verify we have fuel records
    if (!fuelRecords || !Array.isArray(fuelRecords) || fuelRecords.length === 0) {
        console.warn('No fuel records available for filtering');
        
        // Return an empty array rather than null to prevent downstream errors
        return [];
    }
    
    // Log debug information
    console.log('Total fuel records before filtering:', fuelRecords.length);
    console.log('Sample record format:', fuelRecords.length > 0 ? fuelRecords[0] : 'No records available');
    
    // Default to 30 days if nothing is selected
    let days = 30;
    let startDate = null;
    let endDate = new Date();
    
    // Determine date range
    if (dateRangeSelect) {
        const rangeValue = dateRangeSelect.value || '30'; // Default to 30 days if no selection
        
        if (rangeValue === 'custom') {
            if (dateFromInput && dateFromInput.value) {
                startDate = new Date(dateFromInput.value);
            } else {
                // If no start date is provided in custom mode, default to 30 days
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
            }
            
            if (dateToInput && dateToInput.value) {
                endDate = new Date(dateToInput.value);
            }
        } else {
            days = parseInt(rangeValue, 10);
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }
    } else {
        // If no date range selector, default to last 30 days
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Filter by date and vehicle
    let filteredRecords = [...fuelRecords];
    
    // Ensure we have a valid start date (fallback to 30 days if not)
    if (!startDate) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    
    console.log('Filtering data from', startDate.toISOString(), 'to', endDate.toISOString());
    
    // Date filter
    filteredRecords = filteredRecords.filter(record => {
        try {
            const recordDate = new Date(record.Date);
            return recordDate >= startDate && recordDate <= endDate;
        } catch (error) {
            console.error('Error parsing date:', record.Date, error);
            return false;
        }
    });
    
    // Vehicle filter - updated to handle various vehicle ID formats
    if (vehicleFilter && vehicleFilter.value && vehicleFilter.value !== 'all') {
        const vehicleId = vehicleFilter.value;
        filteredRecords = filteredRecords.filter(record => {
            return (record['Vehicle ID'] === vehicleId || 
                    record['Vehicle VIN/SN'] === vehicleId || 
                    record.vehicle === vehicleId);
        });
        
        console.log(`Filtered by Vehicle ID: ${vehicleId}, remaining records: ${filteredRecords.length}`);
    }
    
    // Driver filter - updated to handle various driver name fields
    if (driverFilter && driverFilter.value) {
        const driverValue = driverFilter.value;
        filteredRecords = filteredRecords.filter(record => {
            return (record['Driver Name (EN)'] === driverValue || 
                    record['Driver Name (AR)'] === driverValue || 
                    record['Driver Name'] === driverValue ||
                    record['Transaction Driver ID'] === driverValue);
        });
        
        // Fixed: Added missing closing curly brace in template expression
        console.log(`Filtered by Driver: ${driverValue}, remaining records: ${filteredRecords.length}`);
    }
    
    // Branch filter - new
    if (branchFilter && branchFilter.value) {
        const branchValue = branchFilter.value;
        filteredRecords = filteredRecords.filter(record => {
            // Check direct branch fields in record
            if (record.Branch === branchValue || record['Current Location'] === branchValue) {
                return true;
            }
            
            // If record has vehicle ID, check if that vehicle belongs to the branch
            const vehicleId = record['Vehicle ID'] || record.vehicle;
            if (vehicleId && vehicles) {
                const vehicle = vehicles.find(v => 
                    v['Vehicle ID'] === vehicleId || 
                    v.id === vehicleId || 
                    v['Vehicle VIN/SN'] === vehicleId
                );
                
                if (vehicle && (vehicle.Branch === branchValue || vehicle['Current Location'] === branchValue)) {
                    return true;
                }
            }
            
            return false;
        });
        
        console.log(`Filtered by Branch: ${branchValue}, remaining records: ${filteredRecords.length}`);
    }
    
    // Manager filter
    if (currentUser && currentUser.role === 'manager') {
        const managerVehicles = vehicles.filter(v => v.manager === currentUser.id).map(v => v.id);
        filteredRecords = filteredRecords.filter(f => managerVehicles.includes(f.vehicle));
    }
    
    console.log('Records after filtering:', filteredRecords.length);
    return filteredRecords;
}

// Update fuel stats display with EGP currency
function updateFuelStats(filteredData) {
    console.log('Updating fuel stats with', filteredData.length, 'records');
    
    let totalFuel = 0;
    let totalDistance = 0;
    let totalCost = 0;
    
    if (!filteredData || filteredData.length === 0) {
        console.warn('No filtered data for stats');
    } else {
        filteredData.forEach(record => {
            // Parse Quantity (ensure it's a number)
            const quantity = parseFloat(record.Quantity) || 0;
            totalFuel += quantity;
            
            // Parse Distance (ensure it's a number)
            const distance = parseFloat(record.Distance) || 0;
            totalDistance += distance;
            
            // Parse Amount (handle different formats)
            let cost = 0;
            if (typeof record.Amount === 'string') {
                // Remove currency symbols and parse as float
                cost = parseFloat(record.Amount.replace(/[£$]/g, '')) || 0;
            } else if (typeof record.Amount === 'number') {
                cost = record.Amount;
            }
            totalCost += cost;
        });
    }
    
    const avgConsumption = totalFuel > 0 ? totalDistance / totalFuel : 0;
    
    // Update stats display
    const totalFuelStat = document.getElementById('total-fuel-stat');
    const totalDistanceStat = document.getElementById('total-distance-stat');
    const totalCostStat = document.getElementById('total-cost-stat');
    const avgConsumptionStat = document.getElementById('avg-consumption-stat');
    
    if (totalFuelStat) totalFuelStat.textContent = `${totalFuel.toFixed(2)} L`;
    if (totalDistanceStat) totalDistanceStat.textContent = `${totalDistance.toFixed(2)} Km`;
    if (totalCostStat) totalCostStat.textContent = `EGP ${totalCost.toFixed(2)}`;
    if (avgConsumptionStat) avgConsumptionStat.textContent = `${avgConsumption.toFixed(2)} Km/L`;
    
    console.log('Stats updated:', {
        totalFuel: totalFuel.toFixed(2),
        totalDistance: totalDistance.toFixed(2),
        totalCost: totalCost.toFixed(2),
        avgConsumption: avgConsumption.toFixed(2)
    });
}

// Render all fuel charts - updated to include the new fuel efficiency ranking table
function renderFuelCharts(filteredData) {
    console.log('Rendering fuel charts');
    
    try {
        // Check if we have data
        if (!filteredData || filteredData.length === 0) {
            console.log('No data available for charts, displaying placeholders');
            
            // Display no-data message in chart containers
            displayNoDataMessage('fuel-consumption-chart', 'No fuel consumption data available');
            displayNoDataMessage('cost-reading-chart', 'No cost and reading data available');
            displayNoDataMessage('driver-efficiency-chart', 'No driver efficiency data available');
            displayNoDataMessage('vehicle-efficiency-chart', 'No vehicle efficiency data available');
            displayNoDataMessage('branch-performance-chart', 'No branch performance data available');
            displayNoDataMessage('cost-per-km-chart', 'No cost per kilometer data available');
            displayNoDataMessage('monthly-consumption-chart', 'No monthly consumption data available');
            displayNoDataMessage('pump-reading-differences-chart', 'No pump reading differences data available');
            // Also handle no data for the ranking table
            const rankingTableContainer = document.getElementById('fuel-efficiency-ranking-table');
            if (rankingTableContainer) {
                rankingTableContainer.innerHTML = '<div class="no-data-message"><i class="fas fa-chart-bar"></i><p>No fuel efficiency ranking data available</p></div>';
            }
            
            return;
        }
        
        // Always use 'all' as the vehicle filter for the Cost and Reading chart
        renderCostReadingDifferenceChart(filteredData, 'cost', 'all');
        
        // Render new Cost per Kilometer chart
        renderCostPerKilometerChart(filteredData, 'vehicles');
        
        renderConsumptionTrendChart(filteredData);
        renderDriverEfficiencyChart(filteredData);
        renderVehicleEfficiencyChart(filteredData);
        renderBranchPerformanceChart(filteredData, 'consumption');
        
        // Initialize and populate the vehicle selector for monthly consumption chart
        initializeMonthlyConsumptionVehicleSelector(filteredData);
        
        // Render the monthly consumption chart
        renderMonthlyConsumptionChart(filteredData, 'quantity');
        
        // Render the Pump Reading Differences chart
        renderPumpReadingDifferencesChart(filteredData);
        
        // Render the new fuel efficiency ranking table
        renderFuelEfficiencyRankingTable(filteredData, 'all');
        
        // Add event listeners for chart view toggles - updated for efficiency ranking table
        document.querySelectorAll('.btn-chart-view').forEach(btn => {
            btn.addEventListener('click', function() {
                const view = this.getAttribute('data-view');
                const chartType = this.getAttribute('data-chart');
                const parent = this.closest('.chart-header');
                
                // Remove active class from all buttons in this group
                parent.querySelectorAll('.btn-chart-view').forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Update chart based on view and chart type
                if (chartType === 'consumption') {
                    renderConsumptionTrendChart(filteredData, view);
                } else if (chartType === 'cost-reading') {
                    renderCostReadingDifferenceChart(filteredData, view, 'all');
                } else if (chartType === 'cost-per-km') {
                    renderCostPerKilometerChart(filteredData, view);
                } else if (chartType === 'monthly-consumption') {
                    renderMonthlyConsumptionChart(filteredData, view);
                } else if (chartType === 'efficiency-ranking') {
                    renderFuelEfficiencyRankingTable(filteredData, view);
                }
            });
        });
    } catch (error) {
        console.error('Error rendering charts:', error);
    }
    
    // Override chart dimensions after rendering to ensure full width
    setTimeout(() => {
        const chartContainers = document.querySelectorAll('#fuel-page .chart-container.full-width');
        chartContainers.forEach(container => {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                // Apply consistent dimensions for all full-width charts
                canvas.style.width = '100%';
                canvas.style.height = '380px';
                
                // Force chart resize if chart instance exists
                const chartId = canvas.id;
                if (chartId === 'fuel-consumption-chart' && fuelConsumptionChart) {
                    fuelConsumptionChart.resize();
                } else if (chartId === 'driver-efficiency-chart' && driverEfficiencyChart) {
                    driverEfficiencyChart.resize();
                } else if (chartId === 'vehicle-efficiency-chart' && vehicleEfficiencyChart) {
                    vehicleEfficiencyChart.resize();
                } else if (chartId === 'cost-reading-chart' && costReadingDifferenceChart) {
                    costReadingDifferenceChart.resize();
                }
            }
        });
    }, 100);
}

// Helper function to display no data message
function displayNoDataMessage(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;
    
    // Update messages that were in Arabic
    if (message === 'لا توجد بيانات متاحة لمقارنة السائقين') {
        message = 'No data available for driver comparison';
    } else if (message === 'لا توجد بيانات متاحة لمقارنة المركبات') {
        message = 'No data available for vehicle comparison';
    }
    
    // Create no-data message element
    const noDataElement = document.createElement('div');
    noDataElement.className = 'no-data-message';
    noDataElement.innerHTML = `
        <i class="fas fa-chart-bar"></i>
        <p>${message}</p>
    `;
    
    // Clear container and append no-data message
    canvas.style.display = 'none';
    
    // Remove any existing no-data message
    const existingMessage = container.querySelector('.no-data-message');
    if (existingMessage) {
        container.removeChild(existingMessage);
    }
    
    container.appendChild(noDataElement);
}

// Render consumption trend chart
function renderConsumptionTrendChart(data, viewType = 'weekly') {
    const canvas = document.getElementById('fuel-consumption-chart');
    if (!canvas) {
        console.error('Cannot find fuel consumption chart canvas');
        return;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Cannot render consumption trend chart.');
        return;
    }
    
    try {
        // Prepare data for the chart
        const aggregatedData = aggregateFuelData(data, viewType);
        console.log('Aggregated data for consumption chart:', aggregatedData);
        
        // Destroy existing chart if it exists
        if (fuelConsumptionChart) {
            fuelConsumptionChart.destroy();
        }
        
        // Determine if dark mode is active for chart colors
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#e0e0e0' : '#666';
        
        // Create new chart
        fuelConsumptionChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: aggregatedData.labels,
                datasets: [
                    {
                        label: 'Consumption (Km/L)',
                        data: aggregatedData.consumption,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#4CAF50',
                        pointBorderColor: '#fff',
                        pointRadius: 4
                    },
                    {
                        label: 'Distance (Km)',
                        data: aggregatedData.distance,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2196F3',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Consumption (Km/L)',
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor
                        }
                    },
                    y1: {
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Distance (Km)',
                            color: textColor
                        },
                        grid: {
                            drawOnChartArea: false,
                            color: gridColor
                        },
                        ticks: {
                            color: textColor
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        right: 20,
                        bottom: 10,
                        left: 10
                    }
                }
            }
        });
        
        // Add to global charts collection
        if (typeof charts === 'object') {
            charts.fuelConsumption = fuelConsumptionChart;
        }
        
        console.log('Consumption trend chart rendered');
    } catch (error) {
        console.error('Error rendering consumption chart:', error);
    }
}

// Aggregate fuel data for charts
function aggregateFuelData(data, viewType = 'weekly') {
    const aggregatedData = {
        labels: [],
        consumption: [],
        distance: [],
        cost: [],
        fuel: []
    };
    
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('No data for aggregation');
        return aggregatedData;
    }
    
    try {
        const groups = {};
        
        // Sort data by date
        const sortedData = [...data].sort((a, b) => {
            try {
                return new Date(a.Date) - new Date(b.Date);
            } catch (error) {
                return 0;
            }
        });
        
        sortedData.forEach(record => {
            try {
                const date = new Date(record.Date);
                if (isNaN(date.getTime())) {
                    console.warn('Invalid date encountered:', record.Date);
                    return; // Skip this record
                }
                
                let key;
                
                if (viewType === 'monthly') {
                    key = `${date.getFullYear()}-${date.getMonth() + 1}`;
                } else {
                    // Weekly - group by day
                    key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                }
                
                if (!groups[key]) {
                    groups[key] = {
                        date: date,
                        fuel: 0,
                        distance: 0,
                        cost: 0,
                        records: 0
                    };
                }
                
                const quantity = parseFloat(record.Quantity) || 0;
                groups[key].fuel += quantity;
                
                const distance = parseFloat(record.Distance) || 0;
                groups[key].distance += distance;
                
                // Extract cost value with better error handling
                let cost = 0;
                if (typeof record.Amount === 'string') {
                    cost = parseFloat(record.Amount.replace(/[£$]/g, '')) || 0;
                } else if (typeof record.Amount === 'number') {
                    cost = record.Amount;
                }
                
                groups[key].cost += cost;
                groups[key].records++;
            } catch (error) {
                console.error('Error processing record for aggregation:', error);
            }
        });
        
        // Convert to arrays
        Object.keys(groups).sort().forEach(key => {
            const group = groups[key];
            const consumption = group.fuel > 0 ? group.distance / group.fuel : 0;
            
            try {
                const dateFormat = new Intl.DateTimeFormat('en-GB', 
                    viewType === 'monthly' 
                        ? { year: 'numeric', month: 'short' } 
                        : { day: '2-digit', month: 'short' }
                );
                
                aggregatedData.labels.push(dateFormat.format(group.date));
                aggregatedData.consumption.push(consumption.toFixed(2));
                aggregatedData.distance.push(group.distance.toFixed(2));
                aggregatedData.cost.push(group.cost.toFixed(2));
                aggregatedData.fuel.push(group.fuel.toFixed(2));
            } catch (error) {
                console.error('Error formatting date:', error);
            }
        });
    } catch (error) {
        console.error('Error aggregating fuel data:', error);
    }
    
    return aggregatedData;
}

// New function to render branch performance chart
function renderBranchPerformanceChart(data, metric = 'consumption') {
    const canvas = document.getElementById('branch-performance-chart');
    if (!canvas) {
        console.error('Branch performance chart canvas not found');
        return;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not available for branch performance chart');
        return;
    }
    
    try {
        console.log(`Rendering branch performance chart with ${data.length} records, metric: ${metric}`);
        
        // Get branch performance data
        const branchData = getBranchPerformanceData(data, metric);
        
        if (!branchData || branchData.branches.length === 0) {
            console.warn('No branch data available for chart');
            displayNoDataMessage('branch-performance-chart', 'No branch data available for comparison');
            return;
        }
        
        console.log(`Found data for ${branchData.branches.length} branches`);
        
        // Destroy existing chart if it exists
        if (branchPerformanceChart) {
            branchPerformanceChart.destroy();
        }
        
        // Set title based on metric
        const metricTitle = metric === 'consumption' ? 'Fuel Consumption (Km/L)' : 'Cost Efficiency (EGP/Km)';
        const metricColor = metric === 'consumption' ? '#3498db' : '#f39c12';
        
        // Create chart
        branchPerformanceChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: branchData.branches,
                datasets: [{
                    label: metricTitle,
                    data: branchData.values,
                    backgroundColor: branchData.values.map((value, index) => {
                        // Generate gradient colors based on value
                        const ctx = canvas.getContext('2d');
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        
                        if (metric === 'consumption') {
                            // Higher is better for consumption (Km/L)
                            const intensity = Math.min(value / branchData.maxValue, 1);
                            gradient.addColorStop(0, `rgba(52, 152, 219, ${0.5 + intensity * 0.5})`);
                            gradient.addColorStop(1, `rgba(52, 152, 219, ${0.2 + intensity * 0.3})`);
                        } else {
                            // Lower is better for cost efficiency (£/Km)
                            const intensity = 1 - Math.min(value / branchData.maxValue, 1);
                            gradient.addColorStop(0, `rgba(243, 156, 18, ${0.5 + intensity * 0.5})`);
                            gradient.addColorStop(1, `rgba(243, 156, 18, ${0.2 + intensity * 0.3})`);
                        }
                        
                        return gradient;
                    }),
                    borderColor: metricColor,
                    borderWidth: 1,
                    borderRadius: 5,
                    hoverBackgroundColor: metricColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                if (metric === 'consumption') {
                                    return `Consumption: ${value.toFixed(2)} Km/L`;
                                } else {
                                    return `Cost Efficiency: EGP ${value.toFixed(3)}/Km`;
                                }
                            },
                            afterLabel: function(context) {
                                const branch = branchData.branches[context.dataIndex];
                                const records = branchData.recordCounts[context.dataIndex];
                                const distance = branchData.totalDistances[context.dataIndex];
                                const fuel = branchData.totalFuels[context.dataIndex];
                                const cost = branchData.totalCosts[context.dataIndex];
                                
                                return [
                                    `Records: ${records}`,
                                    `Total Distance: ${distance.toLocaleString()} Km`,
                                    `Total Fuel: ${fuel.toFixed(2)} L`,
                                    `Total Cost: EGP ${cost.toFixed(2)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: metricTitle,
                            color: getTextColor()
                        },
                        grid: {
                            color: getGridColor()
                        },
                        ticks: {
                            callback: function(value) {
                                return metric === 'consumption' 
                                    ? value.toFixed(1) + ' Km/L'
                                    : 'EGP ' + value.toFixed(3);
                            },
                            color: getTextColor()
                        }
                    },
                    x: {
                        grid: {
                            color: getGridColor()
                        },
                        ticks: {
                            color: getTextColor()
                        }
                    }
                }
            }
        });
        
        // Show canvas
        canvas.style.display = 'block';
        
        // Remove any no-data message
        const container = canvas.parentElement;
        const noDataMessage = container.querySelector('.no-data-message');
        if (noDataMessage) {
            noDataMessage.remove();
        }
        
        console.log('Branch performance chart rendered successfully');
    } catch (error) {
        console.error('Error rendering branch performance chart:', error);
        displayNoDataMessage('branch-performance-chart', 'Error rendering branch data');
    }
}

// Function to get branch performance data
function getBranchPerformanceData(data, metric) {
    if (!data || data.length === 0) {
        return null;
    }
    
    try {
        // Group data by branch
        const branchMap = {};
        
        data.forEach(record => {
            // Get branch from vehicle location or branch field
            const branch = record['Branch'] || 
                           record['Current Location'] || 
                           findVehicleBranch(record['Vehicle ID'] || record.vehicle) || 
                           'Unknown';
            
            if (!branchMap[branch]) {
                branchMap[branch] = {
                    totalDistance: 0,
                    totalFuel: 0,
                    totalCost: 0,
                    recordCount: 0
                };
            }
            
            // Parse fields
            const distance = parseFloat(record.Distance) || 0;
            const quantity = parseFloat(record.Quantity) || 0;
            let cost = 0;
            
            if (typeof record.Amount === 'string') {
                cost = parseFloat(record.Amount.replace(/[£$,]/g, '')) || 0;
            } else {
                cost = parseFloat(record.Amount || 0);
            }
            
            // Add to totals
            if (!isNaN(distance)) branchMap[branch].totalDistance += distance;
            if (!isNaN(quantity)) branchMap[branch].totalFuel += quantity;
            if (!isNaN(cost)) branchMap[branch].totalCost += cost;
            branchMap[branch].recordCount++;
        });
        
        // Calculate metrics for each branch
        const branches = [];
        const values = [];
        const recordCounts = [];
        const totalDistances = [];
        const totalFuels = [];
        const totalCosts = [];
        let maxValue = 0;
        
        for (const branch in branchMap) {
            const branchData = branchMap[branch];
            
            // Calculate metric value
            let metricValue = 0;
            
            if (metric === 'consumption') {
                // Fuel consumption (Km/L) - higher is better
                metricValue = branchData.totalFuel > 0 ? branchData.totalDistance / branchData.totalFuel : 0;
            } else {
                // Cost efficiency (£/Km) - lower is better
                metricValue = branchData.totalDistance > 0 ? branchData.totalCost / branchData.totalDistance : 0;
            }
            
            // Only include branches with valid data
            if (metricValue > 0) {
                branches.push(branch);
                values.push(metricValue);
                recordCounts.push(branchData.recordCount);
                totalDistances.push(branchData.totalDistance);
                totalFuels.push(branchData.totalFuel);
                totalCosts.push(branchData.totalCost);
                
                // Update max value
                maxValue = Math.max(maxValue, metricValue);
            }
        }
        
        // Sort data by metric value
        const sortedData = branches.map((branch, index) => ({
            branch,
            value: values[index],
            recordCount: recordCounts[index],
            totalDistance: totalDistances[index],
            totalFuel: totalFuels[index],
            totalCost: totalCosts[index]
        }));
        
        // Sort based on metric
        if (metric === 'consumption') {
            // Higher consumption (Km/L) is better, sort descending
            sortedData.sort((a, b) => b.value - a.value);
        } else {
            // Lower cost (£/Km) is better, sort ascending
            sortedData.sort((a, b) => a.value - b.value);
        }
        
        return {
            branches: sortedData.map(d => d.branch),
            values: sortedData.map(d => d.value),
            recordCounts: sortedData.map(d => d.recordCount),
            totalDistances: sortedData.map(d => d.totalDistance),
            totalFuels: sortedData.map(d => d.totalFuel),
            totalCosts: sortedData.map(d => d.totalCost),
            maxValue
        };
    } catch (error) {
        console.error('Error getting branch performance data:', error);
        return null;
    }
}

// Helper function to find a vehicle's branch
function findVehicleBranch(vehicleId) {
    if (!vehicleId || !Array.isArray(vehicles)) {
        return null;
    }
    
    const vehicle = vehicles.find(v => (
        v['Vehicle ID'] === vehicleId || 
        v.id === vehicleId || 
        v['Vehicle VIN/SN'] === vehicleId
    ));
    
    return vehicle ? (vehicle['Branch'] || vehicle['Current Location']) : null;
}

// Render fuel cost chart - Modified to handle missing canvas gracefully
function renderFuelCostChart(data) {
    const canvas = document.getElementById('fuel-cost-chart');
    if (!canvas) {
        console.warn('Cannot find fuel cost chart canvas - this chart is no longer used in the new dashboard layout');
        return; // Exit gracefully without error
    }
    
    try {
        // Destroy existing chart if it exists
        if (fuelCostChart) {
            fuelCostChart.destroy();
        }
        
        // Group cost by vehicle
        const vehicleCosts = {};
        data.forEach(record => {
            try {
                const vehicle = vehicles.find(v => v.id === record.vehicle);
                const vehicleName = vehicle ? (vehicle['License Plate'] || vehicle.id) : 'Unknown';
                
                if (!vehicleCosts[vehicleName]) {
                    vehicleCosts[vehicleName] = 0;
                }
                
                let cost = 0;
                if (typeof record.Amount === 'string') {
                    cost = parseFloat(record.Amount.replace(/[£$]/g, '')) || 0;
                } else if (typeof record.Amount === 'number') {
                    cost = record.Amount;
                }
                
                vehicleCosts[vehicleName] += cost;
            } catch (error) {
                console.error('Error processing record for cost chart:', error);
            }
        });
        
        // Convert to arrays
        const labels = Object.keys(vehicleCosts);
        const costs = labels.map(vehicle => vehicleCosts[vehicle].toFixed(2));
        
        // Determine if dark mode is active
        const isDarkMode = document.body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#e0e0e0' : '#666';
        
        // Create chart with proper aspect ratio settings
        fuelCostChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Cost (£)',
                    data: costs,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor,
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        right: 20,
                        bottom: 10,
                        left: 10
                    }
                }
            }
        });
        
        // Add to global charts collection
        if (typeof charts === 'object') {
            charts.fuelCost = fuelCostChart;
        }
        
        console.log('Fuel cost chart rendered');
    } catch (error) {
        console.error('Error rendering cost chart:', error);
    }
}

// Render vehicle performance chart
function renderVehiclePerformanceChart(data) {
    const canvas = document.getElementById('vehicle-performance-chart');
    if (!canvas) {
        console.error('Cannot find vehicle performance chart canvas');
        return;
    }
    
    try {
        // Destroy existing chart if it exists
        if (vehiclePerformanceChart) {
            vehiclePerformanceChart.destroy();
        }
        
        // Calculate average consumption by vehicle
        const vehiclePerformance = {};
        const vehicleFuel = {};
        const vehicleDistance = {};
        
        data.forEach(record => {
            try {
                const vehicle = vehicles.find(v => v.id === record.vehicle);
                const vehicleName = vehicle ? (vehicle['License Plate'] || vehicle.id) : 'Unknown';
                
                if (!vehicleFuel[vehicleName]) {
                    vehicleFuel[vehicleName] = 0;
                    vehicleDistance[vehicleName] = 0;
                }
                
                vehicleFuel[vehicleName] += parseFloat(record.Quantity) || 0;
                vehicleDistance[vehicleName] += parseFloat(record.Distance) || 0;
            } catch (error) {
                console.error('Error processing record for performance chart:', error);
            }
        });
        
        // Calculate average consumption
        Object.keys(vehicleFuel).forEach(vehicle => {
            if (vehicleFuel[vehicle] > 0) {
                vehiclePerformance[vehicle] = vehicleDistance[vehicle] / vehicleFuel[vehicle];
            } else {
                vehiclePerformance[vehicle] = 0;
            }
        });
        
        // Convert to arrays
        const labels = Object.keys(vehiclePerformance);
        const performance = labels.map(vehicle => vehiclePerformance[vehicle].toFixed(2));
        
        // Determine if dark mode is active
        const isDarkMode = document.body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#e0e0e0' : '#666';
        
        // Create horizontal bar chart with proper aspect ratio settings
        vehiclePerformanceChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    axis: 'y',
                    label: 'Avg. Consumption (Km/L)',
                    data: performance,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor
                        }
                    },
                    y: {
                        ticks: {
                            color: textColor
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        right: 20,
                        bottom: 10,
                        left: 10
                    }
                }
            }
        });
        
        // Add to global charts collection
        if (typeof charts === 'object') {
            charts.vehiclePerformance = vehiclePerformanceChart;
        }
        
        console.log('Vehicle performance chart rendered');
    } catch (error) {
        console.error('Error rendering vehicle performance chart:', error);
    }
}

// Open add/edit fuel modal
export function openFuelModal(fuelId = null) {
    const modal = document.getElementById('fuel-modal');
    if (!modal) {
        createFuelModal();
        return;
    }

    // Update modal title
    modal.querySelector('.modal-title').textContent = 
        fuelId ? 'Edit Fuel Record' : 'Add New Fuel Record';

    // Reset form
    const form = modal.querySelector('form');
    form.reset();
    form.querySelector('#fuel-id').value = fuelId || '';

    // Update vehicles list
    updateFuelVehiclesList();

    // Fill fuel data if editing
    if (fuelId) {
        const fuel = fuelRecords.find(f => f.id === fuelId);
        if (fuel) {
            fillFuelForm(fuel);
        }
    }

    // Open modal
    openModal('fuel-modal');
}

// Create fuel modal
function createFuelModal() {
    const modalHTML = `
        <div id="fuel-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Add New Fuel Record</h3>
                    <button id="close-fuel-modal" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="fuel-form">
                    <input type="hidden" id="fuel-id">
                    <div class="form-group">
                        <label for="fuel-vehicle">Vehicle</label>
                        <select id="fuel-vehicle" required></select>
                    </div>
                    <div class="form-group">
                        <label for="fuel-date">Date</label>
                        <input type="date" id="fuel-date" required>
                    </div>
                    <div class="form-group">
                        <label for="fuel-type">Fuel Type</label>
                        <select id="fuel-type" required>
                            <option value="">Select Fuel Type</option>
                            <option value="92">92</option>
                            <option value="95">95</option>
                            <option value="Diesel">Diesel</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="fuel-quantity">Quantity (L)</label>
                        <input type="number" id="fuel-quantity" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="fuel-cost">Cost (EGP)</label>
                        <input type="number" id="fuel-cost" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="fuel-odometer">Odometer (Km)</label>
                        <input type="number" id="fuel-odometer" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="fuel-distance">Distance (Km)</label>
                        <input type="number" id="fuel-distance" step="0.01" min="0" required>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" id="cancel-fuel-form" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('fuel-form').addEventListener('submit', handleFuelSubmit);

    // Add event listeners for cancel and close buttons
    document.getElementById('cancel-fuel-form').addEventListener('click', () => closeModal('fuel-modal'));
    document.getElementById('close-fuel-modal').addEventListener('click', () => closeModal('fuel-modal'));
}

// Update vehicles list in fuel form
function updateFuelVehiclesList() {
    const vehicleSelect = document.getElementById('fuel-vehicle');
    if (!vehicleSelect) return;
    
    // Clear existing options
    vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>';
    
    // Filter vehicles by manager if applicable
    let availableVehicles = vehicles;
    if (currentUser.role === 'manager') {
        availableVehicles = vehicles.filter(v => v.manager === currentUser.id);
    }
    
    // Add vehicles to select
    availableVehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.id;
        option.textContent = vehicle['License Plate'] || vehicle.id;
        vehicleSelect.appendChild(option);
    });
}

// Fill fuel form with data
function fillFuelForm(fuel) {
    const form = document.getElementById('fuel-form');
    if (!form) return;
    
    form.querySelector('#fuel-vehicle').value = fuel.vehicle || '';
    
    const dateInput = form.querySelector('#fuel-date');
    if (dateInput && fuel.Date) {
        const date = new Date(fuel.Date);
        dateInput.value = date.toISOString().split('T')[0];
    }
    
    form.querySelector('#fuel-type').value = fuel['Fuel Type'] || '';
    form.querySelector('#fuel-quantity').value = fuel.Quantity || '';
    
    const costInput = form.querySelector('#fuel-cost');
    if (costInput) {
        if (typeof fuel.Amount === 'string') {
            costInput.value = parseFloat(fuel.Amount.replace('£', '')) || '';
        } else if (typeof fuel.Amount === 'number') {
            costInput.value = fuel.Amount;
        }
    }
    
    form.querySelector('#fuel-odometer').value = fuel.Odometer || '';
    form.querySelector('#fuel-distance').value = fuel.Distance || '';
}

// Handle fuel form submission with EGP currency
export async function handleFuelSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const fuelData = {
        id: form.querySelector('#fuel-id').value,
        vehicle: form.querySelector('#fuel-vehicle').value,
        Date: form.querySelector('#fuel-date').value,
        'Fuel Type': form.querySelector('#fuel-type').value,
        Quantity: parseFloat(form.querySelector('#fuel-quantity').value),
        Amount: `EGP ${parseFloat(form.querySelector('#fuel-cost').value).toFixed(2)}`,
        Odometer: parseInt(form.querySelector('#fuel-odometer').value),
        Distance: parseFloat(form.querySelector('#fuel-distance').value)
    };
    
    // Calculate consumption rate
    if (fuelData.Quantity > 0) {
        fuelData['Consumption Rate'] = (fuelData.Distance / fuelData.Quantity).toFixed(1);
    } else {
        fuelData['Consumption Rate'] = '0.0';
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: fuelData.id ? 'updateFuel' : 'addFuel',
                ...fuelData   
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Update fuel records
            if (fuelData.id) {
                const index = fuelRecords.findIndex(f => f.id === fuelData.id);
                if (index !== -1) {
                    fuelRecords[index] = result.data;
                }
            } else {
                fuelRecords.push(result.data);
            }
            
            closeModal('fuel-modal');
            renderFuelTable();
            renderFuelDashboard();
            showNotification(
                fuelData.id ? 'Fuel record updated successfully' : 'Fuel record added successfully',
                'success'
            );
        } else {
            showNotification(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error saving fuel record:', error);
        showNotification('Error saving fuel record', 'error');
    }
}

// Confirm delete fuel
function confirmDeleteFuel(fuelId) {
    const fuel = fuelRecords.find(f => f.id === fuelId);
    if (!fuel) return;
    
    const vehicle = vehicles.find(v => v.id === fuel.vehicle);
    const message = `Are you sure you want to delete this fuel record for vehicle ${vehicle ? vehicle['License Plate'] : 'Unknown'}?`;
    if (confirm(message)) {
        deleteFuel(fuelId);
    }
}

// Delete fuel record
async function deleteFuel(fuelId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deleteFuel',
                id: fuelId
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            fuelRecords = fuelRecords.filter(f => f.id !== fuelId);
            renderFuelTable();
            renderFuelDashboard();
            showNotification('Fuel record deleted successfully', 'success');
        } else {
            showNotification(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting fuel record:', error);
        showNotification('Error deleting fuel record', 'error');
    }
}

// New function: Render driver efficiency comparison chart
function renderDriverEfficiencyChart(data) {
    const canvas = document.getElementById('driver-efficiency-chart');
    if (!canvas) {
        console.log('Driver efficiency chart canvas not found');
        return;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not available for driver efficiency chart');
        displayNoDataMessage('driver-efficiency-chart', 'Chart.js library not loaded');
        return;
    }
    
    try {
        // Group fuel data by driver and calculate averages
        const driversData = getDriversEfficiencyData(data);
        
        if (driversData.length === 0) {
            console.log('No drivers data available');
            displayNoDataMessage('driver-efficiency-chart', 'No data available for driver comparison');
            return;
        }
        
        // Sort by efficiency (descending)
        driversData.sort((a, b) => b.efficiency - a.efficiency);
        
        // Modified: Show all drivers instead of limiting to 10
        const allDrivers = driversData;
        
        // Destroy previous chart if exists
        if (driverEfficiencyChart) {
            driverEfficiencyChart.destroy();
        }
        
        // Generate colors - more efficient drivers get greener colors, less efficient get redder
        const colors = allDrivers.map((driver, index) => {
            // Calculate color based on position within the array (gradient from green to red)
            const r = Math.floor(255 * (index / (allDrivers.length - 1 || 1)));
            const g = Math.floor(255 * (1 - index / (allDrivers.length - 1 || 1)));
            return `rgba(${r}, ${g}, 60, 0.8)`;
        });
        
        // Process driver names - shorten to first two names only
        const processedDrivers = allDrivers.map(driver => {
            // Create a shortened version of the driver name (first two names only)
            const nameParts = driver.name.split(' ');
            const shortenedName = nameParts.length > 2 ? 
                `${nameParts[0]} ${nameParts[1]}` : driver.name;
            
            return {
                ...driver,
                displayName: shortenedName,
                fullName: driver.name // keep full name for tooltip
            };
        });
        
        // Create chart
        driverEfficiencyChart = new Chart(canvas, {
            type: 'bar',
            data: {
                // Use shortened names for display
                labels: processedDrivers.map(d => d.displayName),
                datasets: [{
                    label: 'Average Fuel Efficiency (Km/L)',
                    data: processedDrivers.map(d => d.efficiency.toFixed(2)),
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: getTextColor(),
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                // Show full name in tooltip title
                                const dataIndex = context[0].dataIndex;
                                return processedDrivers[dataIndex].fullName;
                            },
                            label: function(context) {
                                const driver = processedDrivers[context.dataIndex];
                                return [
                                    `Efficiency: ${driver.efficiency.toFixed(2)} Km/L`,
                                    `Total Distance: ${driver.totalDistance.toFixed(0)} Km`,
                                    `Total Fuel: ${driver.totalFuel.toFixed(2)} L`,
                                    `Records Count: ${driver.recordCount}`
                                ];
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Comparison of Fuel Efficiency Among Drivers',
                        color: getTextColor(),
                        font: {
                            size: 16,
                            family: 'Cairo, Arial, sans-serif'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Fuel Efficiency (Km/L)',
                            color: getTextColor(),
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        },
                        grid: {
                            color: getGridColor()
                        },
                        ticks: {
                            color: getTextColor(),
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Driver',
                            color: getTextColor(),
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        },
                        grid: {
                            color: getGridColor()
                        },
                        ticks: {
                            color: getTextColor(),
                            // Adjust rotation angle for better readability with shorter names
                            maxRotation: 40,
                            minRotation: 40,
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            },
                            // Make sure all labels are visible
                            autoSkip: false
                        }
                    }
                },
                // Add better bar spacing when there are many drivers
                barPercentage: allDrivers.length > 10 ? 0.8 : 0.9,
                categoryPercentage: allDrivers.length > 10 ? 0.8 : 0.9
            }
        });
        
        // Add to global charts collection for dark mode handling
        if (typeof charts === 'object') {
            charts.driverEfficiency = driverEfficiencyChart;
        }
        
        console.log('Driver efficiency chart rendered with all', allDrivers.length, 'drivers');
    } catch (error) {
        console.error('Error rendering driver efficiency chart:', error);
        displayNoDataMessage('driver-efficiency-chart', 'Error rendering driver efficiency chart');
    }
}

// Helper function to get drivers efficiency data
function getDriversEfficiencyData(fuelRecords) {
    // Map to hold driver data
    const driversMap = {};
    
    // Process all fuel records
    fuelRecords.forEach(record => {
        // Get driver name, with fallbacks
        let driverName = record['Driver Name (EN)'] || record['Driver Name (AR)'] || record['Driver Name'] || 'Unknown';
        
        // If no driver name found, try to find from vehicles data
        if (driverName === 'Unknown' && record.vehicle && vehicles) {
            const vehicleId = record.vehicle || record['Vehicle ID'];
            const vehicle = vehicles.find(v => v['Vehicle ID'] === vehicleId || v.id === vehicleId);
            
            if (vehicle && vehicle['Driver Name']) {
                driverName = vehicle['Driver Name'];
            }
        }
        
        // Parse consumption/efficiency value
        let efficiency = 0;
        if (record['Consumption Rate']) {
            efficiency = parseFloat(record['Consumption Rate']);
        } else if (record.Distance && record.Quantity && record.Quantity > 0) {
            efficiency = parseFloat(record.Distance) / parseFloat(record.Quantity);
        }
        
        // Parse distance and quantity
        const distance = parseFloat(record.Distance) || 0;
        const quantity = parseFloat(record.Quantity) || 0;
        
        // Skip invalid records
        if (efficiency <= 0 || isNaN(efficiency) || distance <= 0 || quantity <= 0) {
            return;
        }
        
        // Initialize driver data if not exists
        if (!driversMap[driverName]) {
            driversMap[driverName] = {
                name: driverName,
                totalDistance: 0,
                totalFuel: 0,
                recordCount: 0,
                efficiency: 0
            };
        }
        
        // Update driver data
        driversMap[driverName].totalDistance += distance;
        driversMap[driverName].totalFuel += quantity;
        driversMap[driverName].recordCount++;
    });
    
    // Calculate average efficiency for each driver
    const driversArray = Object.values(driversMap).map(driver => {
        if (driver.totalFuel > 0) {
            driver.efficiency = driver.totalDistance / driver.totalFuel;
        }
        return driver;
    });
    
    // Filter out drivers with no data
    return driversArray.filter(driver => driver.recordCount > 0);
}

// Helper functions for chart colors based on dark mode
function getTextColor() {
    return document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#333';
}

function getGridColor() {
    return document.body.classList.contains('dark-mode') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
}

// Update charts for dark mode - consolidated function to replace duplicate declarations
export function updateChartsForDarkMode(isDarkMode) {
    // Update all charts
    if (fuelConsumptionChart) {
        updateChartColors(fuelConsumptionChart, isDarkMode);
    }
    
    if (branchPerformanceChart) {
        updateChartColors(branchPerformanceChart, isDarkMode);
    }
    
    if (driverEfficiencyChart) {
        updateChartColors(driverEfficiencyChart, isDarkMode);
    }
    
    if (vehicleEfficiencyChart) {
        updateChartColors(vehicleEfficiencyChart, isDarkMode);
    }
    
    if (fuelTypeChart) {
        updateChartColors(fuelTypeChart, isDarkMode);
    }
    
    if (costReadingDifferenceChart) {
        updateChartColors(costReadingDifferenceChart, isDarkMode);
    }
    
    // Add the new Cost and Reading Difference chart
    if (costReadingDifferenceChart) {
        updateChartColors(costReadingDifferenceChart, isDarkMode);
    }
    
    // Add the new Cost per Kilometer chart
    if (costPerKilometerChart) {
        updateChartColors(costPerKilometerChart, isDarkMode);
    }
    
    // Update the new Monthly Consumption chart
    if (monthlyConsumptionChart) {
        updateChartColors(monthlyConsumptionChart, isDarkMode);
    }
    
    // Add to global charts collection for dark mode handling
    if (typeof charts === 'object') {
        if (fuelConsumptionChart) charts.fuelConsumption = fuelConsumptionChart;
        if (driverEfficiencyChart) charts.driverEfficiency = driverEfficiencyChart;
        if (vehicleEfficiencyChart) charts.vehicleEfficiency = vehicleEfficiencyChart;
        if (fuelTypeChart) charts.fuelType = fuelTypeChart;
        if (costReadingDifferenceChart) charts.costReadingDifference = costReadingDifferenceChart;
        if (costPerKilometerChart) charts.costPerKilometer = costPerKilometerChart;
        if (monthlyConsumptionChart) charts.monthlyConsumption = monthlyConsumptionChart;
        charts.branchPerformance = branchPerformanceChart;
    }
}

// New function: Render vehicle efficiency comparison chart
function renderVehicleEfficiencyChart(data) {
    const canvas = document.getElementById('vehicle-efficiency-chart');
    if (!canvas) {
        console.log('Vehicle efficiency chart canvas not found');
        return;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not available for vehicle efficiency chart');
        displayNoDataMessage('vehicle-efficiency-chart', 'Chart.js library not loaded');
        return;
    }
    
    try {
        // Group fuel data by vehicle and calculate averages
        const vehiclesData = getVehiclesEfficiencyData(data);
        
        if (vehiclesData.length === 0) {
            console.log('No vehicles data available');
            displayNoDataMessage('vehicle-efficiency-chart', 'No data available for vehicle comparison');
            return;
        }
        
        // Sort by efficiency (descending)
        vehiclesData.sort((a, b) => b.efficiency - a.efficiency);
        
        // Modified: Show all vehicles
        const allVehicles = vehiclesData;
        
        // Destroy previous chart if exists
        if (vehicleEfficiencyChart) {
            vehicleEfficiencyChart.destroy();
        }
        
        // Generate colors - more efficient vehicles get more blue colors, less efficient get more red
        const colors = allVehicles.map((vehicle, index) => {
            // Calculate color based on position within the array (gradient from blue to red)
            const b = Math.floor(200 * (1 - index / (allVehicles.length - 1 || 1)));
            const r = Math.floor(200 * (index / (allVehicles.length - 1 || 1)));
            return `rgba(${r}, 100, ${b}, 0.8)`;
        });
        
        // Process vehicle identifiers for better display
        const processedVehicles = allVehicles.map(vehicle => {
            // Create a display name combining license plate and type if available
            let displayName = vehicle.licensePlate || vehicle.id;
            if (vehicle.type) {
                displayName += ` (${vehicle.type})`;
            }
            
            return {
                ...vehicle,
                displayName: displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName,
                fullName: displayName
            };
        });
        
        // Create chart
        vehicleEfficiencyChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: processedVehicles.map(v => v.displayName),
                datasets: [{
                    label: 'Average Fuel Efficiency (Km/L)',
                    data: processedVehicles.map(v => v.efficiency.toFixed(2)),
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: getTextColor(),
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                // Show full vehicle details in tooltip title
                                const dataIndex = context[0].dataIndex;
                                return processedVehicles[dataIndex].fullName;
                            },
                            label: function(context) {
                                const vehicle = processedVehicles[context.dataIndex];
                                return [
                                    `Efficiency: ${vehicle.efficiency.toFixed(2)} Km/L`,
                                    `Total Distance: ${vehicle.totalDistance.toFixed(0)} Km`,
                                    `Total Fuel: ${vehicle.totalFuel.toFixed(2)} L`,
                                    `Records Count: ${vehicle.recordCount}`
                                ];
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Comparison of Fuel Efficiency Among Vehicles',
                        color: getTextColor(),
                        font: {
                            size: 16,
                            family: 'Cairo, Arial, sans-serif'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Fuel Efficiency (Km/L)',
                            color: getTextColor(),
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        },
                        grid: {
                            color: getGridColor()
                        },
                        ticks: {
                            color: getTextColor(),
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Vehicle',
                            color: getTextColor(),
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        },
                        grid: {
                            color: getGridColor()
                        },
                        ticks: {
                            color: getTextColor(),
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            },
                            // Make sure all labels are visible
                            autoSkip: false
                        }
                    }
                },
                // Add better bar spacing when there are many vehicles
                barPercentage: allVehicles.length > 10 ? 0.8 : 0.9,
                categoryPercentage: allVehicles.length > 10 ? 0.8 : 0.9
            }
        });
        
        // Add to global charts collection for dark mode handling
        if (typeof charts === 'object') {
            charts.vehicleEfficiency = vehicleEfficiencyChart;
        }
        
        console.log('Vehicle efficiency chart rendered with', allVehicles.length, 'vehicles');
    } catch (error) {
        console.error('Error rendering vehicle efficiency chart:', error);
        displayNoDataMessage('vehicle-efficiency-chart', 'Error rendering vehicle efficiency chart');
    }
}

// New function to get vehicle efficiency data
function getVehiclesEfficiencyData(fuelRecords) {
    // Map to hold vehicle data
    const vehiclesMap = {};
    
    // Process all fuel records
    fuelRecords.forEach(record => {
        // Get vehicle ID
        const vehicleId = record['Vehicle ID'] || record.vehicle || '';
        if (!vehicleId) return;
        
        // Get vehicle details
        let vehicleDetails = {
            id: vehicleId,
            licensePlate: record['License Plate'] || '',
            type: record['Vehicle Type'] || ''
        };
        
        // If we have access to global vehicles data, get more details
        if (vehicles && Array.isArray(vehicles)) {
            const globalVehicle = vehicles.find(v => 
                v['Vehicle ID'] === vehicleId || 
                v.id === vehicleId || 
                v['Vehicle VIN/SN'] === vehicleId
            );
            
            if (globalVehicle) {
                vehicleDetails = {
                    ...vehicleDetails,
                    licensePlate: globalVehicle['License Plate'] || vehicleDetails.licensePlate,
                    type: globalVehicle['Service Type'] || globalVehicle['Vehicle Type'] || vehicleDetails.type
                };
            }
        }
        
        // Parse consumption/efficiency value
        let efficiency = 0;
        if (record['Consumption Rate']) {
            efficiency = parseFloat(record['Consumption Rate']);
        } else if (record.Distance && record.Quantity && record.Quantity > 0) {
            efficiency = parseFloat(record.Distance) / parseFloat(record.Quantity);
        }
        
        // Parse distance and quantity
        const distance = parseFloat(record.Distance) || 0;
        const quantity = parseFloat(record.Quantity) || 0;
        
        // Skip invalid records
        if (efficiency <= 0 || isNaN(efficiency) || distance <= 0 || quantity <= 0) {
            return;
        }
        
        // Initialize vehicle data if not exists
        if (!vehiclesMap[vehicleId]) {
            vehiclesMap[vehicleId] = {
                id: vehicleId,
                licensePlate: vehicleDetails.licensePlate,
                type: vehicleDetails.type,
                totalDistance: 0,
                totalFuel: 0,
                recordCount: 0,
                efficiency: 0
            };
        }
        
        // Update vehicle data
        vehiclesMap[vehicleId].totalDistance += distance;
        vehiclesMap[vehicleId].totalFuel += quantity;
        vehiclesMap[vehicleId].recordCount++;
    });
    
    // Calculate average efficiency for each vehicle
    const vehiclesArray = Object.values(vehiclesMap).map(vehicle => {
        if (vehicle.totalFuel > 0) {
            vehicle.efficiency = vehicle.totalDistance / vehicle.totalFuel;
        }
        return vehicle;
    });
    
    // Filter out vehicles with no data
    return vehiclesArray.filter(vehicle => vehicle.recordCount > 0);
}

// NEW FUNCTION: Render Cost and Reading Difference Tracking Chart
function renderCostReadingDifferenceChart(data, viewType = 'cost', vehicleFilter = 'all') {
    const canvas = document.getElementById('cost-reading-chart');
    if (!canvas) {
        console.error('Cannot find cost-reading chart canvas');
        return;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Cannot render cost-reading chart.');
        return;
    }
    
    try {
        console.log('Rendering Cost and Reading chart with', data.length, 'records, view:', viewType);
        
        // We're not filtering by vehicle anymore, use all data
        let filteredData = data;
        
        // If no data, show message
        if (!filteredData.length) {
            displayNoDataMessage('cost-reading-chart', `No cost and reading data available`);
            return;
        }

        // Sort data by date (oldest first)
        const sortedData = [...filteredData].sort((a, b) => {
            return new Date(a.Date) - new Date(b.Date);
        });
        
        // Destroy existing chart if it exists
        if (costReadingDifferenceChart) {
            costReadingDifferenceChart.destroy();
        }

        // Always use single vehicle mode (for all vehicles)
        renderSingleVehicleCostReadingChart(sortedData, viewType, 'all');
        
    } catch (error) {
        console.error('Error rendering Cost and Reading Difference chart:', error);
        displayNoDataMessage('cost-reading-chart', 'Error rendering Cost and Reading Difference chart');
    }
}

// New function to render the chart for a single vehicle or all vehicles averaged
function renderSingleVehicleCostReadingChart(data, viewType, vehicleFilter) {
    const canvas = document.getElementById('cost-reading-chart');
    
    // Group data by date
    const dateGroups = {};
    
    data.forEach(record => {
        try {
            // Format date for consistent grouping
            const dateObj = new Date(record.Date);
            
            // Skip invalid dates
            if (isNaN(dateObj.getTime())) {
                return;
            }
            
            const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Create date entry if it doesn't exist
            if (!dateGroups[dateKey]) {
                dateGroups[dateKey] = {
                    date: dateObj,
                    records: [],
                    totalCost: 0,
                    totalDistance: 0,
                    count: 0,
                    vehicleCounts: {}
                };
            }
            
            // Extract cost and distance
            let cost = 0;
            if (typeof record.Amount === 'string') {
                cost = parseFloat(record.Amount.replace(/[£$]/g, '')) || 0;
            } else if (typeof record.Amount === 'number') {
                cost = record.Amount;
            }
            
            const distance = parseFloat(record.Distance) || 0;
            const vehicleId = record['Vehicle ID'] || record.vehicle;
            
            // Count unique vehicles per day
            if (vehicleId && !dateGroups[dateKey].vehicleCounts[vehicleId]) {
                dateGroups[dateKey].vehicleCounts[vehicleId] = true;
            }
            
            // Add to totals
            dateGroups[dateKey].totalCost += cost;
            dateGroups[dateKey].totalDistance += distance;
            dateGroups[dateKey].count++;
            dateGroups[dateKey].records.push({
                ...record,
                parsedCost: cost,
                parsedDistance: distance
            });
        } catch (error) {
            console.error('Error processing record for date grouping:', error, record);
        }
    });
    
    // Convert grouped data to arrays
    const dateKeys = Object.keys(dateGroups).sort();
    const labels = [];
    const costData = [];
    const distanceData = [];
    
    // Process each date group
    dateKeys.forEach(dateKey => {
        const group = dateGroups[dateKey];
        
        // Format date for display
        const formattedDate = group.date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        labels.push(formattedDate);
        
        // Calculate cost - if all vehicles, calculate average per vehicle
        if (vehicleFilter === 'all') {
            const uniqueVehicleCount = Object.keys(group.vehicleCounts).length;
            if (uniqueVehicleCount > 0) {
                costData.push(group.totalCost / uniqueVehicleCount);
            } else {
                costData.push(0);
            }
        } else {
            costData.push(group.totalCost);
        }
        
        // Calculate distance - if all vehicles, calculate average per vehicle
        if (vehicleFilter === 'all') {
            const uniqueVehicleCount = Object.keys(group.vehicleCounts).length;
            if (uniqueVehicleCount > 0) {
                distanceData.push(group.totalDistance / uniqueVehicleCount);
            } else {
                distanceData.push(0);
            }
        } else {
            distanceData.push(group.totalDistance);
        }
    });
    
    // Determine if dark mode is active for chart colors
    const isDarkMode = document.body.classList.contains('dark-mode');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#e0e0e0' : '#666';
    
    // Get vehicle name if a specific one is selected
    let vehicleTitle = 'All Vehicles (Avg)';
    if (vehicleFilter !== 'all') {
        // First, try to find the vehicle in the vehicles array by ID
        const vehicle = vehicles.find(v => 
            v['Vehicle ID'] === vehicleFilter || 
            v.id === vehicleFilter || 
            v['Vehicle VIN/SN'] === vehicleFilter
        );
        
        if (vehicle) {
            // Get license plate with fallbacks
            vehicleTitle = vehicle['License Plate'] || 
                       vehicle['license_plate'] || 
                       vehicle.licensePlate || 
                       vehicle.registration ||
                       vehicleFilter;
                       
            console.log('Found vehicle for title:', vehicle);
        } else {
            // Try to get license plate from the first record in filtered data
            if (data.length > 0 && data[0]['License Plate']) {
                vehicleTitle = data[0]['License Plate'];
                console.log('Using license plate from data record:', vehicleTitle);
            } else {
                vehicleTitle = `Vehicle ${vehicleFilter}`;
                console.log('Using default vehicle ID title:', vehicleTitle);
            }
        }
    }
    
    // Determine which dataset to highlight based on view type
    const primaryDataset = viewType === 'cost' ? 
        {
            label: `Cost (EGP)${vehicleFilter !== 'all' ? ' - ' + vehicleTitle : ''}`,
            data: costData,
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: 'rgb(255, 99, 132)',
            pointBorderColor: '#fff',
            yAxisID: 'y',
            order: 1
        } : 
        {
            label: `Reading Difference (Km)${vehicleFilter !== 'all' ? ' - ' + vehicleTitle : ''}`,
            data: distanceData,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: 'rgb(54, 162, 235)',
            pointBorderColor: '#fff',
            yAxisID: 'y1',
            order: 1
        };
        
    // Determine which dataset to make secondary
    const secondaryDataset = viewType === 'cost' ?
        {
            label: `Reading Difference (Km)${vehicleFilter !== 'all' ? ' - ' + vehicleTitle : ''}`,
            data: distanceData,
            backgroundColor: 'rgba(54, 162, 235, 0.3)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointBackgroundColor: 'rgb(54, 162, 235)',
            pointBorderColor: '#fff',
            pointRadius: 3,
            yAxisID: 'y1',
            order: 2
        } :
        {
            label: `Cost (EGP)${vehicleFilter !== 'all' ? ' - ' + vehicleTitle : ''}`,
            data: costData,
            backgroundColor: 'rgba(255, 99, 132, 0.3)',
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointBackgroundColor: 'rgb(255, 99, 132)',
            pointBorderColor: '#fff',
            pointRadius: 3,
            yAxisID: 'y',
            order: 2
        };
    
    // Create chart
    costReadingDifferenceChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [primaryDataset, secondaryDataset]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label = label.split(' - ')[0]; // Remove vehicle name from tooltip
                            }
                            
                            if (context.parsed.y !== null) {
                                const idx = context.dataIndex;
                                
                                // Cost formatting
                                if (context.dataset.label.includes('Cost')) {
                                    const cost = context.parsed.y;
                                    label += ': EGP ' + cost.toFixed(2);
                                    
                                    // Add efficiency information when showing cost
                                    const distance = distanceData[idx];
                                    if (distance > 0 && cost > 0) {
                                        const efficiency = distance / cost;
                                        label += ` (${efficiency.toFixed(1)} Km/EGP)`;
                                    }
                                } 
                                // Reading difference formatting
                                else if (context.dataset.label.includes('Reading')) {
                                    const distance = context.parsed.y;
                                    label += ': ' + distance.toFixed(1) + ' Km';
                                    
                                    // Add fuel efficiency if we have cost data
                                    const cost = costData[idx];
                                    if (distance > 0 && cost > 0) {
                                        const costPerKm = cost / distance;
                                        label += ` (EGP ${costPerKm.toFixed(2)}/Km)`;
                                    }
                                }
                            }
                            
                            return label;
                        }
                    }
                },
                title: {
                    display: true,
                    text: vehicleFilter === 'all' 
                        ? (viewType === 'cost' ? 'Average Cost Per Vehicle' : 'Average Reading Difference Per Vehicle') 
                        : (viewType === 'cost' ? `Cost Tracking: ${vehicleTitle}` : `Reading Difference: ${vehicleTitle}`),
                    color: textColor
                }
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        autoSkip: labels.length > 15,
                        maxTicksLimit: 15,
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    position: 'left',
                    title: {
                        display: true,
                        text: vehicleFilter === 'all' ? 'Average Cost (EGP)' : 'Cost (EGP)',
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    },
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return 'EGP ' + value.toFixed(2);
                        }
                    }
                },
                y1: {
                    position: 'right',
                    title: {
                        display: true,
                        text: vehicleFilter === 'all' ? 'Average Distance (Km)' : 'Distance (Km)',
                        color: textColor
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: gridColor
                    },
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return value.toFixed(1) + ' Km';
                        }
                    }
                }
            }
        }
    });
    
    // Add to global charts collection
    if (typeof charts === 'object') {
        charts.costReadingDifference = costReadingDifferenceChart;
    }
    
    // Show canvas
    canvas.style.display = 'block';
    
    // Remove any no-data message
    const container = canvas.parentElement;
    const noDataMessage = container.querySelector('.no-data-message');
    if (noDataMessage) {
        noDataMessage.remove();
    }
    
    console.log('Single mode Cost/Reading chart rendered for', vehicleFilter === 'all' ? 'all vehicles (averaged)' : vehicleTitle);
}

// After the charts are created, apply consistent sizes
function applyConsistentChartSizes() {
    // Apply consistent sizing to the key charts
    const chartContainers = document.querySelectorAll('#fuel-page .chart-container');
    chartContainers.forEach(container => {
        container.style.width = '100%';
        
        // Get the canvas element in this container
        const canvas = container.querySelector('canvas');
        if (canvas) {
            canvas.style.width = '100%';
            canvas.style.maxWidth = '100%';
            canvas.style.height = '350px';
        }
    });
    
    console.log('Applied consistent chart sizes to fuel page charts');
}

// New function to populate driver filter options - modified to show only English names
function updateDriverFilterOptions() {
    const driverFilter = document.getElementById('driver-filter');
    if (!driverFilter) {
        console.error('Driver filter element not found');
        return;
    }
    
    console.log('Updating driver filter options from fuel records data - English names only');
    
    // Clear existing options except the first one
    while (driverFilter.options.length > 1) {
        driverFilter.remove(1);
    }
    
    // Get unique drivers from the fuel records using ONLY English driver names
    const uniqueDrivers = new Set();
    
    if (fuelRecords && Array.isArray(fuelRecords)) {
        console.log(`Processing ${fuelRecords.length} fuel records for English driver names`);
        
        // Debug: Log a sample record to verify structure
        if (fuelRecords.length > 0) {
            console.log('Sample fuel record:', fuelRecords[0]);
        }
        
        fuelRecords.forEach((record, index) => {
            // Only check the Driver Name (EN) field
            if (record['Driver Name (EN)']) {
                uniqueDrivers.add(record['Driver Name (EN)']);
                console.log(`Found English driver name in record ${index}: ${record['Driver Name (EN)']}`);
            }
        });
    } else {
        console.warn('No fuel records available or fuelRecords is not an array');
    }
    
    // Also try to get English driver names from the global drivers array as fallback
    if (drivers && Array.isArray(drivers) && drivers.length > 0) {
        console.log(`Checking ${drivers.length} entries in global drivers array for English names`);
        
        drivers.forEach(driver => {
            // Only use English names
            const driverName = driver['Driver Name (EN)'] || driver.name;
            if (driverName) {
                uniqueDrivers.add(driverName);
                console.log(`Added English driver name from global drivers array: ${driverName}`);
            }
        });
    }
    
    // Convert to array and sort
    const driverNames = Array.from(uniqueDrivers).filter(Boolean).sort();
    
    console.log(`Found ${driverNames.length} unique English driver names in total`);
    
    // Add each driver name as an option
    driverNames.forEach(driverName => {
        const option = document.createElement('option');
        option.value = driverName; 
        option.textContent = driverName;
        driverFilter.appendChild(option);
    });
    
    console.log(`Added ${driverNames.length} English driver names to filter dropdown`);
    
    // If no drivers were found, add a fallback option
    if (driverNames.length === 0) {
        console.warn('No English driver names found, adding fallback sample drivers');
        
        // Add some sample English driver names as fallback
        const sampleDrivers = [
            "Ahmed Abdel Aziz", 
            "Mohamed Ahmed Ali", 
            "Khaled Mohamed Abdullah",
            "Omar Hassan",
            "Mustafa Ibrahim",
            "Mahmoud Ali"
        ];
        
        sampleDrivers.forEach(driverName => {
            const option = document.createElement('option');
            option.value = driverName;
            option.textContent = driverName;
            driverFilter.appendChild(option);
        });
        
        console.log(`Added ${sampleDrivers.length} sample English driver names as fallback`);
    }
}

// New function to populate branch filter options
function updateBranchFilterOptions() {
    const branchFilter = document.getElementById('branch-filter');
    if (!branchFilter) {
        console.error('Branch filter element not found');
        return;
    }
    
    console.log('Updating branch filter options from records data');
    
    // Clear existing options except the first one
    while (branchFilter.options.length > 1) {
        branchFilter.remove(1);
    }
    
    // Get unique branches from the fuel records and vehicles
    const uniqueBranches = new Set();
    
    // Check fuel records for branch information
    if (fuelRecords && Array.isArray(fuelRecords)) {
        fuelRecords.forEach(record => {
            if (record.Branch) {
                uniqueBranches.add(record.Branch);
            }
            if (record['Current Location']) {
                uniqueBranches.add(record['Current Location']);
            }
        });
    }
    
    // Check vehicles for branch information
    if (vehicles && Array.isArray(vehicles)) {
        vehicles.forEach(vehicle => {
            if (vehicle.Branch) {
                uniqueBranches.add(vehicle.Branch);
            }
            if (vehicle['Current Location']) {
                uniqueBranches.add(vehicle['Current Location']);
            }
        });
    }
    
    // Convert to array and sort
    const branchNames = Array.from(uniqueBranches).filter(Boolean).sort();
    
    console.log(`Found ${branchNames.length} unique branches`);
    
    // Add each branch as an option
    branchNames.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch;
        option.textContent = branch;
        branchFilter.appendChild(option);
    });
    
    console.log(`Added ${branchNames.length} branches to filter dropdown`);
    
    // If no branches were found, add some fallback options
    if (branchNames.length === 0) {
        const sampleBranches = ["Main Office", "North Branch", "South Branch", "East Branch", "West Branch"];
        sampleBranches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch;
            option.textContent = branch;
            branchFilter.appendChild(option);
        });
        console.log(`Added ${sampleBranches.length} sample branches as fallback`);
    }
}

// New function to initialize search functionality
function initializeSearchFunctionality() {
    const searchInput = document.getElementById('fuel-search');
    const clearSearchBtn = document.getElementById('clear-search');
    
    if (!searchInput || !clearSearchBtn) return;
    
    // Add event listener to search input
    searchInput.addEventListener('input', function() {
        // Show clear button if there's text
        clearSearchBtn.style.display = this.value ? 'block' : 'none';
        
        // If there's an Apply button, we don't auto-filter
        const applyButton = document.getElementById('apply-fuel-filters');
        if (!applyButton) {
            // Auto filter if no apply button
            handleSearchFilter(this.value);
        }
    });
    
    // Clear search box and reset filters
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        this.style.display = 'none';
        
        // Check if we have an apply button
        const applyButton = document.getElementById('apply-fuel-filters');
        if (!applyButton) {
            // Auto clear filter if no apply button
            handleSearchFilter('');
        }
    });
    
    // Initially hide the clear button
    clearSearchBtn.style.display = 'none';
    
    // Add event listener to the apply filters button to include search
    const applyButton = document.getElementById('apply-fuel-filters');
    if (applyButton) {
        // Replace existing click event
        applyButton.removeEventListener('click', renderFuelDashboard);
        
        applyButton.addEventListener('click', function() {
            // Get search term
            const searchTerm = searchInput.value.trim().toLowerCase();
            
            // Apply filters with search term
            renderFuelDashboardWithSearch(searchTerm);
        });
    }
}

// New function to handle search filter
function handleSearchFilter(searchTerm) {
    // Search in the table directly for quick filtering
    const tableRows = document.querySelectorAll('.fuel-records-table tbody tr');
    
    if (!tableRows.length) return;
    
    searchTerm = searchTerm.trim().toLowerCase();
    
    tableRows.forEach(row => {
        if (!searchTerm) {
            // Show all rows if no search term
            row.style.display = '';
            return;
        }
        
        // Get text content from cells (vehicle, date, driver, branch)
        const vehicle = row.cells[0].textContent.toLowerCase();
        const driver = row.cells[2].textContent.toLowerCase();
        // Assuming branch is stored somewhere in the data...
        const branch = row.getAttribute('data-branch') || '';
        
        // Check if any field matches search term
        if (vehicle.includes(searchTerm) || 
            driver.includes(searchTerm) || 
            branch.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update "no records" message
    const visibleRows = document.querySelectorAll('.fuel-records-table tbody tr[style=""]').length;
    const tbody = document.querySelector('.fuel-records-table tbody');
    
    if (tbody && searchTerm && visibleRows === 0) {
        // No matching records
        const noResultsRow = document.createElement('tr');
        noResultsRow.classList.add('no-results-row');
        noResultsRow.innerHTML = `<td colspan="9" class="text-center">No records matching "${searchTerm}"</td>`;
        
        // Remove any existing no-results rows
        document.querySelectorAll('.no-results-row').forEach(el => el.remove());
        
        // Add the no results message
        tbody.appendChild(noResultsRow);
    } else {
        // Remove any existing no-results rows
        document.querySelectorAll('.no-results-row').forEach(el => el.remove());
    }
}

// New function to render dashboard with search
function renderFuelDashboardWithSearch(searchTerm) {
    console.log('Rendering fuel dashboard with search term:', searchTerm);
    
    try {
        // First get filtered data by date and dropdowns
        const filteredData = getFilteredFuelData();
        
        // Then apply search filter if there's a search term
        let searchFilteredData = filteredData;
        
        if (searchTerm) {
            searchFilteredData = filteredData.filter(record => {
                // Search in vehicle info (license plate, vehicle ID)
                const licensePlate = (record['License Plate'] || '').toLowerCase();
                const vehicleId = (record['Vehicle ID'] || record.vehicle || '').toLowerCase();
                
                // Search in driver info
                const driver = (record['Driver Name (EN)'] || record['Driver Name (AR)'] || record['Driver Name'] || '').toLowerCase();
                
                // Search in branch info
                const branch = (record['Branch'] || record['Current Location'] || findVehicleBranch(record['Vehicle ID'] || record.vehicle) || '').toLowerCase();
                
                return licensePlate.includes(searchTerm) || 
                       vehicleId.includes(searchTerm) || 
                       driver.includes(searchTerm) || 
                       branch.includes(searchTerm);
            });
            
            console.log(`Search filter applied: ${filteredData.length} -> ${searchFilteredData.length} records`);
        }
        
        // Update stats and charts with search-filtered data
        updateFuelStats(searchFilteredData);
        renderFuelCharts(searchFilteredData);
        
        // Also update the table display
        updateFuelTableWithFilteredData(searchFilteredData);
        
    } catch (error) {
        console.error('Error rendering dashboard with search:', error);
    }
}

// New function to update the fuel table with filtered data
function updateFuelTableWithFilteredData(filteredData) {
    const tableBody = document.querySelector('#fuel-page .fuel-records-table tbody');
    if (!tableBody) return;
    
    // Create table rows from filtered data
    if (filteredData && filteredData.length > 0) {
        tableBody.innerHTML = filteredData.map(fuel => {
            // Find vehicle and branch info for data-attributes
            const vehicle = vehicles.find(v => 
                v['Vehicle ID'] === (fuel['Vehicle ID'] || fuel.vehicle) || 
                v.id === (fuel['Vehicle ID'] || fuel.vehicle)
            );
            
            const branch = vehicle ? (vehicle['Branch'] || vehicle['Current Location'] || '') : 
                          (fuel['Branch'] || fuel['Current Location'] || '');
            
            // Create row with data attributes for better searching
            const row = createFuelRow(fuel);
            
            // Add data attribute by injecting it into the TR opening tag
            return row.replace('<tr', `<tr data-branch="${branch}"`);
        }).join('');
        
        // Re-attach event listeners
        addFuelActionListeners();
    } else {
        // No data found
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center">No fuel records found</td></tr>`;
    }
}

// New function to render Cost per Kilometer chart
function renderCostPerKilometerChart(data, viewMode = 'vehicles') {
    const canvas = document.getElementById('cost-per-km-chart');
    if (!canvas) {
        console.error('Cannot find cost-per-km chart canvas');
        return;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Cannot render cost per kilometer chart.');
        return;
    }
    
    try {
        console.log('Rendering Cost per Kilometer chart with', data.length, 'records, view mode:', viewMode);
        
        // Group and calculate data based on the view mode (vehicles or branches)
        let chartData;
        if (viewMode === 'vehicles') {
            chartData = calculateCostPerKmByVehicle(data);
        } else {
            chartData = calculateCostPerKmByBranch(data);
        }
        
        // If no data, show message
        if (!chartData || !chartData.labels.length === 0) {
            displayNoDataMessage('cost-per-km-chart', `No cost per kilometer data available for ${viewMode}`);
            return;
        }

        // Destroy existing chart if it exists
        if (costPerKilometerChart) {
            costPerKilometerChart.destroy();
        }
        
        // Determine if dark mode is active for chart colors
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#e0e0e0' : '#666';
        
        // Generate colors based on cost values (higher cost = more red, lower cost = more green)
        const backgroundColors = chartData.data.map((value, index) => {
            // Normalize the value between 0 and 1 based on min and max values
            const min = Math.min(...chartData.data);
            const max = Math.max(...chartData.data);
            const normalized = max === min ? 0.5 : (value - min) / (max - min);
            
            // Create color gradient: green (low cost) to red (high cost)
            const red = Math.floor(255 * normalized);
            const green = Math.floor(255 * (1 - normalized));
            const blue = 60; // Fixed blue component for consistency
            
            return `rgba(${red}, ${green}, ${blue}, 0.7)`;
        });
        
        // Create a horizontal bar chart
        costPerKilometerChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Cost per Kilometer (EGP/Km)',
                    data: chartData.data,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1,
                    barPercentage: 0.8,
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return chartData.fullNames[context[0].dataIndex] || chartData.labels[context[0].dataIndex];
                            },
                            label: function(context) {
                                const value = context.raw;
                                return [
                                    `Cost per Kilometer: EGP ${value.toFixed(3)}`,
                                    `Total Distance: ${chartData.distances[context.dataIndex].toFixed(0)} Km`,
                                    `Total Cost: EGP ${chartData.costs[context.dataIndex].toFixed(2)}`,
                                    `Records: ${chartData.counts[context.dataIndex]}`
                                ];
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: viewMode === 'vehicles' ? 
                            'Cost per Kilometer by Vehicle (Lower is Better)' : 
                            'Cost per Kilometer by Branch (Lower is Better)',
                        color: textColor,
                        font: {
                            size: 16
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Cost per Kilometer (EGP/Km)',
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                return 'EGP ' + value.toFixed(3);
                            }
                        },
                        beginAtZero: true
                    },
                    y: {
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        }
                    }
                }
            }
        });
        
        // Show canvas
        canvas.style.display = 'block';
        
        // Remove any no-data message
        const container = canvas.parentElement;
        const noDataMessage = container.querySelector('.no-data-message');
        if (noDataMessage) {
            noDataMessage.remove();
        }
        
        // Add to global charts collection
        if (typeof charts === 'object') {
            charts.costPerKilometer = costPerKilometerChart;
        }
        
        console.log(`Cost per Kilometer chart rendered by ${viewMode} with ${chartData.labels.length} items`);
    } catch (error) {
        console.error('Error rendering Cost per Kilometer chart:', error);
        displayNoDataMessage('cost-per-km-chart', 'Error rendering Cost per Kilometer chart');
    }
}

// Function to calculate cost per kilometer by vehicle
function calculateCostPerKmByVehicle(data) {
    // Map to store aggregated data per vehicle
    const vehicles = new Map();
    
    // Process all records
    data.forEach(record => {
        // Get vehicle identifiers
        const vehicleId = record['Vehicle ID'] || record.vehicle;
        let licensePlate = record['License Plate'] || '';
        
        // If license plate is not in the record, try to find it from the vehicles array
        if (!licensePlate && vehicleId && vehicles) {
            const vehicleInfo = vehicles.find(v => 
                v['Vehicle ID'] === vehicleId || 
                v.id === vehicleId || 
                v['Vehicle VIN/SN'] === vehicleId
            );
            
            if (vehicleInfo) {
                licensePlate = vehicleInfo['License Plate'] || '';
            }
        }
        
        // Create a unique identifier for the vehicle
        const vehicleKey = licensePlate || vehicleId || 'Unknown';
        
        // Skip if no key
        if (vehicleKey === 'Unknown') return;
        
        // Calculate cost and distance for this record
        let cost = 0;
        if (typeof record.Amount === 'string') {
            cost = parseFloat(record.Amount.replace(/[£$,]/g, '')) || 0;
        } else if (typeof record.Amount === 'number') {
            cost = record.Amount;
        }
        
        const distance = parseFloat(record.Distance) || 0;
        
        // Skip invalid records
        if (cost <= 0 || distance <= 0) return;
        
        // Initialize or update vehicle data
        if (!vehicles.has(vehicleKey)) {
            vehicles.set(vehicleKey, {
                id: vehicleId,
                totalCost: 0,
                totalDistance: 0,
                count: 0
            });
        }
        
        // Update totals
        const vehicleData = vehicles.get(vehicleKey);
        vehicleData.totalCost += cost;
        vehicleData.totalDistance += distance;
        vehicleData.count++;
    });
    
    // Calculate cost per kilometer for each vehicle
    const result = {
        labels: [],
        data: [],
        costs: [],
        distances: [],
        counts: [],
        fullNames: []
    };
    
    // Convert to arrays and sort by cost per km (ascending - better performers first)
    Array.from(vehicles.entries())
        .filter(([_, data]) => data.totalDistance > 0 && data.totalCost > 0)
        .map(([key, data]) => ({
            name: key,
            costPerKm: data.totalDistance > 0 ? data.totalCost / data.totalDistance : 0,
            totalCost: data.totalCost,
            totalDistance: data.totalDistance,
            count: data.count
        }))
        .sort((a, b) => a.costPerKm - b.costPerKm) // Sort by cost per km (ascending)
        .slice(0, 15) // Limit to top 15 for readability
        .forEach(vehicle => {
            result.labels.push(truncateText(vehicle.name, 15));
            result.fullNames.push(vehicle.name);
            result.data.push(vehicle.costPerKm);
            result.costs.push(vehicle.totalCost);
            result.distances.push(vehicle.totalDistance);
            result.counts.push(vehicle.count);
        });
    
    return result;
}

// Function to calculate cost per kilometer by branch
function calculateCostPerKmByBranch(data) {
    // Map to store aggregated data per branch
    const branches = new Map();
    
    // Process all records
    data.forEach(record => {
        // Get branch info
        const branch = record['Branch'] || 
                     record['Current Location'] || 
                     findVehicleBranch(record['Vehicle ID'] || record.vehicle) || 
                     'Unknown';
        
        // Skip if no branch info
        if (branch === 'Unknown') return;
        
        // Calculate cost and distance for this record
        let cost = 0;
        if (typeof record.Amount === 'string') {
            cost = parseFloat(record.Amount.replace(/[£$,]/g, '')) || 0;
        } else if (typeof record.Amount === 'number') {
            cost = record.Amount;
        }
        
        const distance = parseFloat(record.Distance) || 0;
        
        // Skip invalid records
        if (cost <= 0 || distance <= 0) return;
        
        // Initialize or update branch data
        if (!branches.has(branch)) {
            branches.set(branch, {
                totalCost: 0,
                totalDistance: 0,
                count: 0
            });
        }
        
        // Update totals
        const branchData = branches.get(branch);
        branchData.totalCost += cost;
        branchData.totalDistance += distance;
        branchData.count++;
    });
    
    // Calculate cost per kilometer for each branch
    const result = {
        labels: [],
        data: [],
        costs: [],
        distances: [],
        counts: [],
        fullNames: []
    };
    
    // Convert to arrays and sort by cost per km (ascending - better performers first)
    Array.from(branches.entries())
        .filter(([_, data]) => data.totalDistance > 0 && data.totalCost > 0)
        .map(([branch, data]) => ({
            name: branch,
            costPerKm: data.totalDistance > 0 ? data.totalCost / data.totalDistance : 0,
            totalCost: data.totalCost,
            totalDistance: data.totalDistance,
            count: data.count
        }))
        .sort((a, b) => a.costPerKm - b.costPerKm) // Sort by cost per km (ascending)
        .forEach(branch => {
            result.labels.push(truncateText(branch.name, 20));
            result.fullNames.push(branch.name);
            result.data.push(branch.costPerKm);
            result.costs.push(branch.totalCost);
            result.distances.push(branch.totalDistance);
            result.counts.push(branch.count);
        });
    
    return result;
}

// Helper function to truncate text with ellipsis if it's too long
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Function to initialize and populate vehicle selector for monthly consumption chart
function initializeMonthlyConsumptionVehicleSelector(data) {
    const vehicleSelector = document.getElementById('monthly-consumption-vehicle-selector');
    if (!vehicleSelector) return;
    
    // Get vehicle data from records
    const vehicleData = getMonthlyConsumptionVehicles(data);
    
    // Clear existing options except the first one (Compare Top Vehicles)
    while (vehicleSelector.options.length > 1) {
        vehicleSelector.remove(1);
    }
    
    // Add all vehicles that have sufficient data
    vehicleData.vehicles.forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle.id;
        option.textContent = vehicle.displayName;
        vehicleSelector.appendChild(option);
    });
    
    // Add event listener to update chart when selection changes
    vehicleSelector.addEventListener('change', function() {
        const viewMode = document.querySelector('.btn-chart-view[data-chart="monthly-consumption"].active')?.getAttribute('data-view') || 'quantity';
        renderMonthlyConsumptionChart(data, viewMode);
    });
}

// Function to get vehicles with sufficient fuel data (at least 2 months of data)
function getMonthlyConsumptionVehicles(data) {
    // Group data by vehicle
    const vehicleMap = new Map();
    const allMonths = new Set();
    
    // Process all records to identify vehicles with sufficient data
    data.forEach(record => {
        const vehicleId = record['Vehicle ID'] || record.vehicle;
        if (!vehicleId) return;
        
        // Get license plate - enhanced to better find license plate
        let licensePlate = record['License Plate'] || '';
        
        // If license plate is not in the record, try to find it from the vehicles array
        if (!licensePlate && vehicleId && window.vehicles) {
            const vehicleInfo = window.vehicles.find(v => 
                v['Vehicle ID'] === vehicleId || 
                v.id === vehicleId || 
                v['Vehicle VIN/SN'] === vehicleId
            );
            
            if (vehicleInfo) {
                licensePlate = vehicleInfo['License Plate'] || '';
            }
        }
        
        // Create display name - improved to show both license plate and ID
        const displayName = licensePlate ? 
            `${licensePlate} (${vehicleId})` : 
            `Vehicle ${vehicleId}`;
        
        // Skip if no usable identifier
        if (!displayName) return;
        
        // Parse date
        let recordDate;
        try {
            recordDate = new Date(record.Date);
            if (isNaN(recordDate.getTime())) return; // Skip invalid dates
        } catch (error) {
            return; // Skip if date can't be parsed
        }
        
        // Create month key (YYYY-MM)
        const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Format month for display (MMM YYYY)
        const monthDisplay = recordDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
        });
        
        // Add month to all months set
        allMonths.add(monthKey);
        
        // Initialize vehicle data if not exists
        if (!vehicleMap.has(vehicleId)) {
            vehicleMap.set(vehicleId, {
                id: vehicleId,
                displayName,
                months: new Map()
            });
        }
        
        // Get vehicle data
        const vehicleData = vehicleMap.get(vehicleId);
        
        // Initialize month data if not exists
        if (!vehicleData.months.has(monthKey)) {
            vehicleData.months.set(monthKey, {
                display: monthDisplay,
                totalFuel: 0,
                totalDistance: 0,
                recordCount: 0
            });
        }
        
        // Update month data
        const monthData = vehicleData.months.get(monthKey);
        
        // Parse and add fuel quantity
        const fuelQuantity = parseFloat(record.Quantity) || 0;
        if (fuelQuantity > 0) {
            monthData.totalFuel += fuelQuantity;
        }
        
        // Parse and add distance
        const distance = parseFloat(record.Distance) || 0;
        if (distance > 0) {
            monthData.totalDistance += distance;
        }
        
        // Increment record count
        monthData.recordCount++;
    });
    
    // Filter vehicles with at least 2 months of data and sort by total fuel consumption
    const vehicles = Array.from(vehicleMap.values())
        .filter(vehicle => vehicle.months.size >= 2)
        .sort((a, b) => b.totalFuel - a.totalFuel); // Sort by total fuel consumption (descending)
    
    return {
        vehicles: vehicles,
        count: vehicles.length
    };
}

// Function to render Monthly Fuel Consumption per Vehicle Chart
function renderMonthlyConsumptionChart(data, viewMode = 'quantity') {
    const canvas = document.getElementById('monthly-consumption-chart');
    if (!canvas) {
        console.error('Cannot find monthly-consumption-chart canvas');
        return;
    }
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Cannot render monthly consumption chart.');
        return;
    }
    
    try {
        console.log('Rendering Monthly Consumption chart with', data.length, 'records, view mode:', viewMode);
        
        // Get vehicle selector value
        const vehicleSelector = document.getElementById('monthly-consumption-vehicle-selector');
        const selectedValue = vehicleSelector ? vehicleSelector.value : 'compare';
        
        // Get chart data based on selection and view mode
        const chartData = calculateMonthlyConsumptionData(data, selectedValue, viewMode);
        
        // If no data, show message
        if (!chartData || !chartData.labels.length === 0) {
            displayNoDataMessage('monthly-consumption-chart', `No monthly consumption data available`);
            return;
        }

        // Destroy existing chart if it exists
        if (monthlyConsumptionChart) {
            monthlyConsumptionChart.destroy();
        }
        
        // Determine if dark mode is active for chart colors
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#e0e0e0' : '#666';
        
        // Create chart
        monthlyConsumptionChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                stacked: false,
                plugins: {
                    title: {
                        display: true,
                        text: chartData.title,
                        color: textColor,
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Month',
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: chartData.yAxisLabel,
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                if (viewMode === 'consumption') {
                                    return value.toFixed(1) + ' Km/L';
                                } else {
                                    return value.toFixed(0) + ' L';
                                }
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Show canvas
        canvas.style.display = 'block';
        
        // Remove any no-data message
        const container = canvas.parentElement;
        const noDataMessage = container.querySelector('.no-data-message');
        if (noDataMessage) {
            noDataMessage.remove();
        }
        
        // Add to global charts collection
        if (typeof charts === 'object') {
            charts.monthlyConsumption = monthlyConsumptionChart;
        }
        
        console.log(`Monthly Consumption chart rendered in ${viewMode} mode with ${chartData.datasets.length} datasets`);
    } catch (error) {
        console.error('Error rendering Monthly Consumption chart:', error);
        displayNoDataMessage('monthly-consumption-chart', 'Error rendering Monthly Consumption chart');
    }
}

// Function to calculate data for Monthly Consumption chart
function calculateMonthlyConsumptionData(data, vehicleSelection, viewMode) {
    // Initialize result structure
    const result = {
        labels: [],
        datasets: [],
        title: viewMode === 'quantity' ? 
            'Monthly Fuel Consumption (Liters)' : 
            'Monthly Fuel Efficiency (Km/L)',
        yAxisLabel: viewMode === 'quantity' ? 'Fuel Quantity (L)' : 'Efficiency (Km/L)'
    };
    
    try {
        // Create map to store monthly data by vehicle
        const vehicleMonthlyData = new Map();
        const allMonths = new Set();
        
        // Process all data records
        data.forEach(record => {
            // Get vehicle ID
            const vehicleId = record['Vehicle ID'] || record.vehicle;
            if (!vehicleId) return;
            
            // Get license plate - improved to better find license plate
            let licensePlate = record['License Plate'] || '';
            
            // If license plate is not in the record, try to find it from the vehicles array
            if (!licensePlate && vehicleId && window.vehicles) {
                const vehicleInfo = window.vehicles.find(v => 
                    v['Vehicle ID'] === vehicleId || 
                    v.id === vehicleId || 
                    v['Vehicle VIN/SN'] === vehicleId
                );
                
                if (vehicleInfo) {
                    licensePlate = vehicleInfo['License Plate'] || '';
                }
            }
            
            // Create display name - improved to show both license plate and ID
            const displayName = licensePlate ? 
                `${licensePlate} (${vehicleId})` : 
                `Vehicle ${vehicleId}`;
            
            // Skip if no usable identifier
            if (!displayName) return;
            
            // Parse date
            let recordDate;
            try {
                recordDate = new Date(record.Date);
                if (isNaN(recordDate.getTime())) return; // Skip invalid dates
            } catch (error) {
                return; // Skip if date can't be parsed
            }
            
            // Create month key (YYYY-MM)
            const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
            
            // Format month for display (MMM YYYY)
            const monthDisplay = recordDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short' 
            });
            
            // Add month to all months set
            allMonths.add(monthKey);
            
            // Initialize vehicle data if not exists
            if (!vehicleMonthlyData.has(vehicleId)) {
                vehicleMonthlyData.set(vehicleId, {
                    id: vehicleId,
                    displayName,
                    months: new Map()
                });
            }
            
            // Get vehicle data
            const vehicleData = vehicleMonthlyData.get(vehicleId);
            
            // Initialize month data if not exists
            if (!vehicleData.months.has(monthKey)) {
                vehicleData.months.set(monthKey, {
                    display: monthDisplay,
                    totalFuel: 0,
                    totalDistance: 0,
                    recordCount: 0
                });
            }
            
            // Update month data
            const monthData = vehicleData.months.get(monthKey);
            
            // Parse and add fuel quantity
            const fuelQuantity = parseFloat(record.Quantity) || 0;
            if (fuelQuantity > 0) {
                monthData.totalFuel += fuelQuantity;
            }
            
            // Parse and add distance
            const distance = parseFloat(record.Distance) || 0;
            if (distance > 0) {
                monthData.totalDistance += distance;
            }
            
            // Increment record count
            monthData.recordCount++;
        });
        
        // Convert all months to sorted array
        const sortedMonths = Array.from(allMonths).sort();
        
        // Create labels array from sorted months
        result.labels = sortedMonths.map(month => {
            // Find any vehicle that has this month
            for (const [_, vehicleData] of vehicleMonthlyData.entries()) {
                const monthData = vehicleData.months.get(month);
                if (monthData) {
                    return monthData.display;
                }
            }
            return month; // Fallback to raw month key
        });
        
        // Process vehicle data into datasets based on selection
        if (vehicleSelection === 'compare') {
            // Get top 5 vehicles by total fuel consumption
            const topVehicles = Array.from(vehicleMonthlyData.values())
                .filter(vehicleData => {
                    // Calculate total fuel across all months
                    let totalFuel = 0;
                    for (const [_, monthData] of vehicleData.months.entries()) {
                        totalFuel += monthData.totalFuel;
                    }
                    return totalFuel > 0;
                })
                .sort((a, b) => {
                    // Sort by total fuel consumption (descending)
                    let totalFuelA = 0;
                    let totalFuelB = 0;
                    
                    for (const [_, monthData] of a.months.entries()) {
                        totalFuelA += monthData.totalFuel;
                    }
                    
                    for (const [_, monthData] of b.months.entries()) {
                        totalFuelB += monthData.totalFuel;
                    }
                    
                    return totalFuelB - totalFuelA;
                })
                .slice(0, 5);
            
            // Create dataset for each top vehicle
            const colorPalette = [
                { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgb(54, 162, 235)' },
                { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgb(255, 99, 132)' },
                { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgb(75, 192, 192)' },
                { bg: 'rgba(255, 206, 86, 0.2)', border: 'rgb(255, 206, 86)' },
                { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgb(153, 102, 255)' }
            ];
            
            topVehicles.forEach((vehicleData, index) => {
                const dataset = {
                    label: vehicleData.displayName,
                    data: [],
                    fill: true,
                    backgroundColor: colorPalette[index % colorPalette.length].bg,
                    borderColor: colorPalette[index % colorPalette.length].border,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4
                };
                
                // Add data for each month
                sortedMonths.forEach(monthKey => {
                    const monthData = vehicleData.months.get(monthKey);
                    
                    if (monthData) {
                        if (viewMode === 'quantity') {
                            // Show total fuel consumption
                            dataset.data.push(monthData.totalFuel);
                        } else {
                            // Show fuel efficiency (Km/L)
                            const efficiency = monthData.totalFuel > 0 ? 
                                monthData.totalDistance / monthData.totalFuel : 0;
                            dataset.data.push(efficiency);
                        }
                    } else {
                        // No data for this month
                        dataset.data.push(null);
                    }
                });
                
                result.datasets.push(dataset);
            });
            
        } else {
            // Single vehicle selection
            const vehicleData = vehicleMonthlyData.get(vehicleSelection);
            
            if (vehicleData) {
                const dataset = {
                    label: vehicleData.displayName,
                    data: [],
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 5
                };
                
                // Add data for each month
                sortedMonths.forEach(monthKey => {
                    const monthData = vehicleData.months.get(monthKey);
                    
                    if (monthData) {
                        if (viewMode === 'quantity') {
                            // Show total fuel consumption
                            dataset.data.push(monthData.totalFuel);
                        } else {
                            // Show fuel efficiency (Km/L)
                            const efficiency = monthData.totalFuel > 0 ? 
                                monthData.totalDistance / monthData.totalFuel : 0;
                            dataset.data.push(efficiency);
                        }
                    } else {
                        // No data for this month
                        dataset.data.push(null);
                    }
                });
                
                result.datasets.push(dataset);
                
                // If showing single vehicle, add a dataset for average of all vehicles for comparison
                const averageDataset = {
                    label: 'Fleet Average',
                    data: [],
                    fill: false,
                    borderColor: 'rgba(128, 128, 128, 0.8)',
                    backgroundColor: 'rgba(128, 128, 128, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    pointRadius: 3
                };
                
                // Calculate average for each month across all vehicles
                sortedMonths.forEach(monthKey => {
                    let totalValue = 0;
                    let count = 0;
                    
                    vehicleMonthlyData.forEach(vehicle => {
                        const monthData = vehicle.months.get(monthKey);
                        
                        if (monthData) {
                            if (viewMode === 'quantity') {
                                if (monthData.totalFuel > 0) {
                                    totalValue += monthData.totalFuel;
                                    count++;
                                }
                            } else {
                                if (monthData.totalFuel > 0) {
                                    const efficiency = monthData.totalDistance / monthData.totalFuel;
                                    if (efficiency > 0) {
                                        totalValue += efficiency;
                                        count++;
                                    }
                                }
                            }
                        }
                    });
                    
                    // Calculate average or use null if no data
                    const average = count > 0 ? totalValue / count : null;
                    averageDataset.data.push(average);
                });
                
                result.datasets.push(averageDataset);
            } else {
                // If the selected vehicle doesn't exist in the data, return empty result
                return {
                    labels: [],
                    datasets: [],
                    title: result.title,
                    yAxisLabel: result.yAxisLabel
                };
            }
        }
        
        return result;
    } catch (error) {
        console.error('Error calculating monthly consumption data:', error);
        return {
            labels: [],
            datasets: [],
            title: result.title,
            yAxisLabel: result.yAxisLabel
        };
    }
}

// Function to render Pump Reading Differences chart
function renderPumpReadingDifferencesChart(data) {
    const canvas = document.getElementById('pump-reading-differences-chart');
    if (!canvas) {
        console.error('Cannot find pump-reading-differences-chart canvas');
        return;
    }

    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Cannot render pump reading differences chart.');
        return;
    }

    try {
        console.log('Rendering Pump Reading Differences chart with', data.length, 'records');

        // Calculate pump reading differences
        const chartData = calculatePumpReadingDifferences(data);

        // If no data, show message
        if (!chartData || !chartData.labels || chartData.labels.length === 0) {
            displayNoDataMessage('pump-reading-differences-chart', 'No pump reading differences data available');
            console.log('No data available for pump reading differences chart');
            return;
        }

        // Destroy existing chart if it exists
        if (pumpReadingDifferencesChart) {
            pumpReadingDifferencesChart.destroy();
        }

        // Determine if dark mode is active for chart colors
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#e0e0e0' : '#666';

        // Create a horizontal bar chart
        pumpReadingDifferencesChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Pump Reading Difference (EGP)',
                    data: chartData.data,
                    backgroundColor: chartData.data.map(value => {
                        // Color based on difference value
                        if (value > 10) return 'rgba(255, 99, 132, 0.7)'; // High difference (red)
                        if (value > 5) return 'rgba(255, 159, 64, 0.7)'; // Medium difference (orange) 
                        return 'rgba(75, 192, 192, 0.7)'; // Low difference (teal)
                    }),
                    borderColor: chartData.data.map(value => {
                        // Border color based on difference value
                        if (value > 10) return 'rgba(255, 99, 132, 1)'; 
                        if (value > 5) return 'rgba(255, 159, 64, 1)';
                        return 'rgba(75, 192, 192, 1)';
                    }),
                    borderWidth: 1,
                    barPercentage: 0.8,
                    // Store driver names in the dataset for tooltip access
                    driverNames: chartData.driverNames
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            // Display both difference and driver name in tooltip
                            label: function(context) {
                                const difference = context.raw.toFixed(2);
                                const driverName = context.dataset.driverNames[context.dataIndex];
                                return [
                                    `Driver: ${driverName}`,
                                    `Difference: EGP ${difference}`
                                ];
                            }
                        },
                        // Enhanced tooltip styling
                        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                        titleFont: {
                            family: 'Cairo, Arial, sans-serif',
                            size: 13
                        },
                        bodyFont: {
                            family: 'Cairo, Arial, sans-serif',
                            size: 13
                        },
                        padding: 12,
                        cornerRadius: 6,
                        displayColors: false
                    },
                    title: {
                        display: true,
                        text: 'Pump Reading Differences (Higher indicates potential issues)',
                        color: textColor,
                        font: {
                            size: 16
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Difference (EGP)',
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                return 'EGP ' + value.toFixed(2);
                            }
                        },
                        beginAtZero: true
                    },
                    y: {
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Cairo, Arial, sans-serif'
                            }
                        }
                    }
                }
            }
        });

        // Show canvas
        canvas.style.display = 'block';

        // Remove any no-data message
        const container = canvas.parentElement;
        const noDataMessage = container.querySelector('.no-data-message');
        if (noDataMessage) {
            noDataMessage.remove();
        }

        console.log('Pump Reading Differences chart rendered successfully');
    } catch (error) {
        console.error('Error rendering Pump Reading Differences chart:', error);
        displayNoDataMessage('pump-reading-differences-chart', 'Error rendering Pump Reading Differences chart');
    }
}

// Function to calculate pump reading differences
function calculatePumpReadingDifferences(data) {
    const result = {
        labels: [],
        data: [],
        driverNames: []  // New array to store driver names for tooltips
    };

    try {
        console.log('Calculating pump reading differences from', data.length, 'records');
        // Log a sample record to check data structure
        if (data.length > 0) {
            console.log('Sample record keys:', Object.keys(data[0]));
            console.log('Sample record:', data[0]);
        }
        
        // Filter data to only include records with valid pump reading differences
        const filteredData = data.filter(record => {
            // Check if the record has a valid Difference field
            let hasDifference = false;
            if (record.hasOwnProperty('Difference') && record['Difference']) {
                // Remove currency symbols and try to parse
                const cleanValue = record['Difference'].toString().replace(/[£$]/g, '');
                hasDifference = !isNaN(parseFloat(cleanValue)) && parseFloat(cleanValue) > 0;
            }
            
            return hasDifference;
        });
        
        console.log('Found', filteredData.length, 'records with valid difference values');

        // Sort by difference value (descending)
        filteredData.sort((a, b) => {
            const diffA = a['Difference'] ? 
                parseFloat(a['Difference'].toString().replace(/[£$]/g, '')) || 0 : 0;
            const diffB = b['Difference'] ? 
                parseFloat(b['Difference'].toString().replace(/[£$]/g, '')) || 0 : 0;
            
            return diffB - diffA;
        });

        // Take top 15 records for better visualization
        const topRecords = filteredData.slice(0, 15);
        console.log('Using top', topRecords.length, 'records for chart');

        // Process each record
        topRecords.forEach(record => {
            const vehicleId = record['Vehicle ID'] || record.vehicle || 'Unknown';
            const licensePlate = record['License Plate'] || '';
            const label = licensePlate ? `${licensePlate}` : `Vehicle ${vehicleId}`;
            const date = record['Date'] ? ` (${record['Date']})` : '';
            
            // Get driver name for tooltip - try different possible field names
            const driverName = record['Driver Name (AR)'] || 
                               record['Driver Name (EN)'] || 
                               record['Driver Name'] || 
                               record['Transaction Driver ID'] || 
                               'Unknown Driver';
            
            // Extract difference value, removing currency symbol if present
            let difference = 0;
            if (record['Difference']) {
                const cleanValue = record['Difference'].toString().replace(/[£$]/g, '');
                difference = parseFloat(cleanValue) || 0;
            }
            
            // Add to result arrays
            result.labels.push(`${label}${date}`);
            result.data.push(difference);
            result.driverNames.push(driverName); // Store driver name for tooltips
        });
    } catch (error) {
        console.error('Error calculating pump reading differences:', error);
        console.error('Error details:', error.stack);
    }

    console.log('Returned data for chart:', {
        labels: result.labels.length,
        dataPoints: result.data.length,
        driverNames: result.driverNames.length
    });
    
    return result;
}

// Function to render the Fuel Efficiency Ranking Table
function renderFuelEfficiencyRankingTable(data, viewMode = 'all') {
    const container = document.getElementById('fuel-efficiency-ranking-table');
    if (!container) {
        console.error('Cannot find fuel-efficiency-ranking-table container');
        return;
    }
    
    try {
        console.log('Rendering Fuel Efficiency Ranking Table with', data.length, 'records, view mode:', viewMode);

        // Get efficiency ranking data
        const rankingData = calculateFuelEfficiencyRanking(data);
        
        // If no data, show message
        if (!rankingData || !rankingData.vehicles || rankingData.vehicles.length === 0) {
            container.innerHTML = '<div class="no-data-message"><i class="fas fa-chart-bar"></i><p>No fuel efficiency ranking data available</p></div>';
            return;
        }
        
        // Determine which vehicles to display based on view mode
        let displayVehicles = [];
        const totalVehicles = rankingData.vehicles.length;
        
        if (viewMode === 'best') {
            // Show only the top 10 vehicles
            displayVehicles = rankingData.vehicles.slice(0, Math.min(10, totalVehicles));
        } else if (viewMode === 'worst') {
            // Show only the bottom 10 vehicles (sorted from worst to slightly better)
            displayVehicles = rankingData.vehicles.slice(-Math.min(10, totalVehicles)).reverse();
        } else {
            // Show all vehicles, limited to 20 for readability
            // Top 10 and bottom 10 if more than 20, otherwise all
            if (totalVehicles > 20) {
                displayVehicles = [
                    ...rankingData.vehicles.slice(0, 10), // Top 10
                    ...rankingData.vehicles.slice(-10).reverse() // Bottom 10
                ];
            } else {
                displayVehicles = [...rankingData.vehicles];
            }
        }
        
        // Determine if dark mode is active for styling
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Create the HTML for the ranking table
        let tableHTML = `
            <table class="fuel-efficiency-ranking-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Vehicle</th>
                        <th>License Plate</th>
                        <th>Efficiency (Km/L)</th>
                        <th>Total Distance (Km)</th>
                        <th>Total Fuel (L)</th>
                        <th>Records</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Add table rows for each vehicle
        displayVehicles.forEach((vehicle, index) => {
            const rank = viewMode === 'worst' ? 
                (rankingData.vehicles.length - rankingData.vehicles.indexOf(vehicle)) :
                (rankingData.vehicles.indexOf(vehicle) + 1);
            
            const rankClass = rank <= 3 ? 'top-rank' : (rank >= rankingData.vehicles.length - 2 ? 'bottom-rank' : '');
            const efficiencyClass = vehicle.efficiency >= 10 ? 'high-efficiency' : 
                                  (vehicle.efficiency >= 7 ? 'medium-efficiency' : 'low-efficiency');
            
            tableHTML += `
                <tr class="${rankClass}">
                    <td class="rank-cell">
                        <div class="rank-badge ${rankClass}">${rank}</div>
                    </td>
                    <td>${vehicle.vehicleId || 'Unknown'}</td>
                    <td>${vehicle.licensePlate || 'N/A'}</td>
                    <td class="${efficiencyClass}">${vehicle.efficiency.toFixed(2)} Km/L</td>
                    <td>${vehicle.totalDistance.toLocaleString()} Km</td>
                    <td>${vehicle.totalFuel.toLocaleString()} L</td>
                    <td>${vehicle.recordCount}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        // Insert the table into the container
        container.innerHTML = tableHTML;
        
        console.log('Fuel Efficiency Ranking Table rendered successfully');
    } catch (error) {
        console.error('Error rendering Fuel Efficiency Ranking Table:', error);
        container.innerHTML = '<div class="no-data-message"><i class="fas fa-exclamation-triangle"></i><p>Error rendering fuel efficiency ranking table</p></div>';
    }
}

// Function to calculate fuel efficiency ranking data
function calculateFuelEfficiencyRanking(data) {
    try {
        // Map to hold vehicle data
        const vehiclesMap = new Map();
        
        // Process all records to calculate efficiency for each vehicle
        data.forEach(record => {
            const vehicleId = record['Vehicle ID'] || record.vehicle;
            if (!vehicleId) return;
            
            // Get license plate
            let licensePlate = record['License Plate'] || '';
            
            // If license plate is not in the record, try to find it from the vehicles array
            if (!licensePlate && vehicleId && window.vehicles) {
                const vehicleInfo = window.vehicles.find(v => 
                    v['Vehicle ID'] === vehicleId || 
                    v.id === vehicleId || 
                    v['Vehicle VIN/SN'] === vehicleId
                );
                
                if (vehicleInfo) {
                    licensePlate = vehicleInfo['License Plate'] || '';
                }
            }
            
            // Parse fuel quantity and distance
            const fuelQuantity = parseFloat(record.Quantity) || 0;
            const distance = parseFloat(record.Distance) || 0;
            
            // Skip invalid records
            if (fuelQuantity <= 0 || distance <= 0) return;
            
            // Initialize vehicle data if not exists
            if (!vehiclesMap.has(vehicleId)) {
                vehiclesMap.set(vehicleId, {
                    vehicleId,
                    licensePlate,
                    totalFuel: 0,
                    totalDistance: 0,
                    recordCount: 0,
                    efficiency: 0
                });
            }
            
            // Update vehicle data
            const vehicleData = vehiclesMap.get(vehicleId);
            vehicleData.totalFuel += fuelQuantity;
            vehicleData.totalDistance += distance;
            vehicleData.recordCount++;
        });
        
        // Calculate efficiency and filter out vehicles with insufficient data
        const vehicles = Array.from(vehiclesMap.values())
            .filter(vehicle => vehicle.totalFuel > 0 && vehicle.recordCount >= 2) // At least 2 records for meaningful data
            .map(vehicle => {
                vehicle.efficiency = vehicle.totalDistance / vehicle.totalFuel;
                return vehicle;
            })
            .sort((a, b) => b.efficiency - a.efficiency); // Sort by efficiency (descending)
        
        return { vehicles };
    } catch (error) {
        console.error('Error calculating fuel efficiency ranking:', error);
        return { vehicles: [] };
    }
}

// Initialize fuel table toggle functionality
function initializeFuelTableToggle() {
    const toggleButton = document.getElementById('toggle-fuel-table-btn');
    const tableContainer = document.getElementById('fuel-table-container');
    
    if (!toggleButton || !tableContainer) {
        console.error('Cannot find fuel table toggle button or table container');
        return;
    }
    
    // Check if there's a saved preference in localStorage
    const isTableVisible = localStorage.getItem('fuelTableVisible') === 'true';
    
    // Set the initial state based on localStorage or default to hidden
    tableContainer.style.display = isTableVisible ? 'block' : 'none';
    updateToggleButtonText(toggleButton, isTableVisible);
    
    // Add click event listener to the toggle button
    toggleButton.addEventListener('click', function() {
        // Toggle the table visibility
        const isCurrentlyVisible = tableContainer.style.display === 'block';
        const newVisibility = !isCurrentlyVisible;
        
        // Update the UI
        tableContainer.style.display = newVisibility ? 'block' : 'none';
        updateToggleButtonText(toggleButton, newVisibility);
        
        // Save the preference to localStorage
        localStorage.setItem('fuelTableVisible', newVisibility);
    });
}

// Helper function to update the toggle button text
function updateToggleButtonText(button, isTableVisible) {
    const iconElement = button.querySelector('i');
    const textElement = button.querySelector('span');
    
    if (isTableVisible) {
        iconElement.className = 'fas fa-eye-slash';
        textElement.textContent = 'Hide Records';
    } else {
        iconElement.className = 'fas fa-eye';
        textElement.textContent = 'Show Records';
    }
}
