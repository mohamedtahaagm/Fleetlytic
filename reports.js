// Import required variables and functions
import { vehicles, drivers, maintenanceRecords, fuelRecords, currentUser } from './script.js';

// Generate report
export function generateReport() {
    const reportType = document.getElementById('report-type')?.value;
    const dateFrom = document.getElementById('date-from')?.value;
    const dateTo = document.getElementById('date-to')?.value;

    if (!reportType || !dateFrom || !dateTo) {
        alert('Please select report type and date range');
        return;
    }

    // Convert dates to Date objects
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    // Validate date range
    if (fromDate > toDate) {
        alert('Start date must be before end date');
        return;
    }

    try {
        let reportContent = '';
        switch (reportType) {
            case 'vehicles':
                reportContent = generateVehiclesReport(fromDate, toDate);
                break;
            case 'maintenance':
                reportContent = generateMaintenanceReport(fromDate, toDate);
                break;
            case 'fuel':
                reportContent = generateFuelReport(fromDate, toDate);
                break;
            case 'drivers':
                reportContent = generateDriversReport(fromDate, toDate);
                break;
            default:
                alert('Invalid report type');
                return;
        }

        // Display report
        const reportContainer = document.getElementById('report-content');
        if (reportContainer) {
            reportContainer.innerHTML = reportContent;
        }

    } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generating report');
    }
}

// Export report
export function exportReport() {
    const reportContent = document.getElementById('report-content');
    if (!reportContent || !reportContent.innerHTML.trim()) {
        alert('Please generate report first');
        return;
    }

    try {
        // Create download link
        const reportTitle = document.getElementById('report-type')?.options[
            document.getElementById('report-type')?.selectedIndex
        ]?.text || 'Report';
        
        const dateStr = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
        const fileName = `${reportTitle}_${dateStr}`;

        // Create full HTML content
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${reportTitle}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 20px;
                        direction: ltr;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f5f5f5;
                    }
                    .report-header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                ${reportContent.innerHTML}
            </body>
            </html>
        `;

        // Get export format
        const exportFormat = document.getElementById('export-format')?.value || 'html';
        
        if (exportFormat === 'pdf') {
            exportToPdf(htmlContent, fileName);
        } else {
            // Default to HTML export
            exportToHtml(htmlContent, fileName);
        }

    } catch (error) {
        console.error('Error exporting report:', error);
        alert('Error exporting report');
    }
}

// Export to HTML file
function exportToHtml(htmlContent, fileName) {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.html`;
    
    // Download file
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Export to PDF file using html2pdf library
function exportToPdf(htmlContent, fileName) {
    // Check if html2pdf is loaded
    if (!window.html2pdf) {
        alert('PDF export library not loaded. Exporting as HTML instead.');
        exportToHtml(htmlContent, fileName);
        return;
    }

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.display = 'none';
    document.body.appendChild(container);
    
    // Options for PDF generation
    const options = {
        margin: 10,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Generate PDF
    html2pdf()
        .from(container)
        .set(options)
        .save()
        .then(() => {
            document.body.removeChild(container);
        })
        .catch(error => {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Exporting as HTML instead.');
            exportToHtml(htmlContent, fileName);
            document.body.removeChild(container);
        });
}

// Generate vehicles report
function generateVehiclesReport(fromDate, toDate) {
    let filteredVehicles = vehicles;
    if (currentUser.role === 'manager') {
        filteredVehicles = vehicles.filter(v => v.manager === currentUser.id);
    }

    return `
        <div class="report-header">
            <h2>Vehicles Report</h2>
            <p>From ${fromDate.toLocaleDateString('en-US')} to ${toDate.toLocaleDateString('en-US')}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Serial Number</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Current Km</th>
                    <th>Last Maintenance</th>
                </tr>
            </thead>
            <tbody>
                ${filteredVehicles.map(vehicle => `
                    <tr>
                        <td>${vehicle.serial}</td>
                        <td>${getVehicleType(vehicle.type)}</td>
                        <td>${getVehicleStatus(vehicle.status)}</td>
                        <td>${vehicle.currentKilometers} Km</td>
                        <td>${vehicle.lastMaintenance ? new Date(vehicle.lastMaintenance).toLocaleDateString('en-US') : '—'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="report-summary">
            <p>Total Vehicles: ${filteredVehicles.length}</p>
        </div>
    `;
}

// Helper functions for translation
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
        'active': 'Active',
        'maintenance': 'Maintenance',
        'inactive': 'Inactive'
    };
    return statuses[status] || status;
}

// Generate maintenance report
function generateMaintenanceReport(fromDate, toDate) {
    let filteredMaintenance = maintenanceRecords;
    
    // Filter by date range
    filteredMaintenance = filteredMaintenance.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= fromDate && recordDate <= toDate;
    });
    
    // Filter by manager's vehicles if applicable
    if (currentUser.role === 'manager') {
        const managerVehicles = vehicles.filter(v => v.manager === currentUser.id).map(v => v.id);
        filteredMaintenance = filteredMaintenance.filter(m => managerVehicles.includes(m.vehicle));
    }

    return `
        <div class="report-header">
            <h2>Maintenance Report</h2>
            <p>From ${fromDate.toLocaleDateString('en-US')} to ${toDate.toLocaleDateString('en-US')}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Vehicle</th>
                    <th>Maintenance Date</th>
                    <th>Maintenance Type</th>
                    <th>Next Km</th>
                    <th>Notes</th>
                </tr>
            </thead>
            <tbody>
                ${filteredMaintenance.map(maintenance => {
                    const vehicle = vehicles.find(v => v.id === maintenance.vehicle);
                    return `
                        <tr>
                            <td>${vehicle ? vehicle.serial : 'Unknown'}</td>
                            <td>${new Date(maintenance.date).toLocaleDateString('en-US')}</td>
                            <td>${getMaintenanceType(maintenance.type)}</td>
                            <td>${maintenance.nextKilometers} Km</td>
                            <td>${maintenance.notes || '—'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        <div class="report-summary">
            <p>Total Maintenance Records: ${filteredMaintenance.length}</p>
        </div>
    `;
}

// Translate maintenance type
function getMaintenanceType(type) {
    const types = {
        'oil': 'Oil Change',
        'tires': 'Tire Change',
        'brakes': 'Brakes Service',
        'engine': 'Engine Service',
        'general': 'General Maintenance'
    };
    return types[type] || type;
}

// Generate fuel report
function generateFuelReport(fromDate, toDate) {
    let filteredFuel = fuelRecords;
    
    // Filter by date range
    filteredFuel = filteredFuel.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= fromDate && recordDate <= toDate;
    });
    
    // Filter by manager's vehicles if applicable
    if (currentUser.role === 'manager') {
        const managerVehicles = vehicles.filter(v => v.manager === currentUser.id).map(v => v.id);
        filteredFuel = filteredFuel.filter(f => managerVehicles.includes(f.vehicle));
    }

    // Calculate summary data
    const totalFuel = filteredFuel.reduce((sum, record) => sum + parseFloat(record.amount), 0).toFixed(2);
    const totalDistance = filteredFuel.reduce((sum, record) => sum + parseFloat(record.distance), 0).toFixed(2);
    const totalCost = filteredFuel.reduce((sum, record) => sum + parseFloat(record.cost || 0), 0).toFixed(2);
    const avgConsumption = totalDistance > 0 && totalFuel > 0 ? (totalDistance / totalFuel).toFixed(2) : '0';

    return `
        <div class="report-header">
            <h2>Fuel Report</h2>
            <p>From ${fromDate.toLocaleDateString('en-US')} to ${toDate.toLocaleDateString('en-US')}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Vehicle</th>
                    <th>Fuel Date</th>
                    <th>Fuel Amount (Liters)</th>
                    <th>Distance (Km)</th>
                    <th>Consumption (Km/Liter)</th>
                    <th>Cost (SAR)</th>
                </tr>
            </thead>
            <tbody>
                ${filteredFuel.map(fuel => {
                    const vehicle = vehicles.find(v => v.id === fuel.vehicle);
                    const consumption = parseFloat(fuel.distance) / parseFloat(fuel.amount);
                    return `
                        <tr>
                            <td>${vehicle ? vehicle.serial : 'Unknown'}</td>
                            <td>${new Date(fuel.date).toLocaleDateString('en-US')}</td>
                            <td>${parseFloat(fuel.amount).toFixed(2)}</td>
                            <td>${parseFloat(fuel.distance).toFixed(2)}</td>
                            <td>${consumption.toFixed(2)}</td>
                            <td>${parseFloat(fuel.cost || 0).toFixed(2)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        <div class="report-summary">
            <h3>Summary</h3>
            <p>Total Records: ${filteredFuel.length}</p>
            <p>Total Fuel Consumed: ${totalFuel} Liters</p>
            <p>Total Distance: ${totalDistance} Km</p>
            <p>Average Consumption: ${avgConsumption} Km/Liter</p>
            <p>Total Cost: ${totalCost} SAR</p>
        </div>
    `;
}

// Generate drivers report
function generateDriversReport(fromDate, toDate) {
    let filteredDrivers = drivers;
    
    // Filter by manager's vehicles if applicable
    if (currentUser.role === 'manager') {
        const managerVehicles = vehicles.filter(v => v.manager === currentUser.id).map(v => v.id);
        filteredDrivers = filteredDrivers.filter(d => d.vehicle && managerVehicles.includes(d.vehicle));
    }

    // Current date for license expiry calculation
    const today = new Date();
    
    return `
        <div class="report-header">
            <h2>Drivers Report</h2>
            <p>From ${fromDate.toLocaleDateString('en-US')} to ${toDate.toLocaleDateString('en-US')}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Driver Name</th>
                    <th>License Number</th>
                    <th>License Expiry</th>
                    <th>Status</th>
                    <th>Assigned Vehicle</th>
                    <th>Contact</th>
                </tr>
            </thead>
            <tbody>
                ${filteredDrivers.map(driver => {
                    const vehicle = vehicles.find(v => v.id === driver.vehicle);
                    const licenseExpiry = new Date(driver.licenseExpiry);
                    const daysUntilExpiry = Math.floor((licenseExpiry - today) / (1000 * 60 * 60 * 24));
                    const licenseStatus = daysUntilExpiry < 0 ? 'Expired' : 
                                         daysUntilExpiry < 30 ? 'Expiring Soon' : 'Valid';
                    return `
                        <tr>
                            <td>${driver.name}</td>
                            <td>${driver.licenseNumber}</td>
                            <td>${new Date(driver.licenseExpiry).toLocaleDateString('en-US')}</td>
                            <td>${licenseStatus}</td>
                            <td>${vehicle ? vehicle.serial : '—'}</td>
                            <td>${driver.phone || '—'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        <div class="report-summary">
            <p>Total Drivers: ${filteredDrivers.length}</p>
        </div>
    `;
}
