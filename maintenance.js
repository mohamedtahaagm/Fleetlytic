// Import required variables and functions
import { vehicles, drivers, maintenanceRecords, currentUser, API_URL, openModal, closeModal, showNotification } from './script.js';
import { updateUpcomingServices } from './dashboard.js';

// Initialize maintenance page
export function initializeMaintenancePage() {
    console.log('Initializing maintenance page');
    renderMaintenanceTable();
    
    // تحديث جدول الخدمات القادمة عند تحميل صفحة الصيانة
    updateUpcomingServices('all');
    
    // تحديث البطاقات الإحصائية
    animateServicesStats();
}

// Render maintenance table
export function renderMaintenanceTable() {
    const tableBody = document.querySelector('#upcoming-services-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = maintenanceRecords.map(maintenance => renderMaintenanceRow(maintenance)).join('');

    // Add event listeners for profile buttons
    addProfileButtonListeners();
}

// Add a helper function to update service stats display
function updateServicesStatsDisplay() {
    try {
        // This will ensure the stats are properly displayed 
        // when maintenance data is loaded
        import('./dashboard.js').then(module => {
            if (module && typeof module.updateUpcomingServices === 'function') {
                module.updateUpcomingServices('all');
            }
        }).catch(error => {
            console.error('Error importing dashboard.js:', error);
        });
    } catch (error) {
        console.error('Error updating service stats:', error);
    }
}

// Open maintenance modal
export function openMaintenanceModal(maintenanceId = null) {
    const modal = document.getElementById('maintenance-modal');
    if (!modal) {
        createMaintenanceModal();
        return;
    }

    // Update modal title
    modal.querySelector('.modal-title').textContent = 
        maintenanceId ? 'Edit Maintenance' : 'Add New Maintenance';

    // Reset form
    const form = modal.querySelector('form');
    form.reset();
    form.querySelector('#maintenance-id').value = maintenanceId || '';

    // Update vehicles list
    updateVehiclesList();

    // Fill maintenance data if editing
    if (maintenanceId) {
        const maintenance = maintenanceRecords.find(m => m.id === maintenanceId);
        if (maintenance) {
            fillMaintenanceForm(maintenance);
        }
    }

    // Open modal
    openModal('maintenance-modal');
}

// Handle maintenance form submission
export async function handleMaintenanceSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const maintenanceData = {
        id: form.querySelector('#maintenance-id').value,
        vehicle: form.querySelector('#maintenance-vehicle').value,
        date: form.querySelector('#maintenance-date').value,
        type: form.querySelector('#maintenance-type').value,
        nextKilometers: parseInt(form.querySelector('#maintenance-kilometers').value),
        notes: form.querySelector('#maintenance-notes').value
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: maintenanceData.id ? 'updateMaintenance' : 'addMaintenance',
                ...maintenanceData
            })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            // Update maintenance records list
            if (maintenanceData.id) {
                const index = maintenanceRecords.findIndex(m => m.id === maintenanceData.id);
                if (index !== -1) maintenanceRecords[index] = result.data;
            } else {
                maintenanceRecords.push(result.data);
            }

            // Update last maintenance date for vehicle
            const vehicle = vehicles.find(v => v.id === maintenanceData.vehicle);
            if (vehicle) {
                vehicle.lastMaintenance = maintenanceData.date;
            }

            closeModal('maintenance-modal');
            renderMaintenanceTable();
            updateDashboard();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error submitting maintenance form:', error);
        alert('Error saving data');
    }
}

// Create maintenance modal
function createMaintenanceModal() {
    const modalHTML = `
        <div id="maintenance-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Add New Maintenance</h3>
                    <button id="close-maintenance-modal" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="maintenance-form">
                    <input type="hidden" id="maintenance-id">
                    <div class="form-group">
                        <label for="maintenance-vehicle">Vehicle</label>
                        <select id="maintenance-vehicle" required></select>
                    </div>
                    <div class="form-group">
                        <label for="maintenance-date">Maintenance Date</label>
                        <input type="date" id="maintenance-date" required>
                    </div>
                    <div class="form-group">
                        <label for="maintenance-type">Maintenance Type</label>
                        <select id="maintenance-type" required>
                            <option value="">Select Maintenance Type</option>
                            <option value="oil">Oil Change</option>
                            <option value="tires">Tire Change</option>
                            <option value="brakes">Brakes Service</option>
                            <option value="engine">Engine Service</option>
                            <option value="general">General Maintenance</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="maintenance-kilometers">Next Maintenance Kilometers</label>
                        <input type="number" id="maintenance-kilometers" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="maintenance-notes">Notes</label>
                        <textarea id="maintenance-notes"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" id="cancel-maintenance-form" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('maintenance-form').addEventListener('submit', handleMaintenanceSubmit);
}

// Fill maintenance form with data
function fillMaintenanceForm(maintenance) {
    const form = document.getElementById('maintenance-form');
    form.querySelector('#maintenance-vehicle').value = maintenance.vehicle;
    form.querySelector('#maintenance-date').value = maintenance.date;
    form.querySelector('#maintenance-type').value = maintenance.type;
    form.querySelector('#maintenance-kilometers').value = maintenance.nextKilometers;
    form.querySelector('#maintenance-notes').value = maintenance.notes || '';
}

// Update vehicle lists
function updateVehicleList() {
    const vehicleSelect = document.getElementById('maintenance-vehicle');
    if (!vehicleSelect) return;

    // Filter vehicles by manager
    let availableVehicles = vehicles;
    if (currentUser.role === 'manager') {
        availableVehicles = vehicles.filter(v => v.manager === currentUser.id);
    }

    vehicleSelect.innerHTML = '<option value="">Select Vehicle</option>' +
        availableVehicles.map(vehicle => 
            `<option value="${vehicle.id}">${vehicle.serial}</option>`
        ).join('');
}

// Confirm delete maintenance
function confirmDeleteMaintenance(maintenanceId) {
    const maintenance = maintenanceRecords.find(m => m.id === maintenanceId);
    if (!maintenance) return;

    const vehicle = vehicles.find(v => v.id === maintenance.vehicle);
    const message = `Are you sure you want to delete maintenance record for vehicle ${vehicle ? vehicle.serial : ''}?`;
    
    if (confirm(message)) {
        deleteMaintenance(maintenanceId);
    }
}

// Delete maintenance
async function deleteMaintenance(maintenanceId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deleteMaintenance',
                id: maintenanceId
            })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            maintenanceRecords = maintenanceRecords.filter(m => m.id !== maintenanceId);
            renderMaintenanceTable();
            updateDashboard();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error deleting maintenance:', error);
        alert('Error deleting record');
    }
}

// Add event listeners for maintenance action buttons
function addMaintenanceActionListeners() {
    // Profile buttons
    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const vehicleId = this.getAttribute('data-vehicle-id');
            if (vehicleId && typeof window.openVehicleDetailsModal === 'function') {
                window.openVehicleDetailsModal(vehicleId);
            }
        });
    });

    // Edit buttons
    document.querySelectorAll('#maintenance-page .edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const maintenanceId = btn.getAttribute('data-id');
            openMaintenanceModal(maintenanceId);
        });
    });

    // Delete buttons
    document.querySelectorAll('#maintenance-page .delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const maintenanceId = btn.getAttribute('data-id');
            confirmDeleteMaintenance(maintenanceId);
        });
    });
}

// إضافة تأثير حركي للبطاقات الإحصائية عند تحميلها
function animateServicesStats() {
    const statCards = document.querySelectorAll('#maintenance-page .services-stat');
    statCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('update-highlight');
            setTimeout(() => {
                card.classList.remove('update-highlight');
            }, 1000);
        }, index * 100); // إضافة تأخير متدرج للبطاقات
    });
}

// Update the table row generation in renderMaintenanceTable function
function renderMaintenanceRow(maintenance) {
    const vehicle = vehicles.find(v => v.id === maintenance.vehicle);
    const isEditable = currentUser?.role !== 'employee';
    return `
        <tr>
            <td>${vehicle?.serial || 'Unknown'}</td>
            <td>${maintenance.type}</td>
            <td>${new Date(maintenance.date).toLocaleDateString()}</td>
            <td>${maintenance.nextKilometers}</td>
            <td>
                <div class="action-buttons">
                    <button type="button" class="btn btn-sm btn-primary profile-btn" 
                            data-vehicle-id="${maintenance.vehicle}">
                        <i class="fas fa-id-card"></i> Profile
                    </button>
                    ${isEditable ? `
                        <button class="action-btn edit-btn" data-id="${maintenance.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${maintenance.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// Add profile button listeners - improved to properly handle vehicle IDs
function addProfileButtonListeners() {
    document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const vehicleId = this.getAttribute('data-vehicle-id');
            console.log('Maintenance page: Profile button clicked with vehicle ID:', vehicleId);
            
            if (vehicleId) {
                if (typeof window.openVehicleDetailsModal === 'function') {
                    window.openVehicleDetailsModal(vehicleId);
                } else {
                    console.error('openVehicleDetailsModal function not available');
                    // Try to import and use from script.js
                    import('./script.js').then(module => {
                        if (module && typeof module.openVehicleDetailsModal === 'function') {
                            module.openVehicleDetailsModal(vehicleId);
                        } else {
                            console.error('Could not find openVehicleDetailsModal in script.js');
                            alert('Cannot open vehicle details at this time.');
                        }
                    }).catch(err => console.error('Error importing script.js:', err));
                }
            } else {
                console.error('No vehicle ID found on profile button');
                alert('Vehicle ID is missing. Cannot display details.');
            }
        });
    });
}

// Open vehicle details modal within the maintenance page
export function openVehicleDetailsModal(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        alert('Vehicle not found.');
        return;
    }

    // Check if modal already exists
    let modal = document.getElementById('vehicle-details-modal');
    if (!modal) {
        // Create modal if it doesn't exist
        modal = document.createElement('div');
        modal.id = 'vehicle-details-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Vehicle Details</h3>
                    <button id="close-vehicle-details-modal" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="vehicle-details-content" class="modal-body"></div>
            </div>
        `;
        document.getElementById('maintenance-page').appendChild(modal);

        // Add close button event listener
        modal.querySelector('#close-vehicle-details-modal').addEventListener('click', () => {
            closeModal('vehicle-details-modal');
        });
    }

    // Populate modal content
    const detailsContent = modal.querySelector('#vehicle-details-content');
    detailsContent.innerHTML = `
        <p><strong>Vehicle Serial:</strong> ${vehicle.serial || 'N/A'}</p>
        <p><strong>Model:</strong> ${vehicle.model || 'N/A'}</p>
        <p><strong>License Plate:</strong> ${vehicle.licensePlate || 'N/A'}</p>
        <p><strong>Status:</strong> ${vehicle.status || 'N/A'}</p>
    `;

    // Open modal
    openModal('vehicle-details-modal');
}
