// Import required variables and functions
import { vehicles, drivers, maintenanceRecords, charts, openModal } from './script.js';

// Update the dashboard
export function updateDashboard() {
    try {
        updateStatistics();
        createCharts();
        
        // إزالة تحديث الخدمات القادمة من دالة تحديث Dashboard
        // تم نقل هذه الوظيفة إلى صفحة Maintenance

        renderVehicleStatusChart();
        renderVehicleTypesChart();
        renderVehicleAgeChart(); // Add call to the new chart
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Status normalization
function normalizeStatus(status) {
    if (!status) return 'inactive';
    status = status.toLowerCase().trim();

    if (status === 'active' || status === 'نشط') return 'active';
    if (status === 'maintenance' || status === 'صيانة') return 'maintenance';
    if (status === 'inactive' || status === 'متوقف') return 'inactive';

    return 'inactive'; // Default fallback
}

// Update statistics
function updateStatistics() {
    try {
        if (!Array.isArray(vehicles)) {
            console.error('Vehicles data is not an array:', vehicles);
            resetStatistics();
            return;
        }

        // Calculate vehicle counts
        const totalVehicles = vehicles.length;
        const statusCounts = vehicles.reduce((counts, vehicle) => {
            const status = normalizeStatus(vehicle['Vehicle Status']);
            counts[status]++;
            return counts;
        }, { active: 0, maintenance: 0, inactive: 0 });

        // Update the UI
        setElementText('total-vehicles', formatNumber(totalVehicles));
        setElementText('active-vehicles', formatNumber(statusCounts.active));
        setElementText('in-maintenance', formatNumber(statusCounts.maintenance));
        setElementText('inactive-vehicles', formatNumber(statusCounts.inactive));

        console.log('Updated vehicle statistics:', {
            total: totalVehicles,
            ...statusCounts
        });
    } catch (error) {
        console.error('Error updating statistics:', error);
        resetStatistics();
    }
}

// تعديل دالة إنشاء المخططات لإضافة معالجي الأحداث لأزرار التبديل
function createCharts() {
    try {
        console.log('Creating dashboard charts now...');
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Set global chart defaults based on dark mode
        Chart.defaults.color = isDarkMode ? '#e0e0e0' : '#666';
        Chart.defaults.borderColor = isDarkMode ? '#444' : '#ddd';
        
        // إزالة دالة إنشاء مخطط حالة المركبة
        // createVehicleChart('status');
        // setupChartToggleButtons();
        
        createLocationChart();
        createServiceTypeChart();
        createMaintenanceKmChart();
        createTireChangeChart();
        createLicenseRenewalChart();
        createInactiveDistributionChart();
    } catch (error) {
        console.error('Error creating charts:', error);
    }
}

// إزالة دالة إعداد أزرار التبديل
// function setupChartToggleButtons() { ... }

// إزالة دالة إنشاء مخطط المركبات الموحدة
// function createVehicleChart(chartType = 'status') { ... }

// إزالة دالة إنشاء مخطط حسب الحالة
// function createVehicleStatusChart() { ... }

// إزالة دالة إنشاء مخطط حسب نوع المركبة
// function createVehicleTypeChart() { ... }

function createLocationChart() {
    const ctx = getChartContext('location-chart');
    if (!ctx) return;

    const locationCounts = vehicles.reduce((counts, vehicle) => {
        const location = vehicle['Current Location'] || 'غير محدد';
        counts[location] = (counts[location] || 0) + 1;
        return counts;
    }, {});
    
    const labels = Object.keys(locationCounts);
    const data = Object.values(locationCounts);
    const total = data.reduce((sum, val) => sum + val, 0);
    
    destroyChart('location');
    charts.location = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map((label, index) => {
                const percentage = Math.round((data[index] / total) * 100);
                return `${label}: ${data[index]} (${percentage}%)`;
            }),
            datasets: [{
                label: 'Vehicle Location',
                data: data,
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6']
            }]
        },
        options: {
            ...getChartOptions(),
            plugins: {
                ...getChartOptions().plugins,
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label.split(':')[0]}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createServiceTypeChart() {
    const ctx = getChartContext('service-type-chart');
    if (!ctx) return;

    const typeCounts = vehicles.reduce((counts, vehicle) => {
        const type = vehicle['Service Type'] || 'غير محدد';
        counts[type] = (counts[type] || 0) + 1;
        return counts;
    }, {});
    
    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);
    const total = data.reduce((sum, val) => sum + val, 0);

    destroyChart('serviceType');
    charts.serviceType = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map((label, index) => {
                const percentage = Math.round((data[index] / total) * 100);
                return `${label}: ${data[index]} (${percentage}%)`;
            }),
            datasets: [{
                label: 'Vehicle Service Types',
                data: data,
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12']
            }]
        },
        options: {
            ...getChartOptions(),
            plugins: {
                ...getChartOptions().plugins,
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label.split(':')[0]}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createMaintenanceTimelineChart() {
    try {
        const ctx = getChartContext('maintenance-timeline-chart');
        if (!ctx) {
            console.error('Could not get maintenance timeline chart context');
            return;
        }

        console.log('Vehicles data before processing:', vehicles);

        // Process and validate data
        const maintenanceData = vehicles
            .filter(vehicle => {
                console.log('Vehicle data for maintenance timeline:', vehicle);
                const hasPlate = Boolean(vehicle['License Plate']);
                const hasCurrentKm = Boolean(vehicle['Current Km']);
                const hasNextKm = Boolean(vehicle['Next Maintenance Km']);
                return hasPlate && hasCurrentKm && hasNextKm;
            })
            .map(vehicle => {
                console.log('Vehicle object for maintenance processing:', JSON.stringify(vehicle, null, 2));
                const currentKm = parseInt(String(vehicle['Current Km']).replace(/,/g, '')) || 0;
                const kmToNext = parseInt(String(vehicle['Next Maintenance Km']).replace(/,/g, '')) || 0;
                const plate = vehicle['License Plate'] || 'Unknown';

                console.log('Processing vehicle:', {
                    plate,
                    currentKm,
                    kmToNext
                });

                return {
                    plate: plate,
                    currentKm: currentKm,
                    nextKm: kmToNext
                };
            })
            .filter(vehicle => vehicle.currentKm >= 0 || vehicle.nextKm >= 0) // Allow 0 values
            .sort((a, b) => a.currentKm - b.currentKm);

        console.log(`Processed ${maintenanceData.length} vehicles for maintenance timeline`);

        if (maintenanceData.length === 0) {
            console.error('No valid maintenance data available');
            return;
        }

        destroyChart('maintenanceTimeline');
        charts.maintenanceTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: maintenanceData.map(v => v.plate), // Use license plates as labels
                datasets: [
                    {
                        label: 'Current Km',
                        data: maintenanceData.map(v => v.currentKm),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        pointStyle: 'circle',
                        pointRadius: 2,
                        pointHoverRadius: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Next Maintenance Km',
                        data: maintenanceData.map(v => v.nextKm),
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        borderWidth: 2,
                        pointStyle: 'circle',
                        pointRadius: 2,
                        pointHoverRadius: 3,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Arial' },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toLocaleString()} Km`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: { family: 'Arial' },
                            maxRotation: 90, // Rotate labels vertically
                            minRotation: 90
                        },
                        grid: {
                            display: true // Keep x-axis grid lines
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { font: { family: 'Arial' },
                            callback: function(value) {
                                return value.toLocaleString() + ' Km';
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
        console.log('Maintenance timeline chart created successfully');
    } catch (error) {
        console.error('Error creating maintenance timeline chart:', error);
    }
}

function createMaintenanceKmChart() {
    const ctx = getChartContext('maintenance-km-chart');
    if (!ctx) return;

    const kmData = vehicles
        .filter(v => v['Km to next maintenance'])
        .map(v => ({
            id: v['Vehicle ID'],
            plate: v['License Plate'],
            km: parseInt(String(v['Km to next maintenance']).replace(/,/g, '')) || 0
        }))
        .sort((a, b) => a.km - b.km);

    destroyChart('maintenanceKm');
    charts.maintenanceKm = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: kmData.map(v => v.plate || v.id),
            datasets: [{
                label: 'KM to Maintenance',
                data: kmData.map(v => v.km),
                backgroundColor: kmData.map(v => {
                    const km = v.km;
                    return km < 1000 ? '#e74c3c' :
                           km < 5000 ? '#f39c12' : '#2ecc71';
                })
            }]
        },
        options: getChartOptions(true)
    });
}

function createTireChangeChart() {
    const ctx = getChartContext('tire-change-chart');
    if (!ctx) return;

    const tireData = vehicles
        .filter(v => v['Km left for tire change'])
        .map(v => ({
            id: v['Vehicle ID'],
            plate: v['License Plate'],
            km: parseInt(String(v['Km left for tire change']).replace(/,/g, '')) || 0
        }))
        .sort((a, b) => a.km - b.km);

    destroyChart('tireChange');
    charts.tireChange = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tireData.map(v => v.plate || v.id),
            datasets: [{
                label: 'KM to Tire Change',
                data: tireData.map(v => v.km),
                backgroundColor: tireData.map(v =>
                    v.km < 1000 ? '#e74c3c' :
                    v.km < 5000 ? '#f39c12' : '#2ecc71'
                )
            }]
        },
        options: getChartOptions(true)
    });
}

function createLicenseRenewalChart() {
    const ctx = getChartContext('license-renewal-chart');
    if (!ctx) return;

    const licenseData = vehicles
        .filter(v => v['Days to renew license'])
        .map(v => ({
            id: v['Vehicle ID'],
            plate: v['License Plate'],
            days: parseInt(v['Days to renew license']) || 0
        }))
        .sort((a, b) => a.days - b.days);

    destroyChart('licenseRenewal');
    charts.licenseRenewal = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: licenseData.map(v => v.plate || v.id),
            datasets: [{
                label: 'Days to License Renewal',
                data: licenseData.map(v => v.days),
                backgroundColor: licenseData.map(v => {
                    const days = v.days;
                    return days < 7 ? '#e74c3c' :
                           days < 30 ? '#f39c12' : '#2ecc71';
                })
            }]
        },
        options: getChartOptions(true)
    });
}

function createInactiveDistributionChart() {
    const ctx = getChartContext('inactive-distribution-chart');
    if (!ctx) return;

    // Filter inactive vehicles and group by location
    const inactiveByLocation = vehicles
        .filter(vehicle => normalizeStatus(vehicle['Vehicle Status']) === 'inactive')
        .reduce((counts, vehicle) => {
            const location = vehicle['Current Location'] || 'غير محدد';
            counts[location] = (counts[location] || 0) + 1;
            return counts;
        }, {});

    const locations = Object.keys(inactiveByLocation);
    const counts = Object.values(inactiveByLocation);
    const total = counts.reduce((sum, val) => sum + val, 0);

    // Define colors matching the site's color scheme
    const colors = [
        '#ef4444', '#f59e0b', '#fbbf24', '#64748b',
        '#8b5cf6', '#22c55e', '#FBBC05', '#EA4335'
    ];

    destroyChart('inactiveDistribution');
    charts.inactiveDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: locations.map((label, index) => {
                const percentage = Math.round((counts[index] / total) * 100);
                return `${label}: ${counts[index]} (${percentage}%)`;
            }),
            datasets: [{
                label: 'Inactive Vehicles Distribution',
                data: counts,
                backgroundColor: colors.slice(0, locations.length)
            }]
        },
        options: {
            ...getChartOptions(),
            plugins: {
                ...getChartOptions().plugins,
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label.split(':')[0]}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// دالة للحصول على معلومات حالة الخدمة
function getStatusInfo(kmLeft, type) {
    const statusInfo = {};
    
    // إذا كانت الخدمة صيانة
    if (type === 'maintenance') {
        if (kmLeft <= 0) {
            // متأخر/واجب المعالجة فوراً
            statusInfo.category = 'required';
            statusInfo.class = 'critical';
            statusInfo.icon = 'exclamation-triangle';
            statusInfo.text = 'Immediate Maintenance Required';
            statusInfo.tooltip = 'Vehicle is overdue for maintenance';
            statusInfo.color = '#ef4444';
        } else if (kmLeft < 1000) {
            // قريب جداً
            statusInfo.category = 'required';
            statusInfo.class = 'critical';
            statusInfo.icon = 'exclamation-circle';
            statusInfo.text = 'Maintenance Required';
            statusInfo.tooltip = 'Vehicle requires maintenance soon';
            statusInfo.color = '#ef4444';
        } else if (kmLeft < 5000) {
            // قريب
            statusInfo.category = 'upcoming';
            statusInfo.class = 'warning';
            statusInfo.icon = 'exclamation';
            statusInfo.text = 'Upcoming Maintenance';
            statusInfo.tooltip = 'Maintenance is needed within 5000 km';
            statusInfo.color = '#f59e0b';
        } else {
            // لا توجد حاجة قريبة
            statusInfo.category = 'good';
            statusInfo.class = 'good';
            statusInfo.icon = 'check-circle';
            statusInfo.text = 'Maintenance Good';
            statusInfo.tooltip = 'Vehicle is well maintained';
            statusInfo.color = '#22c55e';
        }
    } else if (type === 'tires') {
        if (kmLeft <= 0) {
            // متأخر/واجب المعالجة فوراً
            statusInfo.category = 'required';
            statusInfo.class = 'critical';
            statusInfo.icon = 'exclamation-triangle';
            statusInfo.text = 'Immediate Tire Change Required';
            statusInfo.tooltip = 'Vehicle is overdue for tire change';
            statusInfo.color = '#ef4444';
        } else if (kmLeft < 1000) {
            // قريب جداً
            statusInfo.category = 'required';
            statusInfo.class = 'critical';
            statusInfo.icon = 'exclamation-circle';
            statusInfo.text = 'Tire Change Required';
            statusInfo.tooltip = 'Vehicle requires tire change soon';
            statusInfo.color = '#ef4444';
        } else if (kmLeft < 5000) {
            // قريب
            statusInfo.category = 'upcoming';
            statusInfo.class = 'warning';
            statusInfo.icon = 'exclamation';
            statusInfo.text = 'Upcoming Tire Change';
            statusInfo.tooltip = 'Tire change is needed within 5000 km';
            statusInfo.color = '#f59e0b';
        } else {
            // لا توجد حاجة قريبة
            statusInfo.category = 'good';
            statusInfo.class = 'good';
            statusInfo.icon = 'check-circle';
            statusInfo.text = 'Tires Good';
            statusInfo.tooltip = 'Vehicle tires are in good condition';
            statusInfo.color = '#22c55e';
        }
    } else if (type === 'license') {
        if (kmLeft <= 0) {
            // متأخر/واجب المعالجة فوراً
            statusInfo.category = 'required';
            statusInfo.class = 'critical';
            statusInfo.icon = 'exclamation-triangle';
            statusInfo.text = 'License Renewal Overdue';
            statusInfo.tooltip = 'Vehicle license is expired';
            statusInfo.color = '#ef4444';
        } else if (kmLeft < 7) {
            // قريب جداً
            statusInfo.category = 'required';
            statusInfo.class = 'critical';
            statusInfo.icon = 'exclamation-circle';
            statusInfo.text = 'License Renewal Required';
            statusInfo.tooltip = 'Vehicle license expires within 7 days';
            statusInfo.color = '#ef4444';
        } else if (kmLeft < 30) {
            // قريب
            statusInfo.category = 'upcoming';
            statusInfo.class = 'warning';
            statusInfo.icon = 'exclamation';
            statusInfo.text = 'Upcoming License Renewal';
            statusInfo.tooltip = 'Vehicle license expires within 30 days';
            statusInfo.color = '#f59e0b';
        } else {
            // لا توجد حاجة قريبة
            statusInfo.category = 'good';
            statusInfo.class = 'good';
            statusInfo.icon = 'check-circle';
            statusInfo.text = 'License Valid';
            statusInfo.tooltip = 'Vehicle license is valid';
            statusInfo.color = '#22c55e';
        }
    } else {
        // حالة افتراضية
        return { category: 'unknown', class: 'neutral', icon: 'help-circle', text: 'Unknown Status', tooltip: 'Status information not available', color: '#94a3b8' };
    }
    
    return statusInfo;
}

// تحديث بطاقات إحصائيات الخدمات
function updateServiceStats(servicesData) {
    if (!servicesData || !Array.isArray(servicesData)) return;
    
    // إنشاء عدّادات لكل نوع خدمة
    let maintenanceCount = 0;
    let tiresCount = 0;
    let licenseCount = 0;
    let criticalCount = 0;
    
    // الحصول على عدد المركبات الإجمالي
    const totalVehiclesCount = vehicles.length;
    
    // حساب عدد كل نوع من الخدمات من مصفوفة الخدمات الفعلية المعروضة في الجدول
    servicesData.forEach(service => {
        // احتساب حسب نوع الخدمة (فقط required و upcoming)
        if (service.status === 'required' || service.status === 'upcoming') {
            if (service.serviceType === 'maintenance') {
                maintenanceCount++;
                // احتساب الخدمات الحرجة فقط للحالة 'required'
                if (service.status === 'required') {
                    criticalCount++;
                }
            } else if (service.serviceType === 'tires') {
                tiresCount++;
                // احتساب الخدمات الحرجة فقط للحالة 'required'
                if (service.status === 'required') {
                    criticalCount++;
                }
            } else if (service.serviceType === 'license') {
                licenseCount++;
                // احتساب الخدمات الحرجة فقط للحالة 'required'
                if (service.status === 'required') {
                    criticalCount++;
                }
            }
        }
    });
    
    // حساب النسب المئوية
    const maintenancePercentage = totalVehiclesCount > 0 ? Math.round((maintenanceCount / totalVehiclesCount) * 100) : 0;
    const tiresPercentage = totalVehiclesCount > 0 ? Math.round((tiresCount / totalVehiclesCount) * 100) : 0;
    const licensePercentage = totalVehiclesCount > 0 ? Math.round((licenseCount / totalVehiclesCount) * 100) : 0;
    const criticalPercentage = totalVehiclesCount > 0 ? Math.round((criticalCount / totalVehiclesCount) * 100) : 0;
    
    // تحديث البطاقات الإحصائية
    const maintenanceCountEl = document.getElementById('maintenance-count');
    const tiresCountEl = document.getElementById('tires-count');
    const licenseCountEl = document.getElementById('license-count');
    const criticalCountEl = document.getElementById('critical-count');
    const totalVehiclesEl = document.getElementById('total-vehicles-services');
    
    // تحديث النسب المئوية
    const maintenancePercentageEl = document.getElementById('maintenance-percentage');
    const tiresPercentageEl = document.getElementById('tires-percentage');
    const licensePercentageEl = document.getElementById('license-percentage');
    const criticalPercentageEl = document.getElementById('critical-percentage');
    
    if (maintenanceCountEl) maintenanceCountEl.textContent = maintenanceCount;
    if (tiresCountEl) tiresCountEl.textContent = tiresCount;
    if (licenseCountEl) licenseCountEl.textContent = licenseCount;
    if (criticalCountEl) criticalCountEl.textContent = criticalCount;
    if (totalVehiclesEl) totalVehiclesEl.textContent = totalVehiclesCount;
    
    if (maintenancePercentageEl) maintenancePercentageEl.textContent = `${maintenancePercentage}%`;
    if (tiresPercentageEl) tiresPercentageEl.textContent = `${tiresPercentage}%`;
    if (licensePercentageEl) licensePercentageEl.textContent = `${licensePercentage}%`;
    if (criticalPercentageEl) criticalPercentageEl.textContent = `${criticalPercentage}%`;
    
    // إضافة تأثير عند تحديث البطاقات
    const statCards = document.querySelectorAll('.services-stat');
    statCards.forEach(card => {
        card.classList.add('update-highlight');
        setTimeout(() => {
            card.classList.remove('update-highlight');
        }, 1000);
    });

    console.log('Service stats updated from table data:', {
        maintenance: maintenanceCount,
        tires: tiresCount,
        license: licenseCount,
        critical: criticalCount,
        totalVehicles: totalVehiclesCount
    });
}

// تعديل دالة تحديث الخدمات القادمة لاستدعاء تحديث الإحصائيات بعد تكوين البيانات مباشرة
export function updateUpcomingServices(filterType = 'all') {
    console.log(`Updating upcoming services with filter: ${filterType}`);
    const tableBody = document.querySelector('#upcoming-services-table tbody');
    if (!tableBody) {
        console.error('Table body not found for upcoming services');
        return;
    }
    
    // Get visible columns configuration from localStorage
    const visibleColumns = getVisibleColumns();
    console.log('Current visible columns:', visibleColumns);
    
    // Update table header based on visible columns
    const tableHeader = document.querySelector('#upcoming-services-table thead tr');
    if (tableHeader) {
        let headerHTML = '';
        
        if (visibleColumns.vehicle) {
            headerHTML += '<th>Vehicle</th>';
        }
        if (visibleColumns.serviceType) {
            headerHTML += '<th>Service Type</th>';
        }
        if (visibleColumns.expectedDate) {
            headerHTML += '<th>Expected Date</th>';
        }
        if (visibleColumns.status) {
            headerHTML += '<th>Status</th>';
        }
        if (visibleColumns.remaining) {
            headerHTML += '<th>Remaining Distance</th>';
        }
        
        // Always keep the Actions column
        headerHTML += '<th>Actions</th>';
        
        tableHeader.innerHTML = headerHTML;
    }

    const services = [];

    // Add maintenance services - معالجة كل المركبات بغض النظر عن الفلتر
    vehicles.forEach(vehicle => {
        // استخدام parseFloat لتحويل النص إلى رقم واستبدال الفواصل
        let kmToMaintenance = parseFloat(String(vehicle['Km to next maintenance'] || '0').replace(/,/g, ''));
        const vehicleId = vehicle['Vehicle ID'];
        
        // إذا كانت القيمة NaN، استخدم 0 بدلاً منها
        if (isNaN(kmToMaintenance)) {
            kmToMaintenance = 0;
        }
        
        // تعديل: إضافة المركبة إذا كانت تحتاج إلى صيانة (قيمة سالبة أو موجبة صغيرة)
        if (vehicleId) {
            // الحصول على معلومات الحالة - نتأكد من تمرير القيمة المطلقة للحصول على المعلومات الصحيحة للمركبات ذات القيم السالبة
            const kmAbsolute = Math.abs(kmToMaintenance);
            const statusInfo = getStatusInfo(kmToMaintenance < 0 ? 0 : kmToMaintenance, 'maintenance');
            
            // تغيير النص والحالة للمركبات ذات القيم السالبة
            let statusText = statusInfo.text;
            let statusCategory = statusInfo.category;
            let statusClass = statusInfo.class;
            let statusIcon = statusInfo.icon;
            let statusTooltip = statusInfo.tooltip;
            
            if (kmToMaintenance < 0) {
                statusText = "Maintenance Overdue";
                statusCategory = "required";
                statusClass = "critical";
                statusIcon = "exclamation-triangle";
                statusTooltip = `Maintenance overdue by ${Math.abs(kmToMaintenance).toLocaleString()} Km`;
            }
            
            services.push({
                vehicleId: vehicleId,
                vehicle: vehicle['License Plate'] || vehicle['Vehicle ID'],
                serviceType: 'maintenance',
                expectedDate: calculateExpectedDate(vehicle, kmToMaintenance, 'maintenance'),
                status: statusCategory,
                statusText: statusText,
                statusClass: statusClass,
                statusIcon: statusIcon,
                statusTooltip: statusTooltip,
                remaining: kmToMaintenance, // نحتفظ بالقيمة كما هي (قد تكون سالبة)
                serviceRow: 'maintenance-service',
                rowClass: statusClass + '-row'
            });
        }
    });

    // Add tire changes - معالجة كل المركبات بغض النظر عن الفلتر
    vehicles.forEach(vehicle => {
        // استخدام parseFloat لتحويل النص إلى رقم واستبدال الفواصل
        let kmToTires = parseFloat(String(vehicle['Km left for tire change'] || '0').replace(/,/g, ''));
        const vehicleId = vehicle['Vehicle ID'];
        
        // إذا كانت القيمة NaN، استخدم 0 بدلاً منها
        if (isNaN(kmToTires)) {
            kmToTires = 0;
        }
        
        // تعديل: إضافة المركبة إذا كانت تحتاج إلى تغيير إطارات (قيمة سالبة أو موجبة صغيرة)
        if (vehicleId) {
            // الحصول على معلومات الحالة - نتأكد من تمرير القيمة المطلقة للحصول على المعلومات الصحيحة للمركبات ذات القيم السالبة
            const kmAbsolute = Math.abs(kmToTires);
            const statusInfo = getStatusInfo(kmToTires < 0 ? 0 : kmToTires, 'tires');
            
            // تغيير النص والحالة للمركبات ذات القيم السالبة
            let statusText = statusInfo.text;
            let statusCategory = statusInfo.category;
            let statusClass = statusInfo.class;
            let statusIcon = statusInfo.icon;
            let statusTooltip = statusInfo.tooltip;
            
            if (kmToTires < 0) {
                statusText = "Tire Change Overdue";
                statusCategory = "required";
                statusClass = "critical";
                statusIcon = "exclamation-triangle";
                statusTooltip = `Tire change overdue by ${Math.abs(kmToTires).toLocaleString()} Km`;
            }
            
            services.push({
                vehicleId: vehicleId,
                vehicle: vehicle['License Plate'] || vehicle['Vehicle ID'],
                serviceType: 'tires',
                expectedDate: calculateExpectedDate(vehicle, kmToTires, 'tires'),
                status: statusCategory,
                statusText: statusText,
                statusClass: statusClass,
                statusIcon: statusIcon,
                statusTooltip: statusTooltip,
                remaining: kmToTires, // نحتفظ بالقيمة كما هي (قد تكون سالبة)
                serviceRow: 'tires-service',
                rowClass: statusClass + '-row'
            });
        }
    });

    // Add license renewals - معالجة كل المركبات بغض النظر عن الفلتر
    vehicles.forEach(vehicle => {
        // استخدام parseInt لتحويل النص إلى رقم
        let daysToLicense = parseInt(String(vehicle['Days to renew license'] || '0'));
        const vehicleId = vehicle['Vehicle ID'];
        
        // إذا كانت القيمة NaN، استخدم 0 بدلاً منها
        if (isNaN(daysToLicense)) {
            daysToLicense = 0;
        }
        
        // تعديل: إضافة المركبة إذا كانت تحتاج إلى تجديد رخصة (قيمة سالبة أو موجبة صغيرة)
        if (vehicleId) {
            // الحصول على معلومات الحالة - نتأكد من تمرير القيمة المطلقة للحصول على المعلومات الصحيحة للمركبات ذات القيم السالبة
            const daysAbsolute = Math.abs(daysToLicense);
            const statusInfo = getStatusInfo(daysToLicense < 0 ? 0 : daysToLicense, 'license');
            
            // تغيير النص والحالة للمركبات ذات القيم السالبة
            let statusText = statusInfo.text;
            let statusCategory = statusInfo.category;
            let statusClass = statusInfo.class;
            let statusIcon = statusInfo.icon;
            let statusTooltip = statusInfo.tooltip;
            
            if (daysToLicense < 0) {
                statusText = "License Renewal Overdue";
                statusCategory = "required";
                statusClass = "critical";
                statusIcon = "exclamation-triangle";
                statusTooltip = `License renewal overdue by ${Math.abs(daysToLicense)} days`;
            }
            
            services.push({
                vehicleId: vehicleId,
                vehicle: vehicle['License Plate'] || vehicle['Vehicle ID'],
                serviceType: 'license',
                expectedDate: vehicle['License Renewal Date'] || 'Not specified',
                status: statusCategory,
                statusText: statusText,
                statusClass: statusClass,
                statusIcon: statusIcon,
                statusTooltip: statusTooltip,
                remaining: daysToLicense, // نحتفظ بالقيمة كما هي (قد تكون سالبة)
                serviceRow: 'license-service',
                rowClass: statusClass + '-row'
            });
        }
    });
    
    // تحديث الإحصائيات أولاً قبل أي فلتر - نستخدم قائمة الخدمات الكاملة
    updateServiceStats(services);

    // Filter by selected service types
    const typeCheckboxes = document.querySelectorAll('#service-type-filter-options input[type="checkbox"]:checked');
    const selectedTypes = Array.from(typeCheckboxes).map(checkbox => checkbox.value);
    
    // إظهار كل الخدمات دائمًا مهما كان filterType
    let filteredServices = services;
    
    // تطبيق فلتر نوع الخدمة إذا تم تحديد بعض الأنواع
    if (selectedTypes.length > 0) {
        filteredServices = filteredServices.filter(service => 
            selectedTypes.includes(service.serviceType)
        );
    }

    // Filter by selected statuses
    // Get all checked status checkboxes
    const statusCheckboxes = document.querySelectorAll('#status-filter-options input[type="checkbox"]:checked');
    const selectedStatuses = Array.from(statusCheckboxes).map(checkbox => checkbox.value);
    
    // Only filter if at least one status is selected, otherwise show all
    if (selectedStatuses.length > 0) {
        filteredServices = filteredServices.filter(service => 
            selectedStatuses.includes(service.status)
        );
    }

    // Sort services - first by status priority (required > upcoming > good), then by remaining distance/days
    filteredServices.sort((a, b) => {
        // First sort by status priority
        const statusPriority = { 'required': 0, 'upcoming': 1, 'good': 2, 'unknown': 3 };
        const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
        
        if (priorityDiff !== 0) {
            return priorityDiff;
        }
        
        // Then sort by remaining distance/days (ascending)
        return a.remaining - b.remaining;
    });

    // لتشخيص المشكلة، نقوم بطباعة عدد الخدمات المعروضة
    console.log(`Total services: ${services.length}, After filtering: ${filteredServices.length}`);

    // Generate table rows
    let tableHTML = '';
    filteredServices.forEach(service => {
        let rowHTML = `<tr class="${service.serviceRow} ${service.rowClass}">`;
        
        // Add columns based on visibility settings
        if (visibleColumns.vehicle) {
            rowHTML += `<td>${service.vehicle}</td>`;
        }
        
        if (visibleColumns.serviceType) {
            rowHTML += `<td>${getServiceTypeLabel(service.serviceType)}</td>`;
        }
        
        if (visibleColumns.expectedDate) {
            rowHTML += `<td>${service.expectedDate}</td>`;
        }
        
        if (visibleColumns.status) {
            rowHTML += `
                <td>
                    <div class="status-indicator ${service.statusClass}" title="${service.statusTooltip}">
                        <i class="fas fa-${service.statusIcon}"></i>
                        <span>${service.statusText}</span>
                    </div>
                </td>
            `;
        }
        
        if (visibleColumns.remaining) {
            rowHTML += `<td>${formatServiceRemaining({ type: service.serviceType, remaining: service.remaining })}</td>`;
        }
        
        // Actions column (always visible)
        rowHTML += `
            <td>
                <div class="action-buttons">
                    <button class="profile-btn" data-vehicle-id="${service.vehicleId}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </td>
        `;
        
        rowHTML += '</tr>';
        tableHTML += rowHTML;
    });
    
    // If no services found, display a message
    if (filteredServices.length === 0) {
        const columnCount = Object.values(visibleColumns).filter(v => v).length + 1;
        tableHTML = `
            <tr>
                <td colspan="${columnCount}" class="text-center">
                    No services found with the selected filters
                </td>
            </tr>
        `;
    }
    
    // Set table innerHTML once - أكثر كفاءة
    tableBody.innerHTML = tableHTML;
    
    // Add event listeners to buttons
    addProfileButtonListeners();
    
    // Update the data-filter attribute on the export button
    const exportButton = document.getElementById('export-excel-btn');
    if (exportButton) {
        exportButton.setAttribute('data-filter', filterType);
    }

    console.log(`Updated services table with ${filteredServices.length} services`);
}

// Get current visible columns configuration from localStorage or default settings
export function getVisibleColumns() {
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
        console.error('Error getting visible columns from localStorage:', e);
        return defaultColumns;
    }
}

// Save visible columns configuration to localStorage
function saveVisibleColumns(columns) {
    try {
        localStorage.setItem('upcomingServicesColumns', JSON.stringify(columns));
        console.log('Saved column visibility settings:', columns);
    } catch (e) {
        console.error('Error saving column visibility to localStorage:', e);
    }
}

// Toggle column visibility
export function toggleColumnVisibility(columnName) {
    console.log(`Toggling column visibility for: ${columnName}`);
    
    if (!columnName) {
        console.error('No column name provided to toggleColumnVisibility');
        return false;
    }
    
    const columns = getVisibleColumns();
    // Toggle the specified column
    columns[columnName] = !columns[columnName];
    
    console.log(`Column ${columnName} is now ${columns[columnName] ? 'visible' : 'hidden'}`);
    
    // Ensure at least one column remains visible
    const visibleCount = Object.values(columns).filter(visible => visible).length;
    console.log(`Visible columns count: ${visibleCount}`);
    
    if (visibleCount === 0) {
        console.warn('Attempted to hide all columns, reverting change');
        columns[columnName] = true; // Revert the change if this would hide all columns
        return false;
    }
    
    saveVisibleColumns(columns);
    return true;
}

// Export to Excel function
export function exportToExcel() {
    console.log('exportToExcel function called from dashboard.js');
    
    try {
        // Check if XLSX is available
        if (typeof XLSX === 'undefined') {
            console.error('XLSX library not loaded');
            if (window.showNotification) {
                window.showNotification('Excel export library not loaded. Please refresh the page and try again.', 'error');
            } else {
                alert('Excel export library not loaded. Please refresh the page and try again.');
            }
            return;
        }

        // Get current filter settings from button
        const filterType = document.getElementById('export-excel-btn').getAttribute('data-filter') || 'all';
        const statusFilters = document.getElementById('export-excel-btn').getAttribute('data-status') || 'all';
        const typeFilters = document.getElementById('export-excel-btn').getAttribute('data-types') || 'all';
        
        const selectedStatuses = statusFilters === 'all' ? [] : statusFilters.split(',');
        const selectedTypes = typeFilters === 'all' ? [] : typeFilters.split(',');
        
        console.log('Preparing Excel export with filters:', { filterType, statusFilters, typeFilters });
        
        // Get visible columns - make sure we get the most current settings
        const visibleColumns = getVisibleColumns();
        console.log('Visible columns for export:', visibleColumns);
        
        // Verify we have columns to display
        if (!Object.values(visibleColumns).some(val => val === true)) {
            console.warn('No columns are visible for export');
            if (window.showNotification) {
                window.showNotification('Please make at least one column visible before exporting', 'warning');
            } else {
                alert('Please make at least one column visible before exporting');
            }
            return;
        }
        
        // Collect all services data
        const services = [];
        
        // Add maintenance services
        vehicles.forEach(vehicle => {
            const kmToMaintenance = parseInt(String(vehicle['Km to next maintenance'] || 0).replace(/,/g, '')) || 0;
            if (kmToMaintenance <= 5000) {
                services.push({
                    vehicleId: vehicle['Vehicle ID'],
                    licensePlate: vehicle['License Plate'],
                    type: 'maintenance',
                    remaining: kmToMaintenance,
                    nextDate: vehicle['Last Maintenance Date']
                });
            }
        });

        // Add tire changes
        vehicles.forEach(vehicle => {
            const kmToTireChange = parseInt(String(vehicle['Km left for tire change'] || 0).replace(/,/g, '')) || 0;
            if (kmToTireChange <= 5000) {
                services.push({
                    vehicleId: vehicle['Vehicle ID'],
                    licensePlate: vehicle['License Plate'],
                    type: 'tires',
                    remaining: kmToTireChange,
                    nextDate: vehicle['Last tire change Date']
                });
            }
        });

        // Add license renewals
        vehicles.forEach(vehicle => {
            const daysToRenewal = parseInt(String(vehicle['Days to renew license'] || 0)) || 0;
            if (daysToRenewal <= 90) {
                services.push({
                    vehicleId: vehicle['Vehicle ID'],
                    licensePlate: vehicle['License Plate'],
                    type: 'license',
                    remaining: daysToRenewal,
                    nextDate: vehicle['License Renewal Date']
                });
            }
        });

        // Apply type filter if not 'all'
        let filteredServices = services;
        if (filterType !== 'all') {
            filteredServices = filteredServices.filter(service => service.type === filterType);
        }
        
        // Apply type filters if any are selected
        if (selectedTypes.length > 0) {
            filteredServices = filteredServices.filter(service => {
                return selectedTypes.includes(service.type);
            });
        }
        
        // Apply status filters if any are selected
        if (selectedStatuses.length > 0) {
            filteredServices = filteredServices.filter(service => {
                const status = getStatusInfo(service.remaining, service.type);
                return selectedStatuses.includes(status.category);
            });
        }

        // Sort services - license renewals first, then by remaining time/distance
        filteredServices.sort((a, b) => {
            if (a.type === 'license' && b.type === 'license') {
                return a.remaining - b.remaining;
            }
            if (a.type === 'license') return -1;
            if (b.type === 'license') return 1;
            return a.remaining - b.remaining;
        });
        
        console.log(`Preparing to export ${filteredServices.length} services`);
        
        // Prepare worksheet data based on visible columns
        const wsData = [];
        
        // Add header row only for visible columns
        const headerRow = [];
        if (visibleColumns.vehicle) headerRow.push('Vehicle');
        if (visibleColumns.serviceType) headerRow.push('Service Type');
        if (visibleColumns.expectedDate) headerRow.push('Expected Date');
        if (visibleColumns.status) headerRow.push('Status');
        if (visibleColumns.remaining) headerRow.push('Remaining');
        
        wsData.push(headerRow);
        
        // Add data rows for visible columns
        filteredServices.forEach(service => {
            const status = getStatusInfo(service.remaining, service.type);
            const row = [];
            
            if (visibleColumns.vehicle) row.push(service.licensePlate || 'N/A');
            if (visibleColumns.serviceType) row.push(getServiceTypeLabel(service.type));
            if (visibleColumns.expectedDate) row.push(service.nextDate || 'N/A');
            if (visibleColumns.status) row.push(status.text);
            if (visibleColumns.remaining) row.push(formatServiceRemaining(service));
            
            wsData.push(row);
        });
        
        // Check if we have data to export
        if (wsData.length <= 1) {
            console.warn('No data to export after applying filters');
            if (window.showNotification) {
                window.showNotification('No data to export with current filters', 'warning');
            } else {
                alert('No data to export with current filters');
            }
            return;
        }
        
        // Create a workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Upcoming Services');
        
        // Generate filename with timestamp
        const now = new Date();
        const dateStr = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
        const filename = `upcoming_services_${dateStr}.xlsx`;
        
        // Export file
        XLSX.writeFile(wb, filename);
        
        console.log('Excel export completed successfully');
        if (window.showNotification) {
            window.showNotification('Excel file exported successfully!', 'success');
        }
    } catch (e) {
        console.error('Error exporting to Excel:', e);
        if (window.showNotification) {
            window.showNotification('Error exporting to Excel: ' + e.message, 'error');
        } else {
            alert('Error exporting to Excel: ' + e.message);
        }
    }
}

// دالة جديدة لإضافة مستمعات الأحداث لأزرار العرض
function addProfileButtonListeners() {
    document.querySelectorAll('#upcoming-services-table .profile-btn').forEach(button => {
        button.addEventListener('click', function() {
            const vehicleId = this.dataset.vehicleId;
            if (vehicleId) {
                if (typeof window.openVehicleDetailsModal === 'function') {
                    window.openVehicleDetailsModal(vehicleId);
                } else if (typeof openVehicleDetailsModal === 'function') {
                    openVehicleDetailsModal(vehicleId);
                } else {
                    console.error('Vehicle details modal function not found');
                    import('./script.js').then(module => {
                        if (module && typeof module.openVehicleDetailsModal === 'function') {
                            module.openVehicleDetailsModal(vehicleId);
                        } else {
                            console.error('Could not find openVehicleDetailsModal in script.js');
                        }
                    }).catch(err => console.error('Error importing script.js:', err));
                }
            } else {
                console.error('No vehicle ID found for this profile button');
            }
        });
    });
}

// دالة فتح نافذة تفاصيل المركبة (تستخدم في حالة عدم تصدير الدالة من script.js)
function openVehicleDetailsModal(vehicleId) {
    const vehicle = vehicles.find(v => v['Vehicle ID'] === vehicleId);
    if (!vehicle) {
        alert('Vehicle not found.');
        return;
    }

    const modal = document.getElementById('vehicle-details-modal');
    if (!modal) return;

    const detailsContent = document.getElementById('vehicle-details-content');
    if (!detailsContent) return;

    detailsContent.innerHTML = `
        <h3>Vehicle Information</h3>
        <p><strong>License Plate:</strong> ${vehicle['License Plate']}</p>
        <p><strong>Service Type:</strong> ${vehicle['Service Type']}</p>
        <p><strong>Vehicle Type:</strong> ${vehicle['Vehicle Type']}</p>
        <p><strong>Model:</strong> ${vehicle['Model']}</p>
        <p><strong>Color:</strong> ${vehicle['Color']}</p>
        <p><strong>VIN Number:</strong> ${vehicle['VIN Number']}</p>

        <h3>Maintenance Status</h3>
        <p><strong>Current Km:</strong> ${vehicle['Current Km']}</p>
        <p><strong>Last Maintenance Km:</strong> ${vehicle['Last Maintenance Km']}</p>
        <p><strong>Last Maintenance Date:</strong> ${vehicle['Last Maintenance Date']}</p>
        <p><strong>Next Maintenance Km:</strong> ${vehicle['Next Maintenance Km']}</p>

        <h3>Service Information</h3>
        <p><strong>Last tire change Km:</strong> ${vehicle['Last tire change Km']}</p>
        <p><strong>Last tire change Date:</strong> ${vehicle['Last tire change Date']}</p>
        <p><strong>Next Tire Change Km:</strong> ${vehicle['Next Tire Change Km']}</p>
        <p><strong>License Renewal Date:</strong> ${vehicle['License Renewal Date']}</p>
        <p><strong>Days to renew license:</strong> ${vehicle['Days to renew license']}</p>

        <h3>Driver Information</h3>
        <p><strong>Driver Name:</strong> ${vehicle['Driver Name']}</p>
        <p><strong>Driver Contact:</strong> ${vehicle['Driver Contact']}</p>
    `;

    openModal('vehicle-details-modal');
}

// Helper functions
function setElementText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = value;
}

function formatNumber(num) {
    return String(num || 0);
}

function resetStatistics() {
    setElementText('total-vehicles', '0');
    setElementText('active-vehicles', '0');
    setElementText('in-maintenance', '0');
    setElementText('inactive-vehicles', '0');
}

function getChartContext(canvasId) {
    const canvas = document.getElementById(canvasId);
    return canvas ? canvas.getContext('2d') : null;
}

function destroyChart(chartName) {
    if (charts[chartName]) {
        charts[chartName].destroy();
        charts[chartName] = null;
    }
}

// تحديث دالة خيارات المخطط لإضافة النسب المئوية والأرقام
function getChartOptions(showScales = false) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const fontColor = isDarkMode ? '#e0e0e0' : '#666';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: { family: 'Arial' },
                    color: fontColor
                }
            },
            tooltip: {
                backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                titleColor: isDarkMode ? '#fff' : '#000',
                bodyColor: isDarkMode ? '#fff' : '#000',
                borderColor: isDarkMode ? '#444' : '#ddd',
                borderWidth: 1,
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.raw;
                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                    }
                }
            },
            datalabels: {
                formatter: (value, ctx) => {
                    const datapoints = ctx.chart.data.datasets[0].data;
                    const total = datapoints.reduce((total, datapoint) => total + datapoint, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${value.toLocaleString()}\n(${percentage}%)`;
                },
                color: '#fff',
                font: {
                    weight: 'bold',
                    size: 12
                }
            }
        }
    };

    if (showScales) {
        options.scales = {
            y: {
                beginAtZero: true,
                ticks: { 
                    font: { family: 'Arial' },
                    color: fontColor
                },
                grid: {
                    color: gridColor
                }
            },
            x: {
                ticks: { 
                    font: { family: 'Arial' },
                    color: fontColor
                },
                grid: {
                    color: gridColor
                }
            }
        };
    }
    return options;
}

function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getServiceTypeLabel(type) {
    const labels = {
        maintenance: 'Routine Maintenance',
        tires: 'Tire Change',
        license: 'License Renewal'
    };
    return labels[type] || type;
}

// تعديل دالة formatServiceRemaining لعرض القيم السالبة بشكل مناسب
function formatServiceRemaining(service) {
    const remaining = service.remaining;
    if (remaining === undefined || remaining === null) {
        return 'N/A';
    }
    
    // إضافة معالجة خاصة للقيم السالبة
    if (remaining < 0) {
        if (service.type === 'license' || service.serviceType === 'license') {
            return `<span class="overdue-value">Overdue by ${Math.abs(remaining)} Days</span>`;
        } else {
            return `<span class="overdue-value">Overdue by ${Math.abs(remaining).toLocaleString()} Km</span>`;
        }
    }
    
    return service.type === 'license' || service.serviceType === 'license'
        ? `${remaining} Days`
        : `${remaining.toLocaleString()} Km`;
}

// دالة مساعدة لحساب تاريخ الخدمة المتوقع
function calculateExpectedDate(vehicle, remaining, type) {
    // التحقق من وجود تاريخ محدد مسبقًا
    if (type === 'license' && vehicle['License Renewal Date']) {
        return vehicle['License Renewal Date'];
    }
    
    // حساب التاريخ المتوقع بناءً على المسافة المتبقية والاستخدام اليومي
    const currentDate = new Date();
    const dailyUsage = 50; // معدل استخدام افتراضي يومي بالكيلومتر
    
    if (type === 'license') {
        // في حالة الترخيص، نستخدم الأيام المتبقية مباشرة
        const expectedDate = new Date(currentDate);
        expectedDate.setDate(currentDate.getDate() + remaining);
        return expectedDate.toLocaleDateString();
    } else {
        // في حالة الصيانة والإطارات، نحسب الأيام المتوقعة بناءً على الاستخدام اليومي
        const daysRemaining = remaining / dailyUsage;
        const expectedDate = new Date(currentDate);
        expectedDate.setDate(currentDate.getDate() + Math.round(daysRemaining));
        return expectedDate.toLocaleDateString();
    }
}

// Function that renders the dashboard content
function renderDashboardContent() {
    const dashboardPage = document.getElementById('dashboard-page');
    if (!dashboardPage) return;

    // Create Fleet Overview section with 3-column layout
    const dashboardHTML = `
        <div class="dashboard-section">
            <h3 class="section-title">Fleet Overview</h3>
            
            <!-- Statistics Row -->
            <div class="dashboard-stats">
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-car"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Vehicles</h3>
                        <p id="total-vehicles">0</p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Active Vehicles</h3>
                        <p id="active-vehicles">0</p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <i class="fas fa-wrench"></i>
                    </div>
                    <div class="stat-info">
                        <h3>In Maintenance</h3>
                        <p id="in-maintenance">0</p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon red">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Inactive Vehicles</h3>
                        <p id="inactive-vehicles">0</p>
                    </div>
                </div>
            </div>
            
            <!-- Fleet Overview Charts with 3-column layout -->
            <div class="fleet-overview-charts">
                <!-- First chart - Vehicle Status Distribution -->
                <div class="chart-container">
                    <h4>Vehicle Status Distribution</h4>
                    <canvas id="vehicle-status-chart"></canvas>
                </div>
                
                <!-- Second chart - Vehicle Types -->
                <div class="chart-container">
                    <h4>Vehicle Types</h4>
                    <canvas id="vehicle-types-chart"></canvas>
                </div>
                
                <!-- Third chart - Vehicle Age -->
                <div class="chart-container">
                    <h4>Vehicle Age</h4>
                    <canvas id="vehicle-age-chart"></canvas>
                </div>
            </div>
            
            <!-- Fleet Distribution Section -->
            <div class="dashboard-section">
                <h3 class="section-title">Fleet Distribution</h3>
                <div class="fleet-overview-charts">
                    <!-- Location Chart -->
                    <div class="chart-container">
                        <h4>Vehicles by Location</h4>
                        <canvas id="location-chart"></canvas>
                    </div>
                    
                    <!-- Service Type Chart -->
                    <div class="chart-container">
                        <h4>Service Types</h4>
                        <canvas id="service-type-chart"></canvas>
                    </div>
                    
                    <!-- Inactive Vehicle Distribution Chart -->
                    <div class="chart-container">
                        <h4>Inactive Vehicles by Location</h4>
                        <canvas id="inactive-distribution-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Maintenance Status Charts -->
            <div class="dashboard-section">
                <h3 class="section-title">Maintenance Status</h3>
                <div class="dashboard-charts maintenance-charts">
                    <div class="chart-container full-width">
                        <h4>KM to Maintenance</h4>
                        <canvas id="maintenance-km-chart"></canvas>
                    </div>
                    <div class="chart-container full-width">
                        <h4>KM to Tire Change</h4>
                        <canvas id="tire-change-chart"></canvas>
                    </div>
                    <div class="chart-container full-width">
                        <h4>Days to License Renewal</h4>
                        <canvas id="license-renewal-chart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    dashboardPage.innerHTML = dashboardHTML;
    updateDashboard();
}

// ...existing code...