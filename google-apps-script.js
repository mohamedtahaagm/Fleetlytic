// Google Apps Script for Fleet Management System
// Connects with Google Sheets as a database

// Spreadsheet identifiers
const SPREADSHEET_ID = '1Tx6YVrFbpjzNn66fTmARMauPILuGQk7S63ZityyFA28'; // Replace with your spreadsheet ID
const USERS_SHEET_NAME = 'Users';
const VEHICLES_SHEET_NAME = 'Vehicles';
const DRIVERS_SHEET_NAME = 'Drivers';
const MAINTENANCE_SHEET_NAME = 'Maintenance';
const FUEL_SHEET_NAME = 'Fuel';
const DASHBOARD_SHEET_NAME = 'Dashboard';

// Dashboard column names
const DASHBOARD_COLUMNS = {
  VEHICLE_ID: 'Vehicle ID',
  LICENSE_PLATE: 'License Plate',
  SERVICE_TYPE: 'Service Type',
  CURRENT_LOCATION: 'Current Location',
  VEHICLE_STATUS: 'Vehicle Status',
  CURRENT_KM: 'Current Km',
  KM_TO_MAINTENANCE: 'Km to next maintenance',
  LAST_MAINTENANCE_DATE: 'Last Maintenance Date',
  KM_TO_TIRE_CHANGE: 'Km left for tire change',
  // Fix the typo/inconsistency in the column name
  LAST_TIRE_CHANGE_DATE: 'Last Tire Change Date', // Changed from 'Last tire change Data'
  LICENSE_RENEWAL_DATE: 'License Renewal Date',
  DAYS_TO_LICENSE: 'Days to renew license',
  INSURANCE_EXPIRY: 'Insurance Expiry Date',
  // Remove duplicate CURRENT_LOCATION that was defined twice
  DRIVER_NAME: 'Driver Name',
  DRIVER_CONTACT: 'Driver Contact',
  NOTES: 'Notes'
};

// Get spreadsheet and worksheets
function getSheets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const usersSheet = ss.getSheetByName(USERS_SHEET_NAME);
    const vehiclesSheet = ss.getSheetByName(VEHICLES_SHEET_NAME);
    const driversSheet = ss.getSheetByName(DRIVERS_SHEET_NAME);
    const maintenanceSheet = ss.getSheetByName(MAINTENANCE_SHEET_NAME);
    const fuelSheet = ss.getSheetByName(FUEL_SHEET_NAME);
    const dashboardSheet = ss.getSheetByName(DASHBOARD_SHEET_NAME);
    
    // Verify all sheets exist
    if (!usersSheet || !vehiclesSheet || !driversSheet || !maintenanceSheet ||
        !fuelSheet || !dashboardSheet) {
      throw new Error('One or more required sheets not found');
    }

    return {
      usersSheet,
      vehiclesSheet,
      driversSheet,
      maintenanceSheet,
      fuelSheet,
      dashboardSheet
    };
  } catch (error) {
    Logger.log('Error in getSheets: ' + error.toString());
    throw error;
  }
}

// Web server to handle GET requests
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result = {};

    if (action === 'login') {
      result = handleLogin(e.parameter.email, e.parameter.password);
    } else if (action === 'validateToken') {
      result = validateTokenHandler(e.parameter.token);
    } else if (action === 'getVehicles') {
      result = getVehicles(e.parameter.managerId);
    } else if (action === 'getDrivers') {
      result = getDrivers(e.parameter.managerId);
    } else if (action === 'getMaintenance') {
      result = getMaintenance(e.parameter.managerId);
    } else if (action === 'getFuel') {
      result = getFuel(e.parameter.managerId);
    } else if (action === 'getUsers') {
      result = getUsers();
    } else if (action === 'getDashboard') {
      result = getDashboardData();
    } else {
      result = { status: 'error', message: 'Invalid action' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests (for add, update, delete operations)
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'No data received'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    let result = {};

    if (action === 'addVehicle') {
      result = addVehicle(postData);
    } else if (action === 'updateVehicle') {
      result = updateVehicle(postData);
    } else if (action === 'deleteVehicle') {
      result = deleteVehicle(postData.id);
    } else if (action === 'addMaintenance') {
      result = addMaintenance(postData);
    } else if (action === 'updateMaintenance') {
      result = updateMaintenance(postData);
    } else if (action === 'deleteMaintenance') {
      result = deleteMaintenance(postData.id);
    } else if (action === 'addFuel') {
      result = addFuel(postData);
    } else if (action === 'updateFuel') {
      result = updateFuel(postData);
    } else if (action === 'deleteFuel') {
      result = deleteFuel(postData.id);
    } else if (action === 'addDriver') {
      result = addDriver(postData);
    } else if (action === 'updateDriver') {
      result = updateDriver(postData);
    } else if (action === 'deleteDriver') {
      result = deleteDriver(postData.id);
    } else if (action === 'addUser') {
      result = addUser(postData);
    } else if (action === 'updateUser') {
      result = updateUser(postData);
    } else if (action === 'deleteUser') {
      result = deleteUser(postData.id);
    } else if (action === 'updateDashboard') {
      result = updateDashboardData(postData);
    } else {
      result = { status: 'error', message: 'Invalid action' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle login
function handleLogin(email, password) {
  try {
    if (!email || !password) {
      return { status: 'error', message: 'Email and password are required' };
    }
    
    const { usersSheet } = getSheets();
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const nameIndex = headers.indexOf('Name');
    const emailIndex = headers.indexOf('Email');
    const passwordIndex = headers.indexOf('Password');
    const roleIndex = headers.indexOf('Role');
    
    // Validate column indexes
    if (idIndex === -1 || nameIndex === -1 || emailIndex === -1 || 
        passwordIndex === -1 || roleIndex === -1) {
      return { status: 'error', message: 'Invalid sheet structure' };
    }

    // Skip the first row (column headers)
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === email) {
        // In a real application, password should be hashed and verified securely
        // Here we assume the password is stored in column 3
        if (data[i][passwordIndex] === password) {
          // Create a token for the user
          const token = generateToken(data[i][idIndex]);

          return {
            status: 'success',
            data: {
              id: data[i][idIndex],
              name: data[i][nameIndex],
              email: data[i][emailIndex],
              role: data[i][roleIndex],
              token: token
            }
          };
        } else {
          return { status: 'error', message: 'Incorrect password' };
        }
      }
    }

    return { status: 'error', message: 'Email not found' };
  } catch (error) {
    Logger.log('Error in handleLogin: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Generate a token for the user
function generateToken(userId) {
  // In a real application, use a more secure method like JWT
  return Utilities.base64EncodeWebSafe(userId + '|' + new Date().getTime());
}

// Validate token handler
function validateTokenHandler(token) {
  try {
    const user = validateToken(token);
    if (user) {
      return {
        status: 'success',
        data: user
      };
    } else {
      return { status: 'error', message: 'Invalid or expired token' };
    }
  } catch (error) {
    Logger.log('Error in validateTokenHandler: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Validate token
function validateToken(token) {
  try {
    // In a real application, verify the token more securely
    const decoded = Utilities.base64DecodeWebSafe(token);
    const parts = decoded.split('|');
    const userId = parts[0];
    const timestamp = parts[1];

    // Check expiration time (e.g., valid for 24 hours)
    const currentTime = new Date().getTime();
    const tokenTime = parseInt(timestamp);
    const tokenLifetime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (currentTime - tokenTime > tokenLifetime) {
      return null; // Token expired
    }

    // Verify user exists in database
    const { usersSheet } = getSheets();
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const nameIndex = headers.indexOf('Name');
    const emailIndex = headers.indexOf('Email');
    const roleIndex = headers.indexOf('Role');
    
    // Validate column indexes
    if (idIndex === -1 || nameIndex === -1 || emailIndex === -1 || roleIndex === -1) {
      return null;
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === userId) {
        return {
          id: data[i][idIndex],
          name: data[i][nameIndex],
          email: data[i][emailIndex],
          role: data[i][roleIndex]
        };
      }
    }

    return null; // User not found
  } catch (e) {
    Logger.log('Error in validateToken: ' + e.toString());
    return null; // Error decoding token
  }
}

// Get vehicles
function getVehicles(managerId) {
  try {
    const { vehiclesSheet } = getSheets();
    const data = vehiclesSheet.getDataRange().getValues();
    const headers = data[0];
    const vehicles = [];

    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const serialIndex = headers.indexOf('Serial');
    const typeIndex = headers.indexOf('Type');
    const statusIndex = headers.indexOf('Status');
    const lastMaintenanceIndex = headers.indexOf('LastMaintenance');
    const currentKilometersIndex = headers.indexOf('CurrentKilometers');
    const driverIndex = headers.indexOf('Driver');
    const managerIndex = headers.indexOf('Manager');
    
    // Validate column indexes
    if (idIndex === -1 || serialIndex === -1 || typeIndex === -1 || 
        statusIndex === -1 || lastMaintenanceIndex === -1 || 
        currentKilometersIndex === -1 || driverIndex === -1 || managerIndex === -1) {
      return { status: 'error', message: 'Invalid vehicles sheet structure' };
    }

    // Skip the first row (column headers)
    for (let i = 1; i < data.length; i++) {
      // If managerId is provided, filter vehicles by manager
      if (managerId && data[i][managerIndex] !== managerId) {
        continue;
      }

      vehicles.push({
        id: data[i][idIndex],
        serial: data[i][serialIndex],
        type: data[i][typeIndex],
        status: data[i][statusIndex],
        lastMaintenance: data[i][lastMaintenanceIndex],
        currentKilometers: data[i][currentKilometersIndex],
        driver: data[i][driverIndex],
        manager: data[i][managerIndex]
      });
    }

    return { status: 'success', data: vehicles };
  } catch (error) {
    Logger.log('Error in getVehicles: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Get drivers
function getDrivers(managerId) {
  try {
    const { driversSheet, vehiclesSheet } = getSheets();
    const driversData = driversSheet.getDataRange().getValues();
    const vehiclesData = vehiclesSheet.getDataRange().getValues();

    const driversHeaders = driversData[0];
    const vehiclesHeaders = vehiclesData[0];

    const drivers = [];

    // Find column indexes for drivers
    const driverIdIndex = driversHeaders.indexOf('ID');
    const nameIndex = driversHeaders.indexOf('Name');
    const licenseNumberIndex = driversHeaders.indexOf('LicenseNumber');
    const licenseExpiryIndex = driversHeaders.indexOf('LicenseExpiry');
    const vehicleIdIndex = driversHeaders.indexOf('Vehicle');
    const phoneIndex = driversHeaders.indexOf('Phone');
    
    // Validate drivers column indexes
    if (driverIdIndex === -1 || nameIndex === -1 || licenseNumberIndex === -1 || 
        licenseExpiryIndex === -1 || vehicleIdIndex === -1 || phoneIndex === -1) {
      return { status: 'error', message: 'Invalid drivers sheet structure' };
    }

    // Find column indexes for vehicles
    const vehicleIdColumnIndex = vehiclesHeaders.indexOf('ID');
    const managerIdColumnIndex = vehiclesHeaders.indexOf('Manager');
    
    // Validate vehicles column indexes
    if (vehicleIdColumnIndex === -1 || managerIdColumnIndex === -1) {
      return { status: 'error', message: 'Invalid vehicles sheet structure' };
    }

    // Collect vehicles by manager
    const managerVehicles = [];
    if (managerId) {
      for (let i = 1; i < vehiclesData.length; i++) {
        if (vehiclesData[i][managerIdColumnIndex] === managerId) {
          managerVehicles.push(vehiclesData[i][vehicleIdColumnIndex]);
        }
      }
    }

    // Skip the first row (column headers)
    for (let i = 1; i < driversData.length; i++) {
      const vehicleId = driversData[i][vehicleIdIndex];

      // If managerId is provided, filter drivers by vehicles assigned to the manager
      if (managerId && vehicleId && !managerVehicles.includes(vehicleId)) {
        continue;
      }

      drivers.push({
        id: driversData[i][driverIdIndex],
        name: driversData[i][nameIndex],
        licenseNumber: driversData[i][licenseNumberIndex],
        licenseExpiry: driversData[i][licenseExpiryIndex],
        vehicle: vehicleId,
        phone: driversData[i][phoneIndex]
      });
    }

    return { status: 'success', data: drivers };
  } catch (error) {
    Logger.log('Error in getDrivers: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Get maintenance records
function getMaintenance(managerId) {
  try {
    const { maintenanceSheet, vehiclesSheet } = getSheets();
    const maintenanceData = maintenanceSheet.getDataRange().getValues();
    const vehiclesData = vehiclesSheet.getDataRange().getValues();

    const maintenanceHeaders = maintenanceData[0];
    const vehiclesHeaders = vehiclesData[0];

    const maintenanceRecords = [];

    // Find column indexes for maintenance
    const maintenanceIdIndex = maintenanceHeaders.indexOf('ID');
    const vehicleIdIndex = maintenanceHeaders.indexOf('Vehicle');
    const dateIndex = maintenanceHeaders.indexOf('Date');
    const typeIndex = maintenanceHeaders.indexOf('Type');
    const nextKilometersIndex = maintenanceHeaders.indexOf('NextKilometers');
    const notesIndex = maintenanceHeaders.indexOf('Notes');
    
    // Validate maintenance column indexes
    if (maintenanceIdIndex === -1 || vehicleIdIndex === -1 || dateIndex === -1 || 
        typeIndex === -1 || nextKilometersIndex === -1 || notesIndex === -1) {
      return { status: 'error', message: 'Invalid maintenance sheet structure' };
    }

    // Find column indexes for vehicles
    const vehicleIdColumnIndex = vehiclesHeaders.indexOf('ID');
    const managerIdColumnIndex = vehiclesHeaders.indexOf('Manager');
    
    // Validate vehicles column indexes
    if (vehicleIdColumnIndex === -1 || managerIdColumnIndex === -1) {
      return { status: 'error', message: 'Invalid vehicles sheet structure' };
    }

    // Collect vehicles by manager
    const managerVehicles = [];
    if (managerId) {
      for (let i = 1; i < vehiclesData.length; i++) {
        if (vehiclesData[i][managerIdColumnIndex] === managerId) {
          managerVehicles.push(vehiclesData[i][vehicleIdColumnIndex]);
        }
      }
    }

    // Skip the first row (column headers)
    for (let i = 1; i < maintenanceData.length; i++) {
      const vehicleId = maintenanceData[i][vehicleIdIndex];

      // If managerId is provided, filter maintenance records by vehicles assigned to the manager
      if (managerId && !managerVehicles.includes(vehicleId)) {
        continue;
      }

      maintenanceRecords.push({
        id: maintenanceData[i][maintenanceIdIndex],
        vehicle: vehicleId,
        date: maintenanceData[i][dateIndex],
        type: maintenanceData[i][typeIndex],
        nextKilometers: maintenanceData[i][nextKilometersIndex],
        notes: maintenanceData[i][notesIndex]
      });
    }

    return { status: 'success', data: maintenanceRecords };
  } catch (error) {
    Logger.log('Error in getMaintenance: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Get fuel records
function getFuel(managerId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const fuelSheet = ss.getSheetByName('Fuel');
    
    if (!fuelSheet) {
      return { status: 'error', message: 'Fuel sheet not found' };
    }
    
    const data = getSheetData(fuelSheet);
    
    // Add unique identifiers and ensure structure consistency
    const processedData = data.map((record, index) => {
      // Ensure each record has a unique ID even if not in the spreadsheet
      return {
        ...record,
        id: record.id || record['Vehicle ID'] || `fuel-${index+1}`,
        // Make sure vehicle property matches Vehicle ID for compatibility
        vehicle: record['Vehicle ID']
      };
    });
    
    // Filter by manager if needed
    let filteredData = processedData;
    if (managerId && managerId !== 'all') {
      const vehiclesSheet = ss.getSheetByName('Vehicles');
      if (vehiclesSheet) {
        const vehiclesData = getSheetData(vehiclesSheet);
        const managerVehicles = vehiclesData
          .filter(v => v.Manager === managerId)
          .map(v => v.ID);
        
        filteredData = processedData.filter(record => 
          managerVehicles.includes(record['Vehicle ID'] || record.vehicle)
        );
      }
    }
    
    return { status: 'success', data: filteredData };
  } catch (error) {
    Logger.log('Error in getFuel: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Helper function to get sheet data with headers
function getSheetData(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  
  if (values.length <= 1) {
    return [];
  }
  
  const headers = values[0];
  const data = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const record = {};
    
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = row[j];
    }
    
    data.push(record);
  }
  
  return data;
}

// Get users (admin only)
function getUsers() {
  try {
    const { usersSheet } = getSheets();
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    const users = [];

    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const nameIndex = headers.indexOf('Name');
    const emailIndex = headers.indexOf('Email');
    const roleIndex = headers.indexOf('Role');
    const managerIndex = headers.indexOf('Manager');
    
    // Validate column indexes
    if (idIndex === -1 || nameIndex === -1 || emailIndex === -1 || 
        roleIndex === -1 || managerIndex === -1) {
      return { status: 'error', message: 'Invalid users sheet structure' };
    }

    // Skip the first row (column headers)
    for (let i = 1; i < data.length; i++) {
      users.push({
        id: data[i][idIndex],
        name: data[i][nameIndex],
        email: data[i][emailIndex],
        role: data[i][roleIndex],
        manager: data[i][managerIndex]
      });
    }

    return { status: 'success', data: users };
  } catch (error) {
    Logger.log('Error in getUsers: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Add a new vehicle
function addVehicle(vehicleData) {
  try {
    const { vehiclesSheet } = getSheets();
    const data = vehiclesSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const serialIndex = headers.indexOf('Serial');
    const typeIndex = headers.indexOf('Type');
    const statusIndex = headers.indexOf('Status');
    const lastMaintenanceIndex = headers.indexOf('LastMaintenance');
    const currentKilometersIndex = headers.indexOf('CurrentKilometers');
    const driverIndex = headers.indexOf('Driver');
    const managerIndex = headers.indexOf('Manager');
    
    // Validate column indexes
    if (idIndex === -1 || serialIndex === -1 || typeIndex === -1 || 
        statusIndex === -1 || lastMaintenanceIndex === -1 || 
        currentKilometersIndex === -1 || driverIndex === -1 || managerIndex === -1) {
      return { status: 'error', message: 'Invalid vehicles sheet structure' };
    }

    // Check for duplicate serial number
    for (let i = 1; i < data.length; i++) {
      if (data[i][serialIndex] === vehicleData.serial) {
        return { status: 'error', message: 'Serial number already exists' };
      }
    }

    // Create a unique ID
    const newId = 'v' + (data.length);

    // Add a new row
    vehiclesSheet.appendRow([
      newId,
      vehicleData.serial,
      vehicleData.type,
      vehicleData.status,
      vehicleData.lastMaintenance,
      vehicleData.currentKilometers,
      vehicleData.driver,
      vehicleData.manager
    ]);

    return {
      status: 'success',
      message: 'Vehicle added successfully',
      data: { ...vehicleData, id: newId }
    };
  } catch (error) {
    Logger.log('Error in addVehicle: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Update an existing vehicle
function updateVehicle(vehicleData) {
  try {
    const { vehiclesSheet } = getSheets();
    const data = vehiclesSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const serialIndex = headers.indexOf('Serial');
    const typeIndex = headers.indexOf('Type');
    const statusIndex = headers.indexOf('Status');
    const lastMaintenanceIndex = headers.indexOf('LastMaintenance');
    const currentKilometersIndex = headers.indexOf('CurrentKilometers');
    const driverIndex = headers.indexOf('Driver');
    const managerIndex = headers.indexOf('Manager');
    
    // Validate column indexes
    if (idIndex === -1 || serialIndex === -1 || typeIndex === -1 || 
        statusIndex === -1 || lastMaintenanceIndex === -1 || 
        currentKilometersIndex === -1 || driverIndex === -1 || managerIndex === -1) {
      return { status: 'error', message: 'Invalid vehicles sheet structure' };
    }

    // Find the vehicle by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === vehicleData.id) {
        // Check for duplicate serial number
        for (let j = 1; j < data.length; j++) {
          if (j !== i && data[j][serialIndex] === vehicleData.serial) {
            return { status: 'error', message: 'Serial number already exists' };
          }
        }

        // Update the row
        vehiclesSheet.getRange(i + 1, serialIndex + 1).setValue(vehicleData.serial);
        vehiclesSheet.getRange(i + 1, typeIndex + 1).setValue(vehicleData.type);
        vehiclesSheet.getRange(i + 1, statusIndex + 1).setValue(vehicleData.status);
        vehiclesSheet.getRange(i + 1, lastMaintenanceIndex + 1).setValue(vehicleData.lastMaintenance);
        vehiclesSheet.getRange(i + 1, currentKilometersIndex + 1).setValue(vehicleData.currentKilometers);
        vehiclesSheet.getRange(i + 1, driverIndex + 1).setValue(vehicleData.driver);
        vehiclesSheet.getRange(i + 1, managerIndex + 1).setValue(vehicleData.manager);

        return {
          status: 'success',
          message: 'Vehicle updated successfully',
          data: vehicleData
        };
      }
    }

    return { status: 'error', message: 'Vehicle not found' };
  } catch (error) {
    Logger.log('Error in updateVehicle: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Delete a vehicle
function deleteVehicle(vehicleId) {
  try {
    const { vehiclesSheet } = getSheets();
    const data = vehiclesSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column index for ID
    const idIndex = headers.indexOf('ID');
    
    // Validate column index
    if (idIndex === -1) {
      return { status: 'error', message: 'Invalid vehicles sheet structure' };
    }

    // Find the vehicle by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === vehicleId) {
        // Delete the row
        vehiclesSheet.deleteRow(i + 1);

        // Update related drivers
        updateRelatedDrivers(vehicleId);

        // Delete related maintenance records
        deleteRelatedMaintenance(vehicleId);

        // Delete related fuel records
        deleteRelatedFuel(vehicleId);

        return {
          status: 'success',
          message: 'Vehicle deleted successfully'
        };
      }
    }

    return { status: 'error', message: 'Vehicle not found' };
  } catch (error) {
    Logger.log('Error in deleteVehicle: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Update drivers related to a deleted vehicle
function updateRelatedDrivers(vehicleId) {
  try {
    const { driversSheet } = getSheets();
    const data = driversSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column index for vehicle
    const vehicleIndex = headers.indexOf('Vehicle');
    
    // Validate column index
    if (vehicleIndex === -1) {
      Logger.log('Invalid drivers sheet structure');
      return;
    }

    // Find drivers related to the vehicle
    for (let i = 1; i < data.length; i++) {
      if (data[i][vehicleIndex] === vehicleId) {
        // Update the driver by removing the vehicle association
        driversSheet.getRange(i + 1, vehicleIndex + 1).setValue('');
      }
    }
  } catch (error) {
    Logger.log('Error in updateRelatedDrivers: ' + error.toString());
  }
}

// Delete maintenance records related to a deleted vehicle
function deleteRelatedMaintenance(vehicleId) {
  try {
    const { maintenanceSheet } = getSheets();
    const data = maintenanceSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column index for vehicle
    const vehicleIndex = headers.indexOf('Vehicle');
    
    // Validate column index
    if (vehicleIndex === -1) {
      Logger.log('Invalid maintenance sheet structure');
      return;
    }

    // Find and delete maintenance records related to the vehicle
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][vehicleIndex] === vehicleId) {
        maintenanceSheet.deleteRow(i + 1);
      }
    }
  } catch (error) {
    Logger.log('Error in deleteRelatedMaintenance: ' + error.toString());
  }
}

// Delete fuel records related to a deleted vehicle
function deleteRelatedFuel(vehicleId) {
  try {
    const { fuelSheet } = getSheets();
    const data = fuelSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column index for vehicle
    const vehicleIndex = headers.indexOf('Vehicle');
    
    // Validate column index
    if (vehicleIndex === -1) {
      Logger.log('Invalid fuel sheet structure');
      return;
    }

    // Find and delete fuel records related to the vehicle
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][vehicleIndex] === vehicleId) {
        fuelSheet.deleteRow(i + 1);
      }
    }
  } catch (error) {
    Logger.log('Error in deleteRelatedFuel: ' + error.toString());
  }
}

// Add a new maintenance record
function addMaintenance(maintenanceData) {
  try {
    const { maintenanceSheet } = getSheets();
    const data = maintenanceSheet.getDataRange().getValues();
    const headers = data[0];

    // Validate required fields
    if (!maintenanceData.vehicle || !maintenanceData.date || !maintenanceData.type || 
        !maintenanceData.nextKilometers) {
      return { status: 'error', message: 'Missing required fields' };
    }

    // Create a unique ID
    const newId = 'm' + (data.length);

    // Add a new row
    maintenanceSheet.appendRow([
      newId,
      maintenanceData.vehicle,
      maintenanceData.date,
      maintenanceData.type,
      maintenanceData.nextKilometers,
      maintenanceData.notes || ''
    ]);

    // Update the vehicle's last maintenance date
    updateVehicleLastMaintenance(maintenanceData.vehicle, maintenanceData.date);

    return {
      status: 'success',
      message: 'Maintenance record added successfully',
      data: { ...maintenanceData, id: newId }
    };
  } catch (error) {
    Logger.log('Error in addMaintenance: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Update a vehicle's last maintenance date
function updateVehicleLastMaintenance(vehicleId, date) {
  try {
    const { vehiclesSheet } = getSheets();
    const data = vehiclesSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const lastMaintenanceIndex = headers.indexOf('LastMaintenance');
    const statusIndex = headers.indexOf('Status');
    
    // Validate column indexes
    if (idIndex === -1 || lastMaintenanceIndex === -1 || statusIndex === -1) {
      Logger.log('Invalid vehicles sheet structure');
      return;
    }

    // Find the vehicle and update the last maintenance date
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === vehicleId) {
        vehiclesSheet.getRange(i + 1, lastMaintenanceIndex + 1).setValue(date);

        // If the vehicle is in maintenance, change its status to active
        if (data[i][statusIndex] === 'maintenance') {
          vehiclesSheet.getRange(i + 1, statusIndex + 1).setValue('active');
        }

        break;
      }
    }
  } catch (error) {
    Logger.log('Error in updateVehicleLastMaintenance: ' + error.toString());
  }
}

// Update an existing maintenance record
function updateMaintenance(maintenanceData) {
  try {
    const { maintenanceSheet } = getSheets();
    const data = maintenanceSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const vehicleIndex = headers.indexOf('Vehicle');
    const dateIndex = headers.indexOf('Date');
    const typeIndex = headers.indexOf('Type');
    const nextKilometersIndex = headers.indexOf('NextKilometers');
    const notesIndex = headers.indexOf('Notes');
    
    // Validate column indexes
    if (idIndex === -1 || vehicleIndex === -1 || dateIndex === -1 || 
        typeIndex === -1 || nextKilometersIndex === -1 || notesIndex === -1) {
      return { status: 'error', message: 'Invalid maintenance sheet structure' };
    }

    // Find the maintenance record by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === maintenanceData.id) {
        // Update the row
        maintenanceSheet.getRange(i + 1, vehicleIndex + 1).setValue(maintenanceData.vehicle);
        maintenanceSheet.getRange(i + 1, dateIndex + 1).setValue(maintenanceData.date);
        maintenanceSheet.getRange(i + 1, typeIndex + 1).setValue(maintenanceData.type);
        maintenanceSheet.getRange(i + 1, nextKilometersIndex + 1).setValue(maintenanceData.nextKilometers);
        maintenanceSheet.getRange(i + 1, notesIndex + 1).setValue(maintenanceData.notes || '');

        // Update the vehicle's last maintenance date
        updateVehicleLastMaintenance(maintenanceData.vehicle, maintenanceData.date);

        return {
          status: 'success',
          message: 'Maintenance record updated successfully',
          data: maintenanceData
        };
      }
    }

    return { status: 'error', message: 'Maintenance record not found' };
  } catch (error) {
    Logger.log('Error in updateMaintenance: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Delete a maintenance record
function deleteMaintenance(maintenanceId) {
  try {
    const { maintenanceSheet } = getSheets();
    const data = maintenanceSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column index for ID
    const idIndex = headers.indexOf('ID');
    
    // Validate column index
    if (idIndex === -1) {
      return { status: 'error', message: 'Invalid maintenance sheet structure' };
    }

    // Find the maintenance record by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === maintenanceId) {
        // Delete the row
        maintenanceSheet.deleteRow(i + 1);

        return {
          status: 'success',
          message: 'Maintenance record deleted successfully'
        };
      }
    }

    return { status: 'error', message: 'Maintenance record not found' };
  } catch (error) {
    Logger.log('Error in deleteMaintenance: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Add a new fuel record
function addFuel(fuelData) {
  try {
    const { fuelSheet } = getSheets();
    const data = fuelSheet.getDataRange().getValues();
    
    // Validate required fields
    if (!fuelData.vehicle || !fuelData.date || !fuelData.amount || !fuelData.distance) {
      return { status: 'error', message: 'Missing required fields' };
    }

    // Calculate average consumption
    const consumption = parseFloat(fuelData.distance) / parseFloat(fuelData.amount);

    // Create a unique ID
    const newId = 'f' + (data.length);

    // Add a new row
    fuelSheet.appendRow([
      newId,
      fuelData.vehicle,
      fuelData.date,
      parseFloat(fuelData.amount),
      parseFloat(fuelData.distance),
      consumption,
      parseFloat(fuelData.cost || 0)
    ]);

    return {
      status: 'success',
      message: 'Fuel record added successfully',
      data: { ...fuelData, id: newId, consumption: consumption }
    };
  } catch (error) {
    Logger.log('Error in addFuel: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Update an existing fuel record
function updateFuel(fuelData) {
  try {
    const { fuelSheet } = getSheets();
    const data = fuelSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const vehicleIndex = headers.indexOf('Vehicle');
    const dateIndex = headers.indexOf('Date');
    const amountIndex = headers.indexOf('Amount');
    const distanceIndex = headers.indexOf('Distance');
    const consumptionIndex = headers.indexOf('Consumption');
    const costIndex = headers.indexOf('Cost');
    
    // Validate column indexes
    if (idIndex === -1 || vehicleIndex === -1 || dateIndex === -1 || 
        amountIndex === -1 || distanceIndex === -1 || consumptionIndex === -1 || costIndex === -1) {
      return { status: 'error', message: 'Invalid fuel sheet structure' };
    }

    // Find the fuel record by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === fuelData.id) {
        // Calculate average consumption
        const consumption = parseFloat(fuelData.distance) / parseFloat(fuelData.amount);

        // Update the row
        fuelSheet.getRange(i + 1, vehicleIndex + 1).setValue(fuelData.vehicle);
        fuelSheet.getRange(i + 1, dateIndex + 1).setValue(fuelData.date);
        fuelSheet.getRange(i + 1, amountIndex + 1).setValue(parseFloat(fuelData.amount));
        fuelSheet.getRange(i + 1, distanceIndex + 1).setValue(parseFloat(fuelData.distance));
        fuelSheet.getRange(i + 1, consumptionIndex + 1).setValue(consumption);
        fuelSheet.getRange(i + 1, costIndex + 1).setValue(parseFloat(fuelData.cost || 0));

        return {
          status: 'success',
          message: 'Fuel record updated successfully',
          data: { ...fuelData, consumption: consumption }
        };
      }
    }

    return { status: 'error', message: 'Fuel record not found' };
  } catch (error) {
    Logger.log('Error in updateFuel: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Delete a fuel record
function deleteFuel(fuelId) {
  try {
    const { fuelSheet } = getSheets();
    const data = fuelSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column index for ID
    const idIndex = headers.indexOf('ID');
    
    // Validate column index
    if (idIndex === -1) {
      return { status: 'error', message: 'Invalid fuel sheet structure' };
    }

    // Find the fuel record by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === fuelId) {
        // Delete the row
        fuelSheet.deleteRow(i + 1);

        return {
          status: 'success',
          message: 'Fuel record deleted successfully'
        };
      }
    }

    return { status: 'error', message: 'Fuel record not found' };
  } catch (error) {
    Logger.log('Error in deleteFuel: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Add a new driver
function addDriver(driverData) {
  try {
    const { driversSheet } = getSheets();
    const data = driversSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indexes
    const licenseNumberIndex = headers.indexOf('LicenseNumber');
    
    // Validate column index
    if (licenseNumberIndex === -1) {
      return { status: 'error', message: 'Invalid drivers sheet structure' };
    }

    // Validate required fields
    if (!driverData.name || !driverData.licenseNumber || !driverData.licenseExpiry) {
      return { status: 'error', message: 'Missing required fields' };
    }

    // Check for duplicate license number
    for (let i = 1; i < data.length; i++) {
      if (data[i][licenseNumberIndex] === driverData.licenseNumber) {
        return { status: 'error', message: 'License number already exists' };
      }
    }

    // Create a unique ID
    const newId = 'd' + (data.length);

    // Add a new row
    driversSheet.appendRow([
      newId,
      driverData.name,
      driverData.licenseNumber,
      driverData.licenseExpiry,
      driverData.vehicle || '',
      driverData.phone || ''
    ]);

    return {
      status: 'success',
      message: 'Driver added successfully',
      data: { ...driverData, id: newId }
    };
  } catch (error) {
    Logger.log('Error in addDriver: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Update an existing driver
function updateDriver(driverData) {
  try {
    const { driversSheet } = getSheets();
    const data = driversSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const nameIndex = headers.indexOf('Name');
    const licenseNumberIndex = headers.indexOf('LicenseNumber');
    const licenseExpiryIndex = headers.indexOf('LicenseExpiry');
    const vehicleIndex = headers.indexOf('Vehicle');
    const phoneIndex = headers.indexOf('Phone');
    
    // Validate column indexes
    if (idIndex === -1 || nameIndex === -1 || licenseNumberIndex === -1 || 
        licenseExpiryIndex === -1 || vehicleIndex === -1 || phoneIndex === -1) {
      return { status: 'error', message: 'Invalid drivers sheet structure' };
    }

    // Find the driver by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === driverData.id) {
        // Check for duplicate license number
        for (let j = 1; j < data.length; j++) {
          if (j !== i && data[j][licenseNumberIndex] === driverData.licenseNumber) {
            return { status: 'error', message: 'License number already exists' };
          }
        }

        // Update the row
        driversSheet.getRange(i + 1, nameIndex + 1).setValue(driverData.name);
        driversSheet.getRange(i + 1, licenseNumberIndex + 1).setValue(driverData.licenseNumber);
        driversSheet.getRange(i + 1, licenseExpiryIndex + 1).setValue(driverData.licenseExpiry);
        driversSheet.getRange(i + 1, vehicleIndex + 1).setValue(driverData.vehicle || '');
        driversSheet.getRange(i + 1, phoneIndex + 1).setValue(driverData.phone || '');

        return {
          status: 'success',
          message: 'Driver updated successfully',
          data: driverData
        };
      }
    }

    return { status: 'error', message: 'Driver not found' };
  } catch (error) {
    Logger.log('Error in updateDriver: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Delete a driver
function deleteDriver(driverId) {
  try {
    const { driversSheet, vehiclesSheet } = getSheets();
    const data = driversSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column index for ID
    const idIndex = headers.indexOf('ID');
    
    // Validate column index
    if (idIndex === -1) {
      return { status: 'error', message: 'Invalid drivers sheet structure' };
    }

    // Find the driver by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === driverId) {
        // Delete the row
        driversSheet.deleteRow(i + 1);
        
        // Update vehicles that had this driver assigned
        updateVehiclesAfterDriverDelete(driverId);

        return {
          status: 'success',
          message: 'Driver deleted successfully'
        };
      }
    }

    return { status: 'error', message: 'Driver not found' };
  } catch (error) {
    Logger.log('Error in deleteDriver: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Update vehicles after a driver is deleted
function updateVehiclesAfterDriverDelete(driverId) {
  try {
    const { vehiclesSheet } = getSheets();
    const data = vehiclesSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indexes
    const driverIndex = headers.indexOf('Driver');
    
    // Validate column index
    if (driverIndex === -1) {
      Logger.log('Invalid vehicles sheet structure');
      return;
    }
    
    // Find vehicles with the deleted driver
    for (let i = 1; i < data.length; i++) {
      if (data[i][driverIndex] === driverId) {
        // Remove the driver association
        vehiclesSheet.getRange(i + 1, driverIndex + 1).setValue('');
      }
    }
  } catch (error) {
    Logger.log('Error in updateVehiclesAfterDriverDelete: ' + error.toString());
  }
}

// Add a new user
function addUser(userData) {
  try {
    const { usersSheet } = getSheets();
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indexes
    const emailIndex = headers.indexOf('Email');
    
    // Validate column index
    if (emailIndex === -1) {
      return { status: 'error', message: 'Invalid users sheet structure' };
    }

    // Validate required fields
    if (!userData.name || !userData.email || !userData.password || !userData.role) {
      return { status: 'error', message: 'Missing required fields' };
    }

    // Check for duplicate email
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === userData.email) {
        return { status: 'error', message: 'Email already exists' };
      }
    }

    // Create a unique ID
    const newId = 'u' + (data.length);

    // Add a new row
    usersSheet.appendRow([
      newId,
      userData.name,
      userData.email,
      userData.password, // In a real application, password should be hashed
      userData.role,
      userData.manager || ''
    ]);

    return {
      status: 'success',
      message: 'User added successfully',
      data: { ...userData, id: newId }
    };
  } catch (error) {
    Logger.log('Error in addUser: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Update an existing user
function updateUser(userData) {
  try {
    const { usersSheet } = getSheets();
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indexes
    const idIndex = headers.indexOf('ID');
    const nameIndex = headers.indexOf('Name');
    const emailIndex = headers.indexOf('Email');
    const passwordIndex = headers.indexOf('Password');
    const roleIndex = headers.indexOf('Role');
    const managerIndex = headers.indexOf('Manager');
    
    // Validate column indexes
    if (idIndex === -1 || nameIndex === -1 || emailIndex === -1 || 
        passwordIndex === -1 || roleIndex === -1 || managerIndex === -1) {
      return { status: 'error', message: 'Invalid users sheet structure' };
    }

    // Find the user by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === userData.id) {
        // Check for duplicate email
        for (let j = 1; j < data.length; j++) {
          if (j !== i && data[j][emailIndex] === userData.email) {
            return { status: 'error', message: 'Email already exists' };
          }
        }

        // Update the row
        usersSheet.getRange(i + 1, nameIndex + 1).setValue(userData.name);
        usersSheet.getRange(i + 1, emailIndex + 1).setValue(userData.email);
        
        // Only update password if provided
        if (userData.password) {
          usersSheet.getRange(i + 1, passwordIndex + 1).setValue(userData.password);
        }
        
        usersSheet.getRange(i + 1, roleIndex + 1).setValue(userData.role);
        usersSheet.getRange(i + 1, managerIndex + 1).setValue(userData.manager || '');

        return {
          status: 'success',
          message: 'User updated successfully',
          data: userData
        };
      }
    }

    return { status: 'error', message: 'User not found' };
  } catch (error) {
    Logger.log('Error in updateUser: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Delete a user
function deleteUser(userId) {
  try {
    const { usersSheet, vehiclesSheet } = getSheets();
    const userData = usersSheet.getDataRange().getValues();
    const vehiclesData = vehiclesSheet.getDataRange().getValues();
    const userHeaders = userData[0];
    const vehiclesHeaders = vehiclesData[0];

    // Find column indexes
    const userIdIndex = userHeaders.indexOf('ID');
    const userRoleIndex = userHeaders.indexOf('Role');
    const vehicleManagerIndex = vehiclesHeaders.indexOf('Manager');
    
    // Validate column indexes
    if (userIdIndex === -1 || userRoleIndex === -1 || vehicleManagerIndex === -1) {
      return { status: 'error', message: 'Invalid sheet structure' };
    }

    // Find the user by ID
    let userIndex = -1;
    let userRole = '';
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][userIdIndex] === userId) {
        userIndex = i;
        userRole = userData[i][userRoleIndex];
        break;
      }
    }

    if (userIndex === -1) {
      return { status: 'error', message: 'User not found' };
    }

    // If the user is a manager, check if they have vehicles assigned
    if (userRole === 'manager') {
      let hasVehicles = false;
      for (let i = 1; i < vehiclesData.length; i++) {
        if (vehiclesData[i][vehicleManagerIndex] === userId) {
          hasVehicles = true;
          break;
        }
      }

      if (hasVehicles) {
        return { 
          status: 'error', 
          message: 'Cannot delete manager: They have vehicles assigned. Please reassign vehicles first.' 
        };
      }
    }

    // Delete the user
    usersSheet.deleteRow(userIndex + 1);

    return {
      status: 'success',
      message: 'User deleted successfully'
    };
  } catch (error) {
    Logger.log('Error in deleteUser: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Get dashboard data
function getDashboardData() {
  try {
    const { dashboardSheet } = getSheets();
    const data = dashboardSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Log all available headers for debugging
    Logger.log('Available headers in dashboard sheet: ' + headers.join(', '));

    // Get column indices for all required fields with better error handling
    const columnIndexes = {};
    let missingColumns = [];
    
    Object.entries(DASHBOARD_COLUMNS).forEach(([key, columnName]) => {
      const index = headers.indexOf(columnName);
      if (index === -1) {
        // Add to missing columns list instead of throwing error immediately
        missingColumns.push(columnName);
        Logger.log(`Warning: Column not found: ${columnName}`);
      } else {
        columnIndexes[columnName] = index;
      }
    });
    
    // Check for possible case mismatches or minor variations in column names
    if (missingColumns.length > 0) {
      // For each missing column, try to find a similar column name
      const fixedIndexes = {};
      missingColumns.forEach(missingCol => {
        // Try case-insensitive match
        for (let i = 0; i < headers.length; i++) {
          if (headers[i].toLowerCase() === missingCol.toLowerCase() ||
              headers[i].toLowerCase().includes(missingCol.toLowerCase())) {
            Logger.log(`Found possible match for "${missingCol}": "${headers[i]}"`);
            fixedIndexes[missingCol] = i;
            break;
          }
        }
      });
      
      // Update column indexes with the fixed ones
      Object.entries(fixedIndexes).forEach(([missingCol, index]) => {
        columnIndexes[missingCol] = index;
        // Remove from missing columns
        missingColumns = missingColumns.filter(col => col !== missingCol);
      });
      
      // If there are still missing columns, log a warning but continue
      if (missingColumns.length > 0) {
        Logger.log(`Warning: Some columns could not be found: ${missingColumns.join(', ')}`);
      }
    }

    Logger.log('Found column indexes:', columnIndexes);

    // Map data to vehicles array
    const vehicles = data.slice(1) // Skip header row
      .filter(row => {
        // Only include rows with vehicle ID
        const hasId = row[columnIndexes[DASHBOARD_COLUMNS.VEHICLE_ID]];
        if (!hasId) {
          Logger.log('Skipping row without vehicle ID');
          return false;
        }
        return true;
      })
      .map(row => {
        const vehicle = {};
        
        // First add all available standard columns
        Object.entries(DASHBOARD_COLUMNS).forEach(([key, columnName]) => {
          if (columnIndexes[columnName] !== undefined) {
            let value = row[columnIndexes[columnName]];
            
            // Clean up and convert values based on column name
            if (typeof value === 'string') {
              value = value.trim();
            }
  
            if (columnName === DASHBOARD_COLUMNS.CURRENT_KM || columnName === DASHBOARD_COLUMNS.KM_TO_MAINTENANCE) {
              const numValue = parseInt(String(value).replace(/,/g, ''), 10);
              vehicle[columnName] = isNaN(numValue) ? 0 : numValue; // Default to 0 if NaN
            } else {
              vehicle[columnName] = value || '';
            }
          } else {
            // If column is missing, add a default empty value
            vehicle[columnName] = '';
          }
        });
        
        return vehicle;
      });

    Logger.log(`Processed ${vehicles.length} vehicles`);
    if (vehicles.length > 0) {
      Logger.log('Sample vehicle data:', vehicles[0]);
    }

    return {
      status: 'success',
      data: vehicles
    };
  } catch (error) {
    Logger.log('Error in getDashboardData: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

// Update dashboard data
function updateDashboardData(updateData) {
  try {
    const { dashboardSheet } = getSheets();
    const data = dashboardSheet.getDataRange().getValues();
    const headers = data[0];

    // Create a map of column names to indexes
    const columnIndexes = {};
    Object.values(DASHBOARD_COLUMNS).forEach(columnName => {
      columnIndexes[columnName] = headers.indexOf(columnName);
      if (columnIndexes[columnName] === -1) {
        throw new Error(`Column not found: ${columnName}`);
      }
    });

    // Find the row to update based on Vehicle ID
    const vehicleIdIndex = columnIndexes[DASHBOARD_COLUMNS.VEHICLE_ID];
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][vehicleIdIndex] === updateData[DASHBOARD_COLUMNS.VEHICLE_ID]) {
        rowIndex = i + 1; // Add 1 because sheet rows are 1-based
        break;
      }
    }

    if (rowIndex === -1) {
      // If vehicle not found, add new row
      const newRow = [];
      headers.forEach((header, index) => {
        const value = updateData[header] || '';
        newRow[index] = value;
      });
      dashboardSheet.appendRow(newRow);
      return {
        status: 'success',
        message: 'Vehicle added to dashboard successfully',
        data: updateData
      };
    }

    // Update each field that is provided
    Object.entries(updateData).forEach(([columnName, value]) => {
      const columnIndex = columnIndexes[columnName];
      if (columnIndex !== undefined) {
        dashboardSheet.getRange(rowIndex, columnIndex + 1).setValue(value);
      }
    });

    return {
      status: 'success',
      message: 'Dashboard data updated successfully',
      data: updateData
    };
  } catch (error) {
    Logger.log('Error in updateDashboardData: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}