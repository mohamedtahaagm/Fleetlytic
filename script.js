// Global variables
export let currentUser = null;
export let vehicles = [];
export let drivers = [];
export let maintenanceRecords = [];
export let fuelRecords = [];
export let users = [];
export let charts = {};
export const API_URL = 'https://script.google.com/macros/s/AKfycbyvgby4dtYeqahohK7loTDqU4ek3yYBi_8J_J5c5CBF4aBF0tWflyiKaC0AJK1xy-oW/exec';

// Import modules
import { setInitializeUICallback, checkLoginStatus } from './auth.js';
import { setupEventListeners } from './events.js';
import { updateDashboard } from './dashboard.js';
import { renderVehiclesTable } from './vehicles.js';
import { initializeMaintenancePage, renderMaintenanceTable } from './maintenance.js';  // Add renderMaintenanceTable to imports
import { renderFuelTable } from './fuel.js';
import { renderDriversTable } from './drivers.js';
import { renderUsersTable } from './users.js';

// System ready after page load
document.addEventListener('DOMContentLoaded', initializeApp);

// Add code to ensure Chart.js is loaded

// Function to load external scripts
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Load required scripts for charts if not already available
async function loadDependencies() {
    try {
        if (typeof Chart === 'undefined') {
            console.log('Chart.js not found, loading from CDN...');
            await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
            console.log('Chart.js loaded successfully');
        }
        
        // You can add additional libraries here if needed
    } catch (error) {
        console.error('Error loading dependencies:', error);
    }
}

// Call this function when loading the application
document.addEventListener('DOMContentLoaded', () => {
    loadDependencies();
    // Continue with other initialization
    // ...existing code...
});

// Export function for other modules to use
export { loadDependencies };

// Initialize the application
function initializeApp() {
    // Set user interface initialization function
    setInitializeUICallback(initializeUserInterface);
    
    // Setup event listeners
    setupEventListeners();
    
    // Check login status
    checkLoginStatus();

    // Create dark mode toggle button
    createDarkModeToggle();

    // Check user's dark mode preference
    checkDarkModePreference();

    // Create notification system
    createNotificationSystem();

    // إضافة openVehicleDetailsModal للنافذة العامة
    window.openVehicleDetailsModal = openVehicleDetailsModal;

    // Ensure openVehicleDetailsModal is available globally
    if (!window.openVehicleDetailsModal) {
        window.openVehicleDetailsModal = openVehicleDetailsModal;
    }

    // Add global event delegation for profile buttons
    document.addEventListener('click', function(e) {
        const profileBtn = e.target.closest('.profile-btn');
        if (profileBtn) {
            const vehicleId = profileBtn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (vehicleId) {
                openVehicleDetailsModal(vehicleId);
            }
        }
    });
}

// Initialize user interface based on user role
function initializeUserInterface(userData) {
    // Update current user
    currentUser = userData;

    // Get main elements
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    const sidebar = document.getElementById('sidebar');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const headerUserName = document.getElementById('header-user-name');

    // Hide login screen and show main interface
    loginContainer.style.display = 'none';
    mainContainer.style.display = 'flex';
    sidebar.style.display = 'block';

    // Update user information in the interface
    if (userName) userName.textContent = currentUser.name;
    userRole.textContent = getRoleTranslation(currentUser.role);
    if (headerUserName) headerUserName.textContent = `Welcome, ${currentUser.name}`;

    // Set user roles
    document.body.className = currentUser.role;

    // Disable unauthorized functions for employees
    if (currentUser.role === 'employee') {
        disableActionsForEmployee();
    }

    // منع عرض جدول الخدمات القادمة عند أول تحميل إذا لم يكن هناك تفضيل محفوظ
    if (localStorage.getItem('showUpcomingServices') === null) {
        localStorage.setItem('showUpcomingServices', 'false');
    }

    // Load data
    loadData();

    // Show dashboard
    showPage('dashboard');
    
    // Get visible columns function for column management
    import('./dashboard.js').then(module => {
        if (module && typeof module.getVisibleColumns === 'function') {
            window.getVisibleColumns = module.getVisibleColumns;
            console.log('getVisibleColumns function loaded globally');
        } else {
            console.warn('getVisibleColumns function not found in dashboard.js module');
            // Create fallback function
            window.getVisibleColumns = function() {
                const defaultColumns = {
                    vehicle: true,
                    serviceType: true,
                    expectedDate: true,
                    status: true,
                    remaining: true
                };
                
                try {
                    const savedColumns = localStorage.getItem('upcomingServicesColumns');
                    return savedColumns ? JSON.parse(savedColumns) : defaultColumns;
                } catch (e) {
                    console.warn('Error getting visible columns:', e);
                    return defaultColumns;
                }
            };
        }
    }).catch(error => {
        console.error('Error importing dashboard.js for getVisibleColumns:', error);
        // Create fallback function
        window.getVisibleColumns = function() {
            const defaultColumns = {
                vehicle: true,
                serviceType: true,
                expectedDate: true,
                status: true,
                remaining: true
            };
            
            try {
                const savedColumns = localStorage.getItem('upcomingServicesColumns');
                return savedColumns ? JSON.parse(savedColumns) : defaultColumns;
            } catch (e) {
                console.warn('Error getting visible columns:', e);
                return defaultColumns;
            }
        };
    });

    // Export Excel function for global access
    window.exportToExcel = function() {
        console.log('Global exportToExcel called');
        try {
            // First try to import and use the module version
            import('./dashboard.js')
                .then(module => {
                    if (module && typeof module.exportToExcel === 'function') {
                        console.log('Calling exportToExcel from dashboard.js module');
                        module.exportToExcel();
                    } else {
                        console.error('exportToExcel function not found in dashboard.js module');
                        showNotification('Export function not available', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error importing dashboard.js:', error);
                    showNotification('Error exporting to Excel', 'error');
                });
        } catch (e) {
            console.error('Excel export failed:', e);
            showNotification('Excel export failed: ' + e.message, 'error');
        }
    };

    // Setup column reset button
    setupColumnResetButton();
}

// Setup column reset button
function setupColumnResetButton() {
    const resetButton = document.getElementById('reset-columns');
    if (resetButton) {
        resetButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent dropdown from closing
            
            // Reset to default column settings
            const defaultColumns = {
                vehicle: true,
                serviceType: true,
                expectedDate: true,
                status: true,
                remaining: true
            };
            
            // Save to localStorage
            localStorage.setItem('upcomingServicesColumns', JSON.stringify(defaultColumns));
            
            // Update checkbox UI
            document.querySelectorAll('.column-option input[type="checkbox"]').forEach(checkbox => {
                const columnName = checkbox.dataset.column;
                if (columnName && defaultColumns[columnName] !== undefined) {
                    checkbox.checked = defaultColumns[columnName];
                }
            });
            
            // Update table
            import('./dashboard.js').then(module => {
                if (module && typeof module.updateUpcomingServices === 'function') {
                    const activeFilterBtn = document.querySelector('.services-filter .filter-btn.active');
                    const filterType = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
                    module.updateUpcomingServices(filterType);
                    
                    showNotification('Column settings have been reset to default', 'success');
                }
            }).catch(error => {
                console.error('Error importing dashboard.js:', error);
            });
        });
    }
}

// Get user role translation
function getRoleTranslation(role) {
    const translations = {
        'admin': 'System Admin',
        'manager': 'Manager',
        'employee': 'Employee'
    };
    return translations[role] || role;
}

// Disable actions for employees
function disableActionsForEmployee() {
    const actionButtons = [
        'add-vehicle-btn',
        'add-driver-btn',
        'add-maintenance-btn',
        'add-fuel-btn'
    ];

    actionButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = 'none';
    });
}

// Show requested page
export function showPage(page) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));

    // Show the requested page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        document.getElementById('current-page-title').textContent = getPageTitle(page);
        updatePageContent(page);
    }
}

// Update page content
function updatePageContent(page) {
    switch(page) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'vehicles':
            renderVehiclesTable();
            break;
        case 'maintenance':
            // Already properly imported, now correctly callable
            initializeMaintenancePage();
            break;
        case 'fuel':
            renderFuelTable();
            break;
        case 'drivers':
            renderDriversTable();
            break;
        case 'users':
            if (currentUser?.role === 'admin') {
                renderUsersTable();
            }
            break;
    }
}

// Get page title
function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard',
        'vehicles': 'Vehicles Management',
        'maintenance': 'Maintenance Management',
        'fuel': 'Fuel Management',
        'drivers': 'Drivers Management',
        'reports': 'Reports',
        'users': 'Users Management'
    };
    return titles[page] || page;
}

// Load data
function loadData() {
    loadVehiclesData();
    loadDriversData();
    loadMaintenanceData();
    loadFuelData();
    if (currentUser?.role === 'admin') {
        loadUsersData();
    }
}

// Data loading functions
async function loadVehiclesData() {
    try {
        const response = await fetchData('getDashboard');
        if (response.status === 'success') {
            // Store the raw vehicle data
            vehicles = response.data;
            console.log('Dashboard data received:', response);
            // Update dashboard with the new data
            updateDashboard();
            renderVehiclesTable();
        } else {
            console.error('Failed to load dashboard data:', response.message);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadDriversData() {
    const data = await fetchData('getDrivers');
    if (data.status === 'success') {
        drivers = data.data;
        renderDriversTable();
    }
}

async function loadMaintenanceData() {
    const data = await fetchData('getMaintenance');
    if (data.status === 'success') {
        maintenanceRecords = data.data;
        renderMaintenanceTable();  // This function is now properly imported
    }
}

function loadFuelData() {
    try {
        // First try to load fuel data from API
        fetchData('getFuel')
            .then(data => {
                if (data.status === 'success' && data.data && data.data.length > 0) {
                    console.log('Successfully loaded fuel records from API:', data.data.length);
                    processFuelRecords(data.data);
                } else {
                    console.warn('No fuel records returned from API, using sample data');
                    loadSampleFuelData();
                }
            })
            .catch(error => {
                console.error('Error loading fuel data from API:', error);
                loadSampleFuelData();
            });
    } catch (error) {
        console.error('Exception in loadFuelData:', error);
        loadSampleFuelData();
    }
}

// Process fuel records to ensure consistent format
function processFuelRecords(records) {
    try {
        // Map to ensure consistent structure
        fuelRecords = records.map(record => {
            const processedRecord = {
                ...record,
                id: record.id || generateTempId('fuel'),
                // Make sure vehicle property exists and matches Vehicle ID
                vehicle: record.vehicle || record['Vehicle ID'] || '',
                'Vehicle ID': record['Vehicle ID'] || record.vehicle || '',
                'License Plate': record['License Plate'] || '',
                'Fuel Type': record['Fuel Type'] || record.type || '92',
                Date: record.Date || record.date || new Date().toISOString().split('T')[0],
                Amount: record.Amount || record.amount || '£0',
                Quantity: parseFloat(record.Quantity || record.quantity || 0),
                Distance: parseFloat(record.Distance || record.distance || 0),
                'Consumption Rate': record['Consumption Rate'] || 
                    (parseFloat(record.Quantity || 0) > 0 ? 
                        (parseFloat(record.Distance || 0) / parseFloat(record.Quantity || 1)).toFixed(1) : 
                        '0')
            };
            
            return processedRecord;
        });
        
        console.log('Processed fuel records:', fuelRecords.length);
        renderFuelTable();
    } catch (error) {
        console.error('Error processing fuel records:', error);
        fuelRecords = [];
        renderFuelTable();
    }
}

// Load sample fuel data when API fails or returns empty results
function loadSampleFuelData() {
    console.log('Loading sample fuel data');
    
    // Sample fuel data based on the provided structure - enhanced with driver information
    const sampleFuelData = [
        {
            "id": "fuel-1",
            "Vehicle ID": "PE30535344",
            "License Plate": "546 د ى ج",
            "Vehicle Type": "Comfort",
            "Vehicle Status": "Active",
            "Vehicle VIN/SN": "PE30535344",
            "Date": "2023-01-28",
            "Time": "11:35:01 PM",
            "Driver Name": "Ahmed Abdel Aziz",
            "Driver Name (AR)": "احمد عبدالعزيز الصغير",
            "Driver Name (EN)": "Ahmed Abdel Aziz",
            "Fuel Type": "92",
            "Amount": "£420.00",
            "Quantity": 27.54,
            "Odometer": 144047,
            "Distance": 340,
            "Consumption Rate": "12.3",
            "Cost per Meter": "£1.24",
            "Branch": "Gouna",
            "Vehicle Group": "London Cab",
            "Vehicle Model": 2023
        },
        {
            "id": "fuel-2",
            "Vehicle ID": "PJ535346",
            "License Plate": "199 د ي ج",
            "Vehicle Type": "SUV",
            "Vehicle Status": "Active",
            "Vehicle VIN/SN": "PJ535346",
            "Date": "2023-02-15",
            "Time": "09:20:45 AM",
            "Driver Name": "Mohamed Ahmed Ali",
            "Driver Name (AR)": "محمد أحمد علي",
            "Driver Name (EN)": "Mohamed Ahmed Ali",
            "Fuel Type": "95",
            "Amount": "£350.00",
            "Quantity": 22.5,
            "Odometer": 102750,
            "Distance": 290,
            "Consumption Rate": "12.9",
            "Cost per Meter": "£1.21",
            "Branch": "Cairo",
            "Vehicle Group": "SUVs",
            "Vehicle Model": 2022
        },
        {
            "id": "fuel-3",
            "Vehicle ID": "A008451",
            "License Plate": "782 د ي د",
            "Vehicle Type": "Sedan",
            "Vehicle Status": "Active",
            "Vehicle VIN/SN": "A008451",
            "Date": "2023-03-10",
            "Time": "02:15:30 PM",
            "Driver Name": "Khaled Mohamed Abdullah",
            "Driver Name (AR)": "خالد محمد عبدالله",
            "Driver Name (EN)": "Khaled Mohamed Abdullah",
            "Fuel Type": "Diesel",
            "Amount": "£280.00",
            "Quantity": 18.5,
            "Odometer": 89750,
            "Distance": 310,
            "Consumption Rate": "16.8",
            "Cost per Meter": "£0.90",
            "Branch": "Alexandria",
            "Vehicle Group": "Economy",
            "Vehicle Model": 2021
        },
        {
            "id": "fuel-4",
            "Vehicle ID": "PR047612",
            "License Plate": "923 د ي هـ",
            "Vehicle Type": "Sedan",
            "Vehicle Status": "Active", 
            "Vehicle VIN/SN": "PR047612",
            "Date": "2023-03-12",
            "Time": "10:30:00 AM",
            "Driver Name": "Omar Hassan",
            "Driver Name (AR)": "عمر حسن",
            "Driver Name (EN)": "Omar Hassan",
            "Fuel Type": "92",
            "Amount": "£310.00",
            "Quantity": 20.5,
            "Odometer": 67500,
            "Distance": 285,
            "Consumption Rate": "13.9",
            "Cost per Meter": "£1.09",
            "Branch": "Cairo",
            "Vehicle Group": "Economy",
            "Vehicle Model": 2022
        },
        {
            "id": "fuel-5",
            "Vehicle ID": "A008629",
            "License Plate": "546 د ى ج",
            "Vehicle Type": "SUV",
            "Vehicle Status": "Active",
            "Vehicle VIN/SN": "A008629",
            "Date": "2023-03-15",
            "Time": "03:45:00 PM",
            "Driver Name": "Ahmed Abdel Aziz",
            "Driver Name (AR)": "احمد عبدالعزيز الصغير",
            "Driver Name (EN)": "Ahmed Abdel Aziz",
            "Fuel Type": "95",
            "Amount": "£390.00",
            "Quantity": 25.0,
            "Odometer": 145200,
            "Distance": 325,
            "Consumption Rate": "13.0",
            "Cost per Meter": "£1.20",
            "Branch": "Gouna",
            "Vehicle Group": "SUVs",
            "Vehicle Model": 2021
        },
        {
            "id": "fuel-6",
            "Vehicle ID": "PR047602",
            "License Plate": "381 د ي و",
            "Vehicle Type": "Comfort",
            "Vehicle Status": "Active",
            "Vehicle VIN/SN": "PR047602",
            "Date": "2023-03-18",
            "Time": "08:15:00 AM",
            "Driver Name": "Mustafa Ibrahim",
            "Driver Name (AR)": "مصطفى ابراهيم",
            "Driver Name (EN)": "Mustafa Ibrahim",
            "Fuel Type": "Diesel",
            "Amount": "£340.00",
            "Quantity": 22.0,
            "Odometer": 91200,
            "Distance": 405,
            "Consumption Rate": "18.4",
            "Cost per Meter": "£0.84",
            "Branch": "Alexandria",
            "Vehicle Group": "London Cab",
            "Vehicle Model": 2021
        },
        {
            "id": "fuel-7",
            "Vehicle ID": "PR047620",
            "License Plate": "752 د ي ز",
            "Vehicle Type": "Sedan",
            "Vehicle Status": "Active",
            "Vehicle VIN/SN": "PR047620",
            "Date": "2023-03-20",
            "Time": "05:30:00 PM",
            "Driver Name": "Mahmoud Ali",
            "Driver Name (AR)": "محمود علي",
            "Driver Name (EN)": "Mahmoud Ali",
            "Fuel Type": "92",
            "Amount": "£280.00",
            "Quantity": 18.5,
            "Odometer": 124600,
            "Distance": 210,
            "Consumption Rate": "11.4",
            "Cost per Meter": "£1.33",
            "Branch": "Cairo",
            "Vehicle Group": "Economy",
            "Vehicle Model": 2022
        },
        {
            "id": "fuel-8",
            "Vehicle ID": "PJ535346",
            "License Plate": "199 د ي ج",
            "Vehicle Type": "SUV",
            "Vehicle Status": "Active",
            "Vehicle VIN/SN": "PJ535346",
            "Date": "2023-03-22",
            "Time": "02:00:00 PM",
            "Driver Name": "Mohamed Ahmed Ali",
            "Driver Name (AR)": "محمد أحمد علي",
            "Driver Name (EN)": "Mohamed Ahmed Ali",
            "Fuel Type": "95",
            "Amount": "£365.00",
            "Quantity": 23.5,
            "Odometer": 103040,
            "Distance": 290,
            "Consumption Rate": "12.3",
            "Cost per Meter": "£1.26",
            "Branch": "Cairo",
            "Vehicle Group": "SUVs",
            "Vehicle Model": 2022
        }
    ];
    
    processFuelRecords(sampleFuelData);
}

async function loadUsersData() {
    const data = await fetchData('getUsers');
    if (data.status === 'success') {
        users = data.data;
        renderUsersTable();
    }
}

// Helper function to fetch data
async function fetchData(action) {
    try {
        const params = new URLSearchParams();
        params.append('action', action);
        if (currentUser?.role === 'manager') {
            params.append('managerId', currentUser.id);
        }

        const response = await fetch(`${API_URL}?${params.toString()}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching ${action}:`, error);
        return { status: 'error', message: error.message };
    }
}

// Open and close modals
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// تصدير دالة فتح نافذة تفاصيل المركبة حتى يمكن استخدامها من وحدات أخرى
export function openVehicleDetailsModal(vehicleId) {
    console.log('Opening vehicle details modal for ID:', vehicleId);
    
    if (!vehicleId) {
        console.error('No vehicle ID provided to openVehicleDetailsModal');
        showNotification('Error: Vehicle ID is missing', 'error');
        return;
    }
    
    // Try to find the vehicle by ID - more comprehensive search
    const vehicle = vehicles.find(v => 
        v['Vehicle ID'] === vehicleId || 
        v.id === vehicleId || 
        v['Vehicle VIN/SN'] === vehicleId
    );
    
    if (!vehicle) {
        console.error('Vehicle not found with ID:', vehicleId);
        showNotification(`Vehicle not found with ID: ${vehicleId}`, 'error');
        return;
    }

    console.log('Found vehicle:', vehicle);
    
    // Rest of the function remains the same
    // تحديث رأس النافذة المنبثقة
    const modalHeader = modal.querySelector('.modal-header');
    if (modalHeader) {
        modalHeader.innerHTML = `
            <div>
                <h3>${vehicle['Model'] || 'Vehicle'} Details</h3>
                <div class="license-number">
                    <i class="fas fa-id-card"></i> ${vehicle['License Plate'] || 'N/A'}
                </div>
                <div id="vehicle-details-tabs">
                    <button class="tab-btn active" data-tab="info"><i class="fas fa-info-circle"></i> Basic Info</button>
                    <button class="tab-btn" data-tab="maintenance"><i class="fas fa-tools"></i> Maintenance</button>
                    <button class="tab-btn" data-tab="service"><i class="fas fa-cog"></i> Service</button>
                    <button class="tab-btn" data-tab="driver"><i class="fas fa-user"></i> Driver</button>
                </div>
            </div>
            <button id="close-vehicle-details-modal" class="close-btn">
                <i class="fas fa-times"></i>
            </button>
        `;
    }
    
    // تحديد حالة المركبة
    const vehicleStatus = vehicle['Vehicle Status'] || 'inactive';
    const statusClass = vehicleStatus.toLowerCase().includes('active') ? 'active' : 
                       vehicleStatus.toLowerCase().includes('maintenance') ? 'maintenance' : 'inactive';
    
    // حساب تحذيرات الصيانة 
    const kmToMaintenance = parseFloat(String(vehicle['Km to next maintenance'] || '0').replace(/,/g, '')) || 0;
    const kmToTires = parseFloat(String(vehicle['Km left for tire change'] || '0').replace(/,/g, '')) || 0;
    const daysToLicense = parseInt(String(vehicle['Days to renew license'] || '0')) || 0;
    
    // تعيين أيقونات البيانات
    const icons = {
        'License Plate': 'fas fa-id-card',
        'VIN Number': 'fas fa-barcode',
        'Service Type': 'fas fa-tag',
        'Vehicle Type': 'fas fa-truck',
        'Model': 'fas fa-car-side',
        'Color': 'fas fa-palette',
        'Current Location': 'fas fa-map-marker-alt',
        'Current Km': 'fas fa-tachometer-alt',
        'Last Maintenance Km': 'fas fa-wrench',
        'Next Maintenance Km': 'fas fa-calendar-plus',
        'Km to Next Maintenance': 'fas fa-road',
        'Last Maintenance Date': 'fas fa-calendar-check',
        'Last Tire Change Km': 'fas fa-circle-notch',
        'Next Tire Change Km': 'fas fa-cog',
        'Km Left for Tire Change': 'fas fa-tire',
        'Last Tire Change Date': 'fas fa-calendar-day',
        'License Renewal Date': 'fas fa-id-badge',
        'Days to License Renewal': 'fas fa-hourglass-half',
        'Driver Name': 'fas fa-user',
        'Driver Contact': 'fas fa-phone'
    };

    // قيم العرض
    const currentKm = parseFloat(String(vehicle['Current Km'] || '0').replace(/,/g, '')) || 0;
    const lastMaintenanceKm = parseFloat(String(vehicle['Last Maintenance Km'] || '0').replace(/,/g, '')) || 0;
    const nextMaintenanceKm = parseFloat(String(vehicle['Next Maintenance Km'] || '0').replace(/,/g, '')) || 0;
    const lastTireKm = parseFloat(String(vehicle['Last tire change Km'] || '0').replace(/,/g, '')) || 0;
    const nextTireChangeKm = parseFloat(String(vehicle['Next Tire Change Km'] || '0').replace(/,/g, '')) || 0;
    
    // محتوى التبويبات بالتصميم المحسن
    const infoTabContent = `
        <div class="status-badge ${statusClass}">
            <i class="fas fa-${statusClass === 'active' ? 'check-circle' : statusClass === 'maintenance' ? 'tools' : 'times-circle'}"></i>
            ${vehicle['Vehicle Status'] || 'Unknown Status'}
        </div>
        <div class="preview-details">
            ${createPreviewItem('License Plate', vehicle['License Plate'], icons['License Plate'])}
            ${createPreviewItem('Service Type', vehicle['Service Type'], icons['Service Type'])}
            ${createPreviewItem('Vehicle Type', vehicle['Vehicle Type'], icons['Vehicle Type'])}
            ${createPreviewItem('Model', vehicle['Model'], icons['Model'])}
            ${createPreviewItem('Color', vehicle['Color'], icons['Color'])}
            ${createPreviewItem('VIN Number', vehicle['VIN Number'], icons['VIN Number'])}
            ${createPreviewItem('Current Location', vehicle['Current Location'], icons['Current Location'])}
        </div>
    `;
    
    const maintenanceTabContent = `
        <div class="section-header">
            <h4>Maintenance Information</h4>
            <span class="section-subtitle">Last updated: ${vehicle['Last Maintenance Date'] || 'N/A'}</span>
        </div>
        <div class="preview-details">
            ${createPreviewItem('Current Km', formatNumber(currentKm) + ' Km', icons['Current Km'])}
            ${createPreviewItem('Last Maintenance Km', vehicle['Last Maintenance Km'], icons['Last Maintenance Km'])}
            ${createPreviewItem('Next Maintenance Km', vehicle['Next Maintenance Km'], icons['Next Maintenance Km'])}
            ${createPreviewItem('Km to Next Maintenance', formatNumber(kmToMaintenance) + ' Km', icons['Km to Next Maintenance'], kmToMaintenance < 1000 ? 'danger' : kmToMaintenance < 5000 ? 'warning' : '')}
            ${createPreviewItem('Last Maintenance Date', vehicle['Last Maintenance Date'], icons['Last Maintenance Date'])}
        </div>
        ${kmToMaintenance < 5000 ? `
        <div class="progress-wrapper">
            <div class="progress-info">
                <span>Maintenance Progress</span>
                <span>${Math.round((currentKm - lastMaintenanceKm) / (nextMaintenanceKm - lastMaintenanceKm) * 100)}%</span>
            </div>
            <div class="progress">
                <div class="progress-bar ${kmToMaintenance < 1000 ? 'progress-danger' : kmToMaintenance < 5000 ? 'progress-warning' : 'progress-good'}" 
                     style="width: ${Math.min(((currentKm - lastMaintenanceKm) / (nextMaintenanceKm - lastMaintenanceKm)) * 100, 100)}%"></div>
            </div>
        </div>
        ` : ''}
    `;
    
    const serviceTabContent = `
        <div class="section-header">
            <h4>Service Information</h4>
            <span class="section-subtitle">Last updated: ${vehicle['Last tire change Data'] || 'N/A'}</span>
        </div>
        <div class="preview-details">
            ${createPreviewItem('Last Tire Change Km', vehicle['Last tire change Km'], icons['Last Tire Change Km'])}
            ${createPreviewItem('Next Tire Change Km', vehicle['Next Tire Change Km'], icons['Next Tire Change Km'])}
            ${createPreviewItem('Km Left for Tire Change', formatNumber(kmToTires) + ' Km', icons['Km Left for Tire Change'], kmToTires < 1000 ? 'danger' : kmToTires < 5000 ? 'warning' : '')}
            ${createPreviewItem('Last Tire Change Date', vehicle['Last tire change Data'], icons['Last Tire Change Date'])}
            ${createPreviewItem('License Renewal Date', vehicle['License Renewal Date'], icons['License Renewal Date'], daysToLicense < 7 ? 'danger' : daysToLicense < 30 ? 'warning' : '')}
            ${createPreviewItem('Days to License Renewal', daysToLicense + ' Days', icons['Days to License Renewal'], daysToLicense < 7 ? 'danger' : daysToLicense < 30 ? 'warning' : '')}
        </div>
        ${kmToTires < 5000 ? `
        <div class="progress-wrapper">
            <div class="progress-info">
                <span>Tire Change Progress</span>
                <span>${Math.round((currentKm - lastTireKm) / (nextTireChangeKm - lastTireKm) * 100)}%</span>
            </div>
            <div class="progress">
                <div class="progress-bar ${kmToTires < 1000 ? 'progress-danger' : kmToTires < 5000 ? 'progress-warning' : 'progress-good'}" 
                     style="width: ${Math.min(((currentKm - lastTireKm) / (nextTireChangeKm - lastTireKm)) * 100, 100)}%"></div>
            </div>
        </div>
        ` : ''}
    `;
    
    const driverTabContent = `
        <div class="section-header">
            <h4>Driver Information</h4>
        </div>
        <div class="preview-details">
            ${createPreviewItem('Driver Name', vehicle['Driver Name'], icons['Driver Name'])}
            ${createPreviewItem('Driver Contact', vehicle['Driver Contact'], icons['Driver Contact'])}
        </div>
        ${vehicle['Driver Name'] ? `
        <div style="text-align: center; padding: 2rem 1.5rem; margin-top: 1rem;">
            <div style="width: 100px; height: 100px; border-radius: 50%; background-color: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                <i class="fas fa-user" style="font-size: 3rem;"></i>
            </div>
            <h4 style="margin-top: 1.5rem; color: var(--text-color-dark); font-size: 1.3rem;">${vehicle['Driver Name']}</h4>
            <p style="color: var(--text-color-light); font-size: 1.1rem; margin-top: 0.5rem;">${vehicle['Driver Contact'] || 'No contact information'}</p>
        </div>
        ` : `
        <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-color-light);">
            <i class="fas fa-user-slash" style="font-size: 4rem; opacity: 0.5; margin-bottom: 1.5rem;"></i>
            <p style="font-size: 1.1rem;">No driver assigned to this vehicle.</p>
        </div>
        `}
    `;

    // تنسيق محتوى النافذة المنبثقة مع معرفات محددة وفريدة
    detailsContent.innerHTML = `
        <!-- قسم المعلومات الأساسية -->
        <div id="vehicle-tab-info" class="vehicle-details-section active">
            <h3><i class="fas fa-info-circle"></i> Vehicle Information</h3>
            <div class="section-wrapper">
                ${infoTabContent}
            </div>
        </div>
        
        <!-- قسم الصيانة -->
        <div id="vehicle-tab-maintenance" class="vehicle-details-section">
            <h3><i class="fas fa-tools"></i> Maintenance Status</h3>
            <div class="section-wrapper">
                ${maintenanceTabContent}
            </div>
        </div>
        
        <!-- قسم الخدمات -->
        <div id="vehicle-tab-service" class="vehicle-details-section">
            <h3><i class="fas fa-cog"></i> Service Information</h3>
            <div class="section-wrapper">
                ${serviceTabContent}
            </div>
        </div>
        
        <!-- قسم السائق -->
        <div id="vehicle-tab-driver" class="vehicle-details-section">
            <h3><i class="fas fa-user"></i> Driver Information</h3>
            <div class="section-wrapper">
                ${driverTabContent}
            </div>
        </div>
        
        <!-- قسم الإجراءات -->
        <div id="vehicle-details-actions">
            <button class="btn btn-primary print-vehicle" onclick="window.print()">
                <i class="fas fa-print"></i> Print Details
            </button>
            <button class="btn btn-secondary close-vehicle" onclick="closeModal('vehicle-details-modal')">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
    `;

    // إضافة مستمعات الأحداث لأزرار التبويب
    const tabButtons = modal.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Tab button clicked:', this.getAttribute('data-tab')); // تسجيل للتشخيص
            
            // إزالة الفئة النشطة من جميع الأزرار
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // إضافة الفئة النشطة للزر المحدد
            this.classList.add('active');
            
            // إخفاء جميع الأقسام
            const sections = detailsContent.querySelectorAll('.vehicle-details-section');
            sections.forEach(section => section.classList.remove('active'));
            
            // إظهار القسم المحدد
            const tabId = this.getAttribute('data-tab');
            const activeSection = document.getElementById(`vehicle-tab-${tabId}`);
            console.log('Looking for tab section:', `vehicle-tab-${tabId}`);
            
            if (activeSection) {
                console.log('Found section, activating:', activeSection.id);
                activeSection.classList.add('active');
            } else {
                console.warn('Section not found for tab:', tabId);
            }
        });
    });

    // إضافة مستمع حدث لزر الإغلاق
    const closeBtn = modal.querySelector('#close-vehicle-details-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal('vehicle-details-modal'));
    }

    // فتح النافذة المنبثقة
    openModal('vehicle-details-modal');
    
    // التأكد من أن التبويب الأول نشط
    const firstTab = modal.querySelector('.tab-btn[data-tab="info"]');
    if (firstTab) {
        firstTab.click();
    }
}

// دالة مساعدة لإنشاء عنصر معلومات في نمط Preview
function createPreviewItem(label, value, iconClass, alertClass = '') {
    let itemClass = 'preview-item';
    if (alertClass === 'danger') {
        itemClass += 'alert-danger';
    } else if (alertClass === 'warning') {
        itemClass += 'alert-warning';
    }
    
    return `
        <div class="${itemClass}">
            <i class="${iconClass || 'fas fa-info-circle'}"></i>
            <div>
                <span class="preview-label">${label}</span>
                <span class="preview-value">${value || 'N/A'}</span>
            </div>
        </div>
    `;
}

// Helper function to format numbers with commas as thousands separators
function formatNumber(number) {
    return String(number || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Create dark mode toggle button
function createDarkModeToggle() {
    const button = document.createElement('button');
    button.className = 'dark-mode-toggle';
    button.innerHTML = '<i class="fas fa-moon"></i>';
    button.title = 'Toggle Dark Mode';
    button.addEventListener('click', toggleDarkMode);
    document.body.appendChild(button);
}

// Toggle dark mode
function toggleDarkMode() {
    // إضافة تأثير انتقالي أسرع للتبديل 
    document.body.style.transition = 'background 0.3s ease';
    
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    
    // تحديث أيقونة الزر فوراً بدون تأخير
    const toggler = document.querySelector('.dark-mode-toggle');
    if (toggler) {
        toggler.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    
    // ضمان رؤية عنوان الصفحة الحالية
    const pageTitle = document.getElementById('current-page-title');
    if (pageTitle) {
        pageTitle.style.color = isDarkMode ? '#ffffff' : '';
    }
    
    // تأجيل تحديث الرسوم البيانية للتأكد من اكتمال التبديل أولاً
    setTimeout(() => {
        // تحديث الرسوم البيانية إذا كانت موجودة
        if (Object.keys(charts).length > 0) {
            updateChartsForDarkMode(isDarkMode);
        }
        
        // إزالة التأثير الانتقالي بعد الانتهاء
        document.body.style.transition = '';
    }, 50);
    
    // عرض إشعار بشكل اختياري (يمكن إزالته لتحسين الأداء)
    // showNotification(isDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'success', 2000);
}

// Update charts for dark mode
function updateChartsForDarkMode(isDarkMode) {
    // Update Chart.js default colors for dark mode
    Chart.defaults.color = isDarkMode ? '#e0e0e0' : '#666';
    Chart.defaults.borderColor = isDarkMode ? '#444' : '#ddd';
    
    // Refresh all charts
    Object.keys(charts).forEach(chartKey => {
        const chart = charts[chartKey];
        if (chart && typeof chart === 'object' && chart.update) {
            // Update the chart's options for dark mode
            if (chart.options.scales && chart.options.scales.y) {
                chart.options.scales.y.grid.color = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            }
            if (chart.options.scales && chart.options.scales.x) {
                chart.options.scales.x.grid.color = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            }
            
            // Update the chart
            chart.update();
        }
    });
    
    // If we're on the dashboard page, refresh it
    if (document.getElementById('dashboard-page').classList.contains('active')) {
        setTimeout(() => updateDashboard(), 100);
    }
}

// Check user's dark mode preference
function checkDarkModePreference() {
    // Check localStorage preference
    const darkModePreference = localStorage.getItem('darkMode');
    
    // Set appropriate class to show correct logo and update styles
    if (darkModePreference === 'enabled') {
        document.body.classList.add('dark-mode');
        const toggler = document.querySelector('.dark-mode-toggle');
        if (toggler) {
            toggler.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        // Ensure current page title is visible in dark mode
        const pageTitle = document.getElementById('current-page-title');
        if (pageTitle) {
            pageTitle.style.color = '#ffffff';
        }
        
        // Update chart defaults for dark mode
        Chart.defaults.color = '#e0e0e0';
        Chart.defaults.borderColor = '#444';
    }
    
    // Also check for system preference if no localStorage setting
    if (darkModePreference === null && 
        window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
        const toggler = document.querySelector('.dark-mode-toggle');
        if (toggler) {
            toggler.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        // Update chart defaults for dark mode
        Chart.defaults.color = '#e0e0e0';
        Chart.defaults.borderColor = '#444';
    }
}

// Create notification system
function createNotificationSystem() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
}

// Show notification
export function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add appropriate icon based on type
    let icon = 'info-circle';
    switch(type) {
        case 'success': icon = 'check-circle'; break;
        case 'error': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
    }
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-content">
            <p>${message}</p>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add close button event
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.classList.add('closing');
            setTimeout(() => {
                container.removeChild(notification);
            }, 300); // Animation time
        });
    }
    
    // Add to container
    container.appendChild(notification);
    
    // Automatically remove after duration
    setTimeout(() => {
        if (container.contains(notification)) {
            notification.classList.add('closing');
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 300); // Animation time
        }
    }, duration);
    
    // Start animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
}
