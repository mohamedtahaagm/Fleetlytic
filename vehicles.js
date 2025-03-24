// Import required variables and functions
import { vehicles, drivers, users, currentUser, API_URL, openModal, closeModal } from './script.js';
import { updateDashboard } from './dashboard.js';

// Render vehicles table
export function renderVehiclesTable() {
    const tableBody = document.querySelector('#vehicles-page table tbody');
    if (!tableBody) {
        initializeVehiclesPage();
        return;
    }

    // Filter vehicles by manager
    let filteredVehicles = vehicles;
    if (currentUser.role === 'manager') {
        filteredVehicles = vehicles.filter(v => v.manager === currentUser.id);
    }

    // Create table rows
    tableBody.innerHTML = filteredVehicles.length ? 
        filteredVehicles.map(createVehicleRow).join('') :
        '<tr><td colspan="8" class="text-center">No vehicles found</td></tr>';

    // Add event listeners to buttons
    addVehicleActionListeners();
}

// Initialize vehicles page
function initializeVehiclesPage() {
    const page = document.getElementById('vehicles-page');
    if (!page) return;

    page.innerHTML = `
        <div class="page-header">
            <button id="add-vehicle-btn" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add New Vehicle
            </button>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>License Plate</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Last Maintenance</th>
                        <th>Current Km</th>
                        <th>Driver</th>
                        <th>Manager</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    renderVehiclesTable();
}

// Create a row in the vehicles table
function createVehicleRow(vehicle) {
    const driver = drivers.find(d => d.id === vehicle.driver);
    const manager = users.find(u => u.id === vehicle.manager);

    return `
        <tr>
            <td>${vehicle['License Plate']}</td>
            <td>${vehicle['Vehicle Type']}</td>
            <td>${vehicle['Vehicle Status']}</td>
            <td>${vehicle['Last Maintenance Date'] || 'N/A'}</td>
            <td>${vehicle['Current Km']} Km</td>
            <td>${driver ? driver.name : 'N/A'}</td>
            <td>${manager ? manager.name : 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" data-id="${vehicle.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${vehicle.id}" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Add event listeners for vehicle action buttons
function addVehicleActionListeners() {
    // Edit buttons
    document.querySelectorAll('#vehicles-page .edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const vehicleId = btn.getAttribute('data-id');
            openVehicleModal(vehicleId);
        });
    });

    // Delete buttons
    document.querySelectorAll('#vehicles-page .delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const vehicleId = btn.getAttribute('data-id');
            confirmDeleteVehicle(vehicleId);
        });
    });
}

// Open add/edit vehicle modal
export function openVehicleModal(vehicleId = null) {
    const modal = document.getElementById('vehicle-modal');
    if (!modal) {
        createVehicleModal();
        return;
    }

    // Update modal title
    modal.querySelector('.modal-title').textContent = 
        vehicleId ? 'Edit Vehicle' : 'Add New Vehicle';

    // Reset form
    const form = modal.querySelector('form');
    form.reset();
    form.querySelector('#vehicle-id').value = vehicleId || '';

    // Fill vehicle data if editing
    if (vehicleId) {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
            fillVehicleForm(vehicle);
        }
    }

    // Update driver and manager lists in form
    updateVehicleFormLists();

    // Open modal
    openModal('vehicle-modal');
}

// Create vehicle modal
function createVehicleModal() {
    const modalHTML = `
        <div id="vehicle-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Add New Vehicle</h3>
                    <button id="close-vehicle-modal" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="vehicle-form">
                    <input type="hidden" id="vehicle-id">
                    <div class="form-group">
                        <label for="vehicle-serial">License Plate</label>
                        <input type="text" id="vehicle-serial" required>
                    </div>
                    <div class="form-group">
                        <label for="vehicle-type">Type</label>
                        <select id="vehicle-type" required>
                            <option value="">Select Vehicle Type</option>
                            <option value="sedan">Sedan</option>
                            <option value="suv">SUV</option>
                            <option value="truck">Truck</option>
                            <option value="van">Van</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="vehicle-status">Status</label>
                        <select id="vehicle-status" required>
                            <option value="">Select Vehicle Status</option>
                            <option value="active">Active</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="vehicle-kilometers">Current Kilometers</label>
                        <input type="number" id="vehicle-kilometers" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="vehicle-driver">Driver</label>
                        <select id="vehicle-driver"></select>
                    </div>
                    <div class="form-group">
                        <label for="vehicle-manager">Manager</label>
                        <select id="vehicle-manager" required></select>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" id="cancel-vehicle-form" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('vehicle-form').addEventListener('submit', handleVehicleSubmit);
}

// Fill vehicle form with vehicle data
function fillVehicleForm(vehicle) {
    const form = document.getElementById('vehicle-form');
    form.querySelector('#vehicle-serial').value = vehicle.serial;
    form.querySelector('#vehicle-type').value = vehicle.type;
    form.querySelector('#vehicle-status').value = vehicle.status;
    form.querySelector('#vehicle-kilometers').value = vehicle.currentKilometers;
    form.querySelector('#vehicle-driver').value = vehicle.driver || '';
    form.querySelector('#vehicle-manager').value = vehicle.manager || '';
}

// Update driver and manager lists
function updateVehicleFormLists() {
    // Update drivers list
    const driverSelect = document.getElementById('vehicle-driver');
    driverSelect.innerHTML = '<option value="">Select Driver</option>' +
        drivers.map(driver => 
            `<option value="${driver.id}">${driver.name}</option>`
        ).join('');

    // Update managers list
    const managerSelect = document.getElementById('vehicle-manager');
    const managers = users.filter(user => user.role === 'manager');
    managerSelect.innerHTML = '<option value="">Select Manager</option>' +
        managers.map(manager => 
            `<option value="${manager.id}">${manager.name}</option>`
        ).join('');
}

// Handle vehicle form submission
export async function handleVehicleSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const vehicleData = {
        id: form.querySelector('#vehicle-id').value,
        serial: form.querySelector('#vehicle-serial').value,
        type: form.querySelector('#vehicle-type').value,
        status: form.querySelector('#vehicle-status').value,
        currentKilometers: parseInt(form.querySelector('#vehicle-kilometers').value),
        driver: form.querySelector('#vehicle-driver').value || null,
        manager: form.querySelector('#vehicle-manager').value
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: vehicleData.id ? 'updateVehicle' : 'addVehicle',
                ...vehicleData
            })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            if (vehicleData.id) {
                const index = vehicles.findIndex(v => v.id === vehicleData.id);
                if (index !== -1) vehicles[index] = result.data;
            } else {
                vehicles.push(result.data);
            }

            closeModal('vehicle-modal');
            renderVehiclesTable();
            updateDashboard();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error submitting vehicle form:', error);
        alert('Error saving data');
    }
}

// Confirm delete vehicle
function confirmDeleteVehicle(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const message = `Are you sure you want to delete vehicle ${vehicle.serial}?`;
    if (confirm(message)) {
        deleteVehicle(vehicleId);
    }
}

// Delete vehicle
async function deleteVehicle(vehicleId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deleteVehicle',
                id: vehicleId
            })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            vehicles = vehicles.filter(v => v.id !== vehicleId);
            renderVehiclesTable();
            updateDashboard();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        alert('Error deleting vehicle');
    }
}

// Helper functions
function getVehicleType(type) {
    const types = {
        'sedan': 'Sedan',
        'suv': 'SUV',
        'truck': 'Truck',
        'van': 'Van'
    };
    return types[type] || type;
}

function getVehicleStatus(status) {
    const statuses = {
        'active': '<span class="status-active">Active</span>',
        'maintenance': '<span class="status-maintenance">Maintenance</span>',
        'inactive': '<span class="status-inactive">Inactive</span>'
    };
    return statuses[status] || status;
}
