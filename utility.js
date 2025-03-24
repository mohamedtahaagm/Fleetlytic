/**
 * Utility functions for the fleet management system
 */

// Format number with commas
export function formatNumber(number) {
    if (number === undefined || number === null) return '0';
    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format date (YYYY-MM-DD)
export function formatDate(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        // Try to convert string to date
        date = new Date(date);
    }
    
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Get days difference between two dates
export function getDaysDifference(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    
    if (typeof startDate === 'string') {
        startDate = new Date(startDate);
    }
    
    if (typeof endDate === 'string') {
        endDate = new Date(endDate);
    }
    
    // Check valid dates
    if (!(startDate instanceof Date) || isNaN(startDate.getTime()) || 
        !(endDate instanceof Date) || isNaN(endDate.getTime())) {
        return 0;
    }
    
    // Get time difference in milliseconds
    const timeDiff = endDate.getTime() - startDate.getTime();
    
    // Convert to days
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

// Get vehicle icon based on type
export function getVehicleIcon(type) {
    if (!type) return 'fa-car';
    
    type = type.toLowerCase();
    
    if (type.includes('truck')) return 'fa-truck';
    if (type.includes('bus')) return 'fa-bus';
    if (type.includes('van')) return 'fa-shuttle-van';
    if (type.includes('motorcycle')) return 'fa-motorcycle';
    if (type.includes('suv')) return 'fa-truck-pickup';
    
    return 'fa-car'; // Default
}

// Get status color class
export function getStatusColorClass(status) {
    if (!status) return 'status-inactive';
    
    status = status.toLowerCase();
    
    if (status.includes('active')) return 'status-active';
    if (status.includes('maintenance')) return 'status-maintenance';
    if (status.includes('inactive')) return 'status-inactive';
    
    return 'status-inactive'; // Default
}

// Truncate text with ellipsis
export function truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
}

// Generate random ID
export function generateId(prefix = '') {
    return prefix + Math.random().toString(36).substring(2, 10);
}

// Validate email format
export function isValidEmail(email) {
    if (!email) return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

// Convert bytes to readable size (KB, MB, GB)
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Download JSON data as a file
export function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename || 'data.json';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
