// Import required variables and functions
import { users, currentUser, API_URL, openModal, closeModal } from './script.js';

// Render users table
export function renderUsersTable() {
    // Check for admin role
    if (currentUser?.role !== 'admin') {
        return;
    }

    const page = document.getElementById('users-page');
    if (!page) return;

    // Initialize users page if not exists
    if (!page.querySelector('table')) {
        initializeUsersPage();
    }

    const tableBody = page.querySelector('table tbody');
    if (!tableBody) return;

    // Create table rows
    tableBody.innerHTML = users.length ? 
        users.map(createUserRow).join('') :
        '<tr><td colspan="4" class="text-center">No users found</td></tr>';

    // Add event listeners to buttons
    addUserActionListeners();
}

// Initialize users page
function initializeUsersPage() {
    const page = document.getElementById('users-page');
    if (!page) return;

    page.innerHTML = `
        <div class="page-header">
            <button id="add-user-btn" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add New User
            </button>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;
}

// Create a row in the users table
function createUserRow(user) {
    return `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${getUserRole(user.role)}</td>
            <td>
                <div class="action-buttons">
                    ${user.id !== currentUser.id ? `
                        <button class="action-btn edit-btn" data-id="${user.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${user.id}" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : '—'}
                </div>
            </td>
        </tr>
    `;
}

// Add event listeners for user buttons
function addUserActionListeners() {
    // Edit buttons
    document.querySelectorAll('#users-page .edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            openUserModal(userId);
        });
    });

    // Delete buttons
    document.querySelectorAll('#users-page .delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            confirmDeleteUser(userId);
        });
    });
}

// Open add/edit user modal
export function openUserModal(userId = null) {
    const modal = document.getElementById('user-modal');
    if (!modal) {
        createUserModal();
        return;
    }

    // Update modal title
    modal.querySelector('.modal-title').textContent = 
        userId ? 'Edit User' : 'Add New User';

    // Reset form
    const form = modal.querySelector('form');
    form.reset();
    form.querySelector('#user-id').value = userId || '';

    // Hide password field for edit mode
    const passwordGroup = form.querySelector('#user-password-group');
    if (passwordGroup) {
        passwordGroup.style.display = userId ? 'none' : 'block';
    }

    // Fill user data if editing
    if (userId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            fillUserForm(user);
        }
    }

    // Update managers list
    updateManagersList();

    // Open modal
    openModal('user-modal');
}

// Create user modal
function createUserModal() {
    const modalHTML = `
        <div id="user-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Add New User</h3>
                    <button id="close-user-modal" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="user-form">
                    <input type="hidden" id="user-id">
                    <div class="form-group">
                        <label for="user-name">Name</label>
                        <input type="text" id="user-name" required>
                    </div>
                    <div class="form-group">
                        <label for="user-email">Email</label>
                        <input type="email" id="user-email" required>
                    </div>
                    <div class="form-group" id="user-password-group">
                        <label for="user-password">Password</label>
                        <input type="password" id="user-password" required>
                    </div>
                    <div class="form-group">
                        <label for="user-role">Role</label>
                        <select id="user-role" required>
                            <option value="">Select Role</option>
                            <option value="admin">System Admin</option>
                            <option value="manager">Manager</option>
                            <option value="employee">Employee</option>
                        </select>
                    </div>
                    <div class="form-group" id="user-manager-group" style="display: none;">
                        <label for="user-manager">Manager</label>
                        <select id="user-manager"></select>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" id="cancel-user-form" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
}

// Fill user form with user data
function fillUserForm(user) {
    const form = document.getElementById('user-form');
    form.querySelector('#user-name').value = user.name;
    form.querySelector('#user-email').value = user.email;
    form.querySelector('#user-role').value = user.role;
    
    const managerGroup = form.querySelector('#user-manager-group');
    const managerSelect = form.querySelector('#user-manager');
    
    if (user.role === 'employee') {
        managerGroup.style.display = 'block';
        managerSelect.value = user.manager || '';
    } else {
        managerGroup.style.display = 'none';
    }
}

// Update managers list
function updateManagersList() {
    const managerSelect = document.getElementById('user-manager');
    if (!managerSelect) return;

    const managers = users.filter(user => user.role === 'manager');
    managerSelect.innerHTML = '<option value="">Select Manager</option>' +
        managers.map(manager => 
            `<option value="${manager.id}">${manager.name}</option>`
        ).join('');
}

// Handle user form submission
export async function handleUserSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const userData = {
        id: form.querySelector('#user-id').value,
        name: form.querySelector('#user-name').value,
        email: form.querySelector('#user-email').value,
        password: form.querySelector('#user-password')?.value,
        role: form.querySelector('#user-role').value,
        manager: form.querySelector('#user-manager').value || null
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: userData.id ? 'updateUser' : 'addUser',
                ...userData
            })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            if (userData.id) {
                const index = users.findIndex(u => u.id === userData.id);
                if (index !== -1) users[index] = result.data;
            } else {
                users.push(result.data);
            }

            closeModal('user-modal');
            renderUsersTable();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error submitting user form:', error);
        alert('Error saving data');
    }
}

// Confirm delete user
function confirmDeleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const message = `Are you sure you want to delete user ${user.name}?`;
    if (confirm(message)) {
        deleteUser(userId);
    }
}

// Delete user
async function deleteUser(userId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deleteUser',
                id: userId
            })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            users = users.filter(u => u.id !== userId);
            renderUsersTable();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
    }
}

// Translate user role
function getUserRole(role) {
    const roles = {
        'admin': 'System Admin',
        'manager': 'Manager',
        'employee': 'Employee'
    };
    return roles[role] || role;
}
