// Import required variables and functions
import { vehicles, drivers, currentUser, API_URL, openModal, closeModal } from './script.js';
import { updateDashboard } from './dashboard.js';

// Render drivers table
export function renderDriversTable() {
    const page = document.getElementById('drivers-page');
    if (!page.querySelector('table')) {
        initializeDriversPage();
        return;
    }

    const tableBody = page.querySelector('table tbody');
    if (!tableBody) return;

    // Filter drivers by manager
    let filteredDrivers = drivers;
    if (currentUser.role === 'manager') {
        const managerVehicles = vehicles.filter(v => v.manager === currentUser.id).map(v => v.id);
        filteredDrivers = drivers.filter(d => d.vehicle && managerVehicles.includes(d.vehicle));
    }

    // Create table rows
    tableBody.innerHTML = filteredDrivers.length ? 
        filteredDrivers.map(createDriverRow).join('') :
        '<tr><td colspan="5" class="text-center">No drivers found</td></tr>';

    // Add event listeners to buttons
    addDriverActionListeners();
}

// Initialize drivers page
function initializeDriversPage() {
    const page = document.getElementById('drivers-page');
    if (!page) return;

    page.innerHTML = `
        <div class="page-header">
            <button id="add-driver-btn" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add New Driver
            </button>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>License Number</th>
                        <th>License Expiry Date</th>
                        <th>Assigned Vehicle</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    renderDriversTable();
}

// Create a row in the drivers table
function createDriverRow(driver) {
    const vehicle = vehicles.find(v => v.id === driver.vehicle);
    const licenseExpiry = new Date(driver.licenseExpiry);
    const today = new Date();
    const daysUntilExpiry = Math.floor((licenseExpiry - today) / (1000 * 60 * 60 * 24));
    
    const licenseClass = daysUntilExpiry < 0 ? 'license-expired' :
                        daysUntilExpiry < 30 ? 'license-expiry-warning' : '';

    return `
        <tr>
            <td>${driver.name}</td>
            <td>${driver.licenseNumber}</td>
            <td class="${licenseClass}">${licenseExpiry.toLocaleDateString('en-US')}</td>
            <td>${vehicle ? vehicle.serial : '—'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" data-id="${driver.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${driver.id}" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Add event listeners for driver buttons
function addDriverActionListeners() {
    // Edit buttons
    document.querySelectorAll('#drivers-page .edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const driverId = btn.getAttribute('data-id');
            openDriverModal(driverId);
        });
    });

    // Delete buttons
    document.querySelectorAll('#drivers-page .delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const driverId = btn.getAttribute('data-id');
            confirmDeleteDriver(driverId);
        });
    });
}

// Open add/edit driver modal
export function openDriverModal(driverId = null) {
    const modal = document.getElementById('driver-modal');
    if (!modal) {
        createDriverModal();
        return;
    }

    // Update modal title
    modal.querySelector('.modal-title').textContent = 
        driverId ? 'Edit Driver Info' : 'Add New Driver';

    // Reset form
    const form = modal.querySelector('form');
    form.reset();
    form.querySelector('#driver-id').value = driverId || '';

    // Fill driver data if editing
    if (driverId) {
        const driver = drivers.find(d => d.id === driverId);
        if (driver) {
            fillDriverForm(driver);
        }
    }

    // Update available vehicles list
    updateAvailableVehicles(driverId);

    // Open modal
    openModal('driver-modal');
}

// Create driver modal
function createDriverModal() {
    const modalHTML = `
        <div id="driver-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Add New Driver</h3>
                    <button id="close-driver-modal" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="driver-form">
                    <input type="hidden" id="driver-id">
                    <div class="form-group">
                        <label for="driver-name">Name</label>
                        <input type="text" id="driver-name" required>
                    </div>
                    <div class="form-group">
                        <label for="driver-license">License Number</label>
                        <input type="text" id="driver-license" required>
                    </div>
                    <div class="form-group">
                        <label for="driver-license-expiry">License Expiry Date</label>
                        <input type="date" id="driver-license-expiry" required>
                    </div>
                    <div class="form-group">
                        <label for="driver-vehicle">Vehicle</label>
                        <select id="driver-vehicle"></select>
                    </div>
                    <div class="form-group">
                        <label for="driver-phone">Phone Number</label>
                        <input type="tel" id="driver-phone">
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" id="cancel-driver-form" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('driver-form').addEventListener('submit', handleDriverSubmit);
}

// Fill driver form with driver data
function fillDriverForm(driver) {
    const form = document.getElementById('driver-form');
    form.querySelector('#driver-name').value = driver.name;
    form.querySelector('#driver-license').value = driver.licenseNumber;
    form.querySelector('#driver-license-expiry').value = driver.licenseExpiry;
    form.querySelector('#driver-vehicle').value = driver.vehicle || '';
    form.querySelector('#driver-phone').value = driver.phone || '';
}

// Update available vehicles list
function updateAvailableVehicles(currentDriverId) {
    const vehicleSelect = document.getElementById('driver-vehicle');
    if (!vehicleSelect) return;

    // Filter vehicles by manager
    let availableVehicles = vehicles;
    if (currentUser.role === 'manager') {
        availableVehicles = vehicles.filter(v => v.manager === currentUser.id);
    }

    // Exclude vehicles assigned to other drivers
    availableVehicles = availableVehicles.filter(vehicle => {
        const assignedDriver = drivers.find(d => d.vehicle === vehicle.id);
        return !assignedDriver || assignedDriver.id === currentDriverId;
    });

    vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>' +
        availableVehicles.map(vehicle => 
            `<option value="${vehicle.id}">${vehicle.serial}</option>`
        ).join('');
}

// Handle driver form submission
export async function handleDriverSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const driverData = {
        id: form.querySelector('#driver-id').value,
        name: form.querySelector('#driver-name').value,
        licenseNumber: form.querySelector('#driver-license').value,
        licenseExpiry: form.querySelector('#driver-license-expiry').value,
        vehicle: form.querySelector('#driver-vehicle').value || null,
        phone: form.querySelector('#driver-phone').value
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: driverData.id ? 'updateDriver' : 'addDriver',
                ...driverData
            })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            if (driverData.id) {
                const index = drivers.findIndex(d => d.id === driverData.id);
                if (index !== -1) drivers[index] = result.data;
            } else {
                drivers.push(result.data);
            }

            closeModal('driver-modal');
            renderDriversTable();
            updateDashboard();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error submitting driver form:', error);
        alert('Error saving data');
    }
}

// Confirm delete driver
function confirmDeleteDriver(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    const message = `Are you sure you want to delete driver ${driver.name}?`;
    if (confirm(message)) {
        deleteDriver(driverId);
    }
}

// Delete driver
async function deleteDriver(driverId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deleteDriver',
                id: driverId
            })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            // Update associated vehicle
            const driver = drivers.find(d => d.id === driverId);
            if (driver && driver.vehicle) {
                const vehicle = vehicles.find(v => v.id === driver.vehicle);
                if (vehicle) {
                    vehicle.driver = null;
                }
            }

            drivers = drivers.filter(d => d.id !== driverId);
            renderDriversTable();
            updateDashboard();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error deleting driver:', error);
        alert('Error deleting driver');
    }
}
