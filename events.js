// Import required functions
import { login, logout } from './auth.js';
import { showPage, openModal, closeModal, showNotification } from './script.js';
import { openVehicleModal } from './vehicles.js';
import { openMaintenanceModal, initializeMaintenancePage } from './maintenance.js';
import { openFuelModal } from './fuel.js';
import { openDriverModal } from './drivers.js';
import { openUserModal } from './users.js';
import { generateReport, exportReport } from './reports.js';
import { updateUpcomingServices, exportToExcel, toggleColumnVisibility } from './dashboard.js';

// Setup event listeners
export function setupEventListeners() {
    try {
        // Login events
        setupLoginEvents();

        // Navigation events
        setupNavigationEvents();

        // Action buttons
        setupActionButtons();

        // Form events
        setupFormEvents();

        // Report events
        setupReportEvents();

        // Column management events
        setupColumnManagementEvents();
        
        // Excel export event
        setupExcelExportEvent();
        
        // Dark mode toggle listener
        setupDarkModeToggle();
        
        // Vehicle details modal events
        setupVehicleDetailsModal();
        
        // Setup dropdown click events
        setupDropdownClickEvents();
        
        // Service type filter events
        setupServiceTypeFilterEvents();
        
        // Setup reset default button for upcoming services
        setupResetServicesDefaultButton();

        // Setup profile button events after page changes with improved logging
        const navLinks = document.querySelectorAll('.sidebar-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                const page = this.getAttribute('data-page');
                console.log(`Navigating to page: ${page}`);
                
                // تحديداً قم بإعداد أزرار البروفايل بعد التنقل إلى صفحة الصيانة
                if (page === 'maintenance') {
                    // زيادة التأخير قليلاً لضمان تحديث DOM تماماً
                    setTimeout(() => {
                        setupProfileButtonEvents();
                    }, 500);
                }
            });
        });

    } catch (error) {
        console.error('Error setting up event listeners:', error);
        showNotification('Error setting up event listeners', 'error');
    }
    
    // تحسين دالة إعداد أزرار البروفايل مع مزيد من سجلات التشخيص
    function setupProfileButtonEvents() {
        console.log('Setting up profile button events...');
        
        const profileButtons = document.querySelectorAll('.profile-btn');
        console.log(`Found ${profileButtons.length} profile buttons`);
        
        profileButtons.forEach((button, index) => {
            // إزالة مستمعات الأحداث السابقة لتجنب التكرار
            button.removeEventListener('click', profileButtonClickHandler);
            
            // إضافة مستمع حدث جديد
            button.addEventListener('click', profileButtonClickHandler);
            
            // التحقق من وجود معرف المركبة
            const vehicleId = button.dataset.vehicleId;
            console.log(`Button ${index + 1}: vehicleId = ${vehicleId || 'missing'}`);
        });
        
        console.log('Profile button events configured successfully');
    }
    
    // تحسين دالة معالجة النقر على زر البروفايل مع معالجة أخطاء أفضل
    function profileButtonClickHandler(event) {
        try {
            event.preventDefault();
            
            const vehicleId = this.dataset.vehicleId;
            console.log(`Profile button clicked for vehicle ID: ${vehicleId || 'missing'}`);
            
            if (!vehicleId) {
                console.error('No vehicle ID found in button data');
                showNotification('Missing vehicle information', 'error');
                return;
            }
            
            // استخدام openVehicleDetailsModal من النافذة العامة أو من خلال استيراد المكتبة
            if (typeof window.openVehicleDetailsModal === 'function') {
                window.openVehicleDetailsModal(vehicleId);
            } else {
                // استيراد دالة openVehicleDetailsModal من script.js
                import('./script.js').then(module => {
                    if (module && typeof module.openVehicleDetailsModal === 'function') {
                        module.openVehicleDetailsModal(vehicleId);
                    } else {
                        console.error('openVehicleDetailsModal function not found');
                        showNotification('Cannot view vehicle details. Please refresh the page and try again.', 'error');
                    }
                }).catch(error => {
                    console.error('Error importing script.js:', error);
                    showNotification('Error loading vehicle details module', 'error');
                });
            }
        } catch (error) {
            console.error('Error in profileButtonClickHandler:', error);
            showNotification('An error occurred while trying to view vehicle details', 'error');
        }
    }
    
    // تنفيذ إعداد أزرار البروفايل مباشرة عند بدء التطبيق
    setTimeout(() => {
        setupProfileButtonEvents();
        console.log('Initial profile button setup complete');
    }, 1000);
}

// تعديل دالة setupServiceFilterEvents لتحتوي فقط على أحداث شيك بوكسات الحالة
function setupServiceFilterEvents() {
    // تمت إزالة جزء أزرار الفلتر
    
    // Add status filter change events for checkboxes
    const statusCheckboxes = document.querySelectorAll('#status-filter-options input[type="checkbox"]');
    statusCheckboxes.forEach(checkbox => {
        // تحديد الحالة الأولية استناداً إلى قيمة الفلتر (تمكين فقط required و upcoming)
        if (checkbox.value === 'required' || checkbox.value === 'good') {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
        
        // إضافة مستمع الحدث
        checkbox.addEventListener('change', function() {
            updateUpcomingServices('all');
        });
    });
    
    // Select All statuses button
    const selectAllStatuses = document.getElementById('select-all-statuses');
    if (selectAllStatuses) {
        selectAllStatuses.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent closing the dropdown
            
            const statusCheckboxes = document.querySelectorAll('#status-filter-options input[type="checkbox"]');
            statusCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            
            // تحديث الجدول مباشرة بدون الاعتماد على أزرار التصفية
            updateUpcomingServices('all');
        });
    }
    
    // Clear All statuses button
    const clearAllStatuses = document.getElementById('clear-all-statuses');
    if (clearAllStatuses) {
        clearAllStatuses.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent closing the dropdown
            
            const statusCheckboxes = document.querySelectorAll('#status-filter-options input[type="checkbox"]');
            statusCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // تحديث الجدول مباشرة بدون الاعتماد على أزرار التصفية
            updateUpcomingServices('all');
        });
    }
}

// تعريف دالة جديدة لإعداد مستمعات أحداث فلتر نوع الخدمة
function setupServiceTypeFilterEvents() {
    // Add service type filter change events for checkboxes
    const typeCheckboxes = document.querySelectorAll('#service-type-filter-options input[type="checkbox"]');
    typeCheckboxes.forEach(checkbox => {
        // No need to handle data-column here as these are not for column visibility
        checkbox.addEventListener('change', function() {
            // تحديث الجدول عند تغيير الفلتر
            updateUpcomingServices('all');
        });
    });
    
    // Select All types button
    const selectAllTypes = document.getElementById('select-all-types');
    if (selectAllTypes) {
        selectAllTypes.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent closing the dropdown
            
            const typeCheckboxes = document.querySelectorAll('#service-type-filter-options input[type="checkbox"]');
            typeCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            
            // تحديث الجدول بعد تحديد جميع الأنواع
            updateUpcomingServices('all');
        });
    }
    
    // Clear All types button
    const clearAllTypes = document.getElementById('clear-all-types');
    if (clearAllTypes) {
        clearAllTypes.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent closing the dropdown
            
            const typeCheckboxes = document.querySelectorAll('#service-type-filter-options input[type="checkbox"]');
            typeCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // تحديث الجدول بعد إلغاء تحديد جميع الأنواع
            updateUpcomingServices('all');
        });
    }
}

// Setup login events
function setupLoginEvents() {
    // Login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            login();
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Listen for Enter key press in login fields
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                login();
            }
        });
    }
}

// Setup navigation events
function setupNavigationEvents() {
    // Sidebar
    const sidebar = document.getElementById('sidebar');
    const toggleSidebar = document.getElementById('toggle-sidebar');
    const closeSidebar = document.getElementById('close-sidebar');

    if (toggleSidebar && sidebar) {
        toggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    if (closeSidebar && sidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Navigation links
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active links
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Show requested page
            const page = this.getAttribute('data-page');
            if (page) {
                showPage(page);
                if (sidebar) sidebar.classList.remove('active');
            }
        });
    });
}

// Setup action buttons
function setupActionButtons() {
    // Add buttons
    const addButtons = {
        'add-vehicle-btn': openVehicleModal,
        'add-maintenance-btn': openMaintenanceModal,
        'add-fuel-btn': openFuelModal,
        'add-driver-btn': openDriverModal,
        'add-user-btn': openUserModal
    };

    for (const [id, handler] of Object.entries(addButtons)) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => handler());
        }
    }

    // Modal close buttons
    setupModalButtons();
}

// Setup modal buttons
function setupModalButtons() {
    // Close buttons
    const closeButtons = {
        'close-vehicle-modal': 'vehicle-modal',
        'close-maintenance-modal': 'maintenance-modal',
        'close-fuel-modal': 'fuel-modal',
        'close-driver-modal': 'driver-modal',
        'close-user-modal': 'user-modal',
        'close-confirm-delete': 'confirm-delete-modal'
    };

    // Cancel buttons
    const cancelButtons = {
        'cancel-vehicle-form': 'vehicle-modal',
        'cancel-maintenance-form': 'maintenance-modal',
        'cancel-fuel-form': 'fuel-modal',
        'cancel-driver-form': 'driver-modal',
        'cancel-user-form': 'user-modal',
        'cancel-delete-btn': 'confirm-delete-modal'
    };

    // Setup close buttons
    for (const [buttonId, modalId] of Object.entries({...closeButtons, ...cancelButtons})) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                closeModal(modalId);
            });
        }
    }

    // Close modal when clicking outside
    setupModalOverlayClose();
}

// Close modal when clicking outside
function setupModalOverlayClose() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            const modalId = e.target.id;
            if (modalId && !modalId.includes('confirm-delete')) {
                closeModal(modalId);
            }
        }
    });
}

// Setup form events
function setupFormEvents() {
    // Listener for user type change in user form
    const userRoleSelect = document.getElementById('user-role');
    const userManagerGroup = document.getElementById('user-manager-group');
    
    if (userRoleSelect && userManagerGroup) {
        userRoleSelect.addEventListener('change', () => {
            userManagerGroup.style.display = 
                userRoleSelect.value === 'employee' ? 'block' : 'none';
        });
    }
}

// Setup report events
function setupReportEvents() {
    // Generate report button
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReport);
    }

    // Export report button
    const exportReportBtn = document.getElementById('export-report-btn');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', exportReport);
    }

    // Monitor report type change
    const reportType = document.getElementById('report-type');
    if (reportType) {
        reportType.addEventListener('change', () => {
            const generateBtn = document.getElementById('generate-report-btn');
            const exportBtn = document.getElementById('export-report-btn');
            
            if (generateBtn && exportBtn) {
                const hasValue = reportType.value !== '';
                generateBtn.disabled = !hasValue;
                exportBtn.disabled = !hasValue;
            }
        });
    }
}

// Setup column management events
function setupColumnManagementEvents() {
    const columnCheckboxes = document.querySelectorAll('.column-option input[type="checkbox"]');
    
    // First check if getVisibleColumns is available
    const getVisibleColumns = window.getVisibleColumns || function() {
        // Fallback if window.getVisibleColumns is not yet defined
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
    
    columnCheckboxes.forEach(checkbox => {
        // Set initial state based on saved preferences
        const columnName = checkbox.dataset.column;
        
        // Skip filter checkboxes that don't need column visibility management
        if (checkbox.id && (checkbox.id.startsWith('type-') || checkbox.id.startsWith('status-'))) {
            return; // Skip type and status filter checkboxes
        }
        
        if (!columnName) {
            console.warn('Column checkbox missing data-column attribute, checking for id:', checkbox.id);
            // Try to extract column name from the ID as a fallback
            if (checkbox.id && checkbox.id.startsWith('col-')) {
                // Convert ID format (col-vehicle) to column name format (vehicle)
                const idParts = checkbox.id.split('-');
                if (idParts.length >= 2) {
                    const extractedName = idParts.slice(1).join('-');
                    checkbox.dataset.column = extractedName;
                    console.log(`Set data-column attribute to "${extractedName}" based on ID`);
                }
            } else {
                console.error('Cannot determine column name for checkbox:', checkbox);
                return;
            }
        }
        
        const visibleColumns = getVisibleColumns();
        if (visibleColumns && columnName) {
            checkbox.checked = visibleColumns[columnName] === true;
        }
        
        // Add change event listener
        checkbox.addEventListener('change', function() {
            const columnName = this.dataset.column;
            // Skip if this is a type or status filter checkbox
            if (this.id && (this.id.startsWith('type-') || this.id.startsWith('status-'))) {
                return;
            }
            
            console.log(`Column checkbox changed: ${columnName} to ${this.checked}`);
            
            // Import dashboard module to access toggleColumnVisibility
            import('./dashboard.js').then(module => {
                if (module && typeof module.toggleColumnVisibility === 'function') {
                    const result = module.toggleColumnVisibility(columnName);
                    
                    // If toggle was unsuccessful (preventing hiding all columns), revert checkbox
                    if (!result) {
                        this.checked = true;
                        if (window.showNotification) {
                            window.showNotification('At least one column must remain visible', 'warning');
                        } else {
                            alert('At least one column must remain visible');
                        }
                    } else {
                        // Mark that columns have changed - this helps Excel export know to refresh
                        const exportButton = document.getElementById('export-excel-btn');
                        if (exportButton) {
                            exportButton.setAttribute('data-columns-changed', 'true');
                            
                            // Also update the button's UI to indicate columns have changed
                            exportButton.classList.add('columns-modified');
                            // Remove the class after animation completes (subtle feedback)
                            setTimeout(() => {
                                exportButton.classList.remove('columns-modified');
                            }, 500);
                        }
                        
                        // Update the table
                        const activeFilterBtn = document.querySelector('.services-filter .filter-btn.active');
                        const filterType = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
                        
                        if (module && typeof module.updateUpcomingServices === 'function') {
                            module.updateUpcomingServices(filterType);
                        }
                    }
                } else {
                    console.error('Could not find toggleColumnVisibility function in dashboard.js module');
                }
            }).catch(error => {
                console.error('Error importing dashboard.js:', error);
            });
        });
    });
}

// Setup Excel export event
function setupExcelExportEvent() {
    const exportBtn = document.getElementById('export-excel-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Export Excel button clicked via event listener');
            
            // Set data-columns-changed attribute back to false
            this.setAttribute('data-columns-changed', 'false');
            
            // Call the export function, preferring the window version first
            if (typeof window.exportToExcel === 'function') {
                window.exportToExcel();
            } else if (typeof exportToExcel === 'function') {
                exportToExcel();
            } else {
                console.error('exportToExcel function not found');
                showNotification('Export function is not available. Please refresh the page and try again.', 'error');
            }
        });
    }
}

// Setup dark mode toggle
function setupDarkModeToggle() {
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    if (darkModeToggle) {
        // Event handler is already set in script.js when creating the toggle button
        // This function is mainly to ensure the toggle button works after DOM updates
        
        // Monitor system preference changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            try {
                // Chrome & Firefox
                mediaQuery.addEventListener('change', e => {
                    if (localStorage.getItem('darkMode') === null) {
                        // Only auto switch if user hasn't manually set a preference
                        if (e.matches) {
                            document.body.classList.add('dark-mode');
                            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                        } else {
                            document.body.classList.remove('dark-mode');
                            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                        }
                    }
                });
            } catch (e1) {
                try {
                    // Safari
                    mediaQuery.addListener(e => {
                        if (localStorage.getItem('darkMode') === null) {
                            // Only auto switch if user hasn't manually set a preference
                            if (e.matches) {
                                document.body.classList.add('dark-mode');
                                darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                            } else {
                                document.body.classList.remove('dark-mode');
                                darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                            }
                        }
                    });
                } catch (e2) {
                    console.error('Could not add dark mode change listener:', e2);
                }
            }
        }
    }
}

// Setup vehicle details modal
function setupVehicleDetailsModal() {
    const closeVehicleDetailsBtn = document.getElementById('close-vehicle-details-modal');
    if (closeVehicleDetailsBtn) {
        closeVehicleDetailsBtn.addEventListener('click', () => {
            closeModal('vehicle-details-modal');
        });
    }
}

// Setup dropdown click events
function setupDropdownClickEvents() {
    // Service type filter dropdown toggle
    const serviceTypeFilterBtn = document.getElementById('service-type-filter-btn');
    const serviceTypeFilterContent = document.querySelector('#service-type-filter-btn + .dropdown-content');
    
    if (serviceTypeFilterBtn && serviceTypeFilterContent) {
        serviceTypeFilterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle this dropdown
            serviceTypeFilterContent.classList.toggle('show');
            
            // Close other dropdowns
            const statusFilterContent = document.querySelector('#status-filter-btn + .dropdown-content');
            const manageColumnsContent = document.querySelector('#manage-columns-btn + .dropdown-content');
            
            if (statusFilterContent) {
                statusFilterContent.classList.remove('show');
            }
            
            if (manageColumnsContent) {
                manageColumnsContent.classList.remove('show');
            }
        });
    }
    
    // Status filter dropdown toggle - إضافة إغلاق فلتر النوع أيضًا
    const statusFilterBtn = document.getElementById('status-filter-btn');
    const statusFilterContent = document.querySelector('#status-filter-btn + .dropdown-content');
    
    // Remove duplicate declaration - use the variables defined earlier in the function
    if (statusFilterBtn && statusFilterContent) {
        // Remove the existing event listener first to avoid duplications
        statusFilterBtn.removeEventListener('click', statusFilterClickHandler);
        
        // Add the event listener with a named function so we can remove it if needed
        statusFilterBtn.addEventListener('click', statusFilterClickHandler);
    }
    
    // Manage columns dropdown toggle - إضافة إغلاق فلتر النوع أيضًا
    const manageColumnsBtn = document.getElementById('manage-columns-btn');
    const manageColumnsContent = document.querySelector('#manage-columns-btn + .dropdown-content');
    
    if (manageColumnsBtn && manageColumnsContent) {
        manageColumnsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle this dropdown
            manageColumnsContent.classList.toggle('show');
            
            // Close other dropdowns
            const statusFilterContent = document.querySelector('#status-filter-btn + .dropdown-content');
            const serviceTypeFilterContent = document.querySelector('#service-type-filter-btn + .dropdown-content');
            
            if (statusFilterContent) {
                statusFilterContent.classList.remove('show');
            }
            
            if (serviceTypeFilterContent) {
                serviceTypeFilterContent.classList.remove('show');
            }
        });
    }
    
    // Define the status filter click handler function
    function statusFilterClickHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle this dropdown
        statusFilterContent.classList.toggle('show');
        
        // Close other dropdowns
        const serviceTypeFilterContent = document.querySelector('#service-type-filter-btn + .dropdown-content');
        const manageColumnsContent = document.querySelector('#manage-columns-btn + .dropdown-content');
        
        if (serviceTypeFilterContent) {
            serviceTypeFilterContent.classList.remove('show');
        }
        
        if (manageColumnsContent) {
            manageColumnsContent.classList.remove('show');
        }
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        const dropdownContents = document.querySelectorAll('.dropdown-content');
        dropdownContents.forEach(content => {
            // Only close if the click is outside the dropdown and its toggle button
            const toggleBtn = content.previousElementSibling;
            if (toggleBtn && !toggleBtn.contains(e.target) && !content.contains(e.target)) {
                content.classList.remove('show');
            }
        });
    });
    
    // Prevent closing when clicking inside dropdowns
    const dropdownContents = document.querySelectorAll('.dropdown-content');
    dropdownContents.forEach(content => {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
}

// إضافة دالة جديدة لإعداد زر إعادة التعيين الافتراضي
function setupResetServicesDefaultButton() {
    const resetButton = document.getElementById('reset-services-default-btn');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            // إضافة تأثير انتقالي للزر
            this.classList.add('resetting');
            
            // إعادة تعيين جميع الفلاتر
            try {
                // 1. إعادة تعيين فلاتر الحالة (فقط required و upcoming مُفعلة)
                const statusCheckboxes = document.querySelectorAll('#status-filter-options input[type="checkbox"]');
                statusCheckboxes.forEach(checkbox => {
                    checkbox.checked = (checkbox.value === 'required' || checkbox.value === 'upcoming');
                });
                
                // 2. إعادة تعيين فلاتر نوع الخدمة
                const typeCheckboxes = document.querySelectorAll('#service-type-filter-options input[type="checkbox"]');
                typeCheckboxes.forEach(checkbox => {
                    checkbox.checked = true;
                });
                
                // 3. إعادة تعيين أعمدة العرض
                const defaultColumns = {
                    vehicle: true,
                    serviceType: true,
                    expectedDate: true,
                    status: true,
                    remaining: true
                };
                
                // حفظ إعدادات الأعمدة الافتراضية
                localStorage.setItem('upcomingServicesColumns', JSON.stringify(defaultColumns));
                
                // تحديث حالة مربعات الاختيار
                const columnCheckboxes = document.querySelectorAll('.column-option input[type="checkbox"]');
                columnCheckboxes.forEach(checkbox => {
                    const columnName = checkbox.dataset.column;
                    if (columnName && defaultColumns[columnName] !== undefined) {
                        checkbox.checked = defaultColumns[columnName];
                    }
                });
                
                // 4. تحديث الجدول
                import('./dashboard.js').then(module => {
                    if (module && typeof module.updateUpcomingServices === 'function') {
                        module.updateUpcomingServices('all');
                        
                        // إظهار إشعار بنجاح العملية
                        import('./script.js').then(scriptModule => {
                            if (scriptModule && typeof scriptModule.showNotification === 'function') {
                                scriptModule.showNotification('Services settings reset to default', 'success');
                            }
                        });
                    }
                }).catch(error => {
                    console.error('Error importing dashboard.js:', error);
                });
                
                // إزالة تأثير الدوران بعد انتهاء العملية
                setTimeout(() => {
                    this.classList.remove('resetting');
                }, 700);
                
            } catch (error) {
                console.error('Error resetting services to default:', error);
                
                // إزالة تأثير الدوران في حالة الخطأ
                this.classList.remove('resetting');
                
                // إظهار إشعار بالخطأ
                import('./script.js').then(scriptModule => {
                    if (scriptModule && typeof scriptModule.showNotification === 'function') {
                        scriptModule.showNotification('Error resetting services: ' + error.message, 'error');
                    }
                });
            }
        });
    }
}

// Setup profile button events - updated to properly capture vehicle IDs
export function setupProfileButtonEvents() {
    console.log('Setting up profile button events...');
    
    // Find all profile buttons
    const profileButtons = document.querySelectorAll('.profile-btn');
    console.log(`Found ${profileButtons.length} profile buttons`);
    
    // Add click event to each button
    profileButtons.forEach((button, index) => {
        // Use data-vehicle-id attribute instead of onclick attribute
        const vehicleId = button.getAttribute('data-vehicle-id');
        console.log(`Button ${index}: vehicleId = ${vehicleId}`);
        
        // Remove any existing click handlers to prevent duplicates
        button.removeEventListener('click', handleProfileButtonClick);
        
        // Add new click handler
        button.addEventListener('click', handleProfileButtonClick);
    });
    
    console.log('Profile button events configured successfully');
}

// Handler function for profile button clicks
function handleProfileButtonClick(event) {
    const vehicleId = this.getAttribute('data-vehicle-id');
    console.log('Profile button clicked for vehicle ID:', vehicleId);
    
    if (vehicleId) {
        // Call the global openVehicleDetailsModal function
        if (typeof window.openVehicleDetailsModal === 'function') {
            window.openVehicleDetailsModal(vehicleId);
        } else {
            console.error('openVehicleDetailsModal function not found in global scope');
        }
    } else {
        console.error('No vehicle ID found on profile button');
    }
}
