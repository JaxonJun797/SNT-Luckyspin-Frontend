// Admin Panel JavaScript
const BACKEND_URL = 'https://snt-luckyspin.onrender.com'; // Your deployed backend
// const BACKEND_URL = 'http://localhost:3001'; // Local development

let currentUsers = [];
let selectedUsers = new Set();

// Admin credentials (change these!)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'Shwe123@'
};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        showAdminPanel();
        loadStats();
        loadUsers();
    }

    // Setup confirm reset checkbox
    document.getElementById('confirmReset').addEventListener('change', function() {
        document.getElementById('resetAllBtn').disabled = !this.checked;
    });

    // Setup enter key for login
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            adminLogin();
        }
    });
    
    // Setup enter key for date filter (after admin panel is shown)
    setTimeout(() => {
        const statsDateFilter = document.getElementById('statsDateFilter');
        
        if (statsDateFilter) {
            statsDateFilter.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    filterByDate();
                }
            });
        }
    }, 1000);
});

// Admin login function
function adminLogin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const messageDiv = document.getElementById('loginMessage');

    if (!username || !password) {
        showMessage('Please enter both username and password.', 'error', messageDiv);
        return;
    }

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
        loadStats();
        loadUsers();
        showMessage('Login successful!', 'success');
    } else {
        showMessage('Invalid credentials!', 'error', messageDiv);
    }
}

// Show admin panel
function showAdminPanel() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadPrizes();
    loadProbabilities();
    loadDisplayMode();
    loadTotalSpinsCounter();
}

// Admin logout
function adminLogout() {
    localStorage.removeItem('adminLoggedIn');
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminUsername').value = '';
    document.getElementById('adminPassword').value = '';
    showMessage('Logged out successfully!', 'info');
}

// Load statistics
async function loadStats(params = '') {
    try {
        const url = `${BACKEND_URL}/api/admin/stats${params}`;
        console.log('Fetching stats from:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Stats response:', data);
        
        if (data.debug) {
            console.log('Debug info:', data.debug);
            console.log('Recent dates in DB:', data.debug.recentDates);
            console.log('Filtered count:', data.debug.filteredCount);
        }
        
        if (data.success) {
            document.getElementById('totalUsers').textContent = data.stats.totalUsers || 0;
            document.getElementById('totalSpins').textContent = data.stats.totalSpins || 0;
            document.getElementById('totalPrizes').textContent = (data.stats.totalPrizes || 0).toLocaleString();
            document.getElementById('todaySpins').textContent = data.stats.todaySpins || 0;
            
            // Update date label
            const dateLabel = data.stats.dateLabel || 'All Time';
            updateDateLabel(dateLabel);
            
            // Show message only if not called from other functions
            if (!params) {
                showMessage('Statistics loaded successfully', 'success');
            }
        } else {
            showMessage('Failed to load statistics', 'error');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showMessage('Error loading statistics', 'error');
    }
}

// Filter data by selected date
async function filterByDate() {
    const dateFilter = document.getElementById('statsDateFilter').value;
    if (!dateFilter) {
        showMessage('Please select a date to filter', 'error');
        return;
    }
    
    console.log('Filtering by date:', dateFilter);
    console.log('Date object:', new Date(dateFilter));
    console.log('API URL will be:', `${BACKEND_URL}/api/admin/stats?dateFilter=${dateFilter}`);
    
    const params = `?dateFilter=${dateFilter}`;
    await loadStats(params);
    await loadUsers(dateFilter);
    
    // Ensure date label is updated (fallback)
    const formattedDate = new Date(dateFilter).toLocaleDateString();
    updateDateLabel(formattedDate);
    
    showMessage(`Filtered data for ${formattedDate}`, 'success');
}

// Load today's statistics
async function loadTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('statsDateFilter').value = today;
    
    console.log('Loading today\'s stats for:', today); // Debug log
    const params = `?dateFilter=${today}`;
    await loadStats(params);
    await loadUsers(today);
    
    // Ensure date label is updated (fallback)
    updateDateLabel('Today');
    
    showMessage('Showing today\'s data', 'success');
}

// Load all time statistics
async function loadAllTimeStats() {
    // Clear date input
    document.getElementById('statsDateFilter').value = '';
    
    console.log('Loading all time stats'); // Debug log
    await loadStats();
    await loadUsers();
    
    // Ensure date label is updated (fallback)
    updateDateLabel('All Time');
    
    showMessage('Showing all time data', 'success');
}

// Load users
async function loadUsers(dateFilter = null) {
    try {
        let url = `${BACKEND_URL}/api/spins`;
        
        if (dateFilter) {
            url += `?dateFilter=${dateFilter}`;
        }
        
        const response = await fetch(url);
        const users = await response.json();
        
        currentUsers = users;
        displayUsers(users);
        updateSelectedCount();
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Error loading users', 'error');
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #ccc;">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <input type="checkbox" class="user-checkbox" value="${user.username}" 
                       onchange="toggleUserSelection('${user.username}')">
            </td>
            <td style="word-break: break-word;">${user.username}</td>
            <td style="color: #FFD700; font-weight: bold; word-break: break-word;">${user.prize}</td>
            <td style="white-space: nowrap;">${new Date(user.date).toLocaleDateString()}</td>
            <td style="color: #00FFFF;">${user.device || 'Unknown'}</td>
            <td style="color: ${user.ipAddress && user.ipAddress !== 'Unknown' ? '#FF6B6B' : '#666'}; font-family: monospace; font-size: 11px; word-break: break-all;">${user.ipAddress || 'Not tracked'}</td>
            <td style="color: #00FF66;">${user.os || 'Unknown'}</td>
            <td>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; white-space: nowrap;" 
                        onclick="deleteSingleUserByName('${user.username}')">Delete</button>
            </td>
        </tr>
    `).join('');
}



// Filter users
function filterUsers() {
    const searchTerm = document.getElementById('searchUser').value.toLowerCase();
    const dateFilter = document.getElementById('dateFilter').value;
    
    let filtered = currentUsers;
    
    if (searchTerm) {
        filtered = filtered.filter(user => 
            user.username.toLowerCase().includes(searchTerm)
        );
    }
    
    if (dateFilter) {
        filtered = filtered.filter(user => {
            const userDate = new Date(user.date).toISOString().split('T')[0];
            return userDate === dateFilter;
        });
    }
    
    displayUsers(filtered);
}

// Toggle user selection
function toggleUserSelection(username) {
    if (selectedUsers.has(username)) {
        selectedUsers.delete(username);
    } else {
        selectedUsers.add(username);
    }
    updateSelectedCount();
}

// Toggle select all
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    
    if (selectAllCheckbox.checked) {
        userCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedUsers.add(checkbox.value);
        });
    } else {
        userCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            selectedUsers.delete(checkbox.value);
        });
    }
    updateSelectedCount();
}

// Select all users
function selectAllUsers() {
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    userCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedUsers.add(checkbox.value);
    });
    document.getElementById('selectAllCheckbox').checked = true;
    updateSelectedCount();
}

// Deselect all users
function deselectAllUsers() {
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    userCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        selectedUsers.delete(checkbox.value);
    });
    document.getElementById('selectAllCheckbox').checked = false;
    updateSelectedCount();
}

// Update selected count
function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = `${selectedUsers.size} selected`;
}

// Prize Management Functions
let currentPrizes = {
    en: [],
    mm: []
};
let currentProbabilities = [];

// Load prizes from backend
async function loadPrizes() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/prizes`);
        const data = await response.json();
        
        if (data.success) {
            currentPrizes = data.prizes;
            displayPrizes();
            showMessage('Prizes loaded successfully', 'success');
        } else {
            showMessage('Failed to load prizes', 'error');
        }
    } catch (error) {
        console.error('Error loading prizes:', error);
        showMessage('Error loading prizes', 'error');
    }
}

// Display prizes in the admin panel
function displayPrizes() {
    displayPrizeInputs('en', 'englishPrizes');
    displayPrizeInputs('mm', 'myanmarPrizes');
}

// Display prize inputs for a specific language
function displayPrizeInputs(lang, containerId) {
    const container = document.getElementById(containerId);
    const prizes = currentPrizes[lang] || [];
    
    container.innerHTML = prizes.map((prize, index) => `
        <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="text" value="${prize}" 
                   onchange="updatePrize('${lang}', ${index}, this.value)"
                   style="flex: 1; padding: 8px; border-radius: 5px; border: 1px solid rgba(0,255,255,0.3); background: rgba(0,0,0,0.3); color: white;">
            <button class="btn btn-danger" onclick="removePrize('${lang}', ${index})" 
                    style="padding: 8px 12px; font-size: 12px;">🗑️</button>
        </div>
    `).join('');
}

// Update a specific prize
function updatePrize(lang, index, value) {
    if (!currentPrizes[lang]) currentPrizes[lang] = [];
    currentPrizes[lang][index] = value;
}

// Add a new prize
function addPrize(lang) {
    if (!currentPrizes[lang]) currentPrizes[lang] = [];
    const defaultPrize = lang === 'en' ? '1,000 MMK' : '၁၀၀၀ ကျပ်';
    currentPrizes[lang].push(defaultPrize);
    displayPrizes();
}

// Remove a prize
function removePrize(lang, index) {
    if (!currentPrizes[lang]) return;
    currentPrizes[lang].splice(index, 1);
    displayPrizes();
    loadProbabilities(); // Reload probabilities to match new prize count
}

// Save prizes to backend
async function savePrizes() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/prizes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prizes: currentPrizes })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Prizes saved successfully', 'success');
            loadProbabilities(); // Reload probabilities to match new prizes
        } else {
            showMessage(data.error || 'Failed to save prizes', 'error');
        }
    } catch (error) {
        console.error('Error saving prizes:', error);
        showMessage('Error saving prizes', 'error');
    }
}

// Load probabilities from backend
async function loadProbabilities() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/probabilities`);
        const data = await response.json();
        
        if (data.success) {
            currentProbabilities = data.probabilities;
            displayProbabilities();
            showMessage('Probabilities loaded successfully', 'success');
        } else {
            showMessage('Failed to load probabilities', 'error');
        }
    } catch (error) {
        console.error('Error loading probabilities:', error);
        showMessage('Error loading probabilities', 'error');
    }
}

// Display probability inputs
function displayProbabilities() {
    const container = document.getElementById('probabilityInputs');
    const prizeCount = Math.max(currentPrizes.en?.length || 0, currentPrizes.mm?.length || 0);
    
    if (prizeCount === 0) {
        container.innerHTML = '<p style="color: #ccc;">Please set up prizes first</p>';
        return;
    }
    
    // Ensure probabilities array matches prize count
    while (currentProbabilities.length < prizeCount) {
        currentProbabilities.push(1);
    }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            ${currentProbabilities.slice(0, prizeCount).map((prob, index) => `
                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid rgba(0,255,255,0.1);">
                    <label style="color: #00FFFF; font-weight: bold; margin-bottom: 5px; display: block;">
                        Prize ${index + 1}:
                    </label>
                    <div style="color: #FFD700; font-size: 12px; margin-bottom: 8px;">
                        ${currentPrizes.en?.[index] || 'N/A'}
                    </div>
                    <input type="number" value="${prob}" min="0" step="0.001"
                           onchange="updateProbability(${index}, this.value)"
                           style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid rgba(0,255,255,0.3); background: rgba(0,0,0,0.3); color: white;">
                    <div style="color: #ccc; font-size: 11px; margin-top: 5px;">
                        Current: ${((prob / currentProbabilities.reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Update a specific probability
function updateProbability(index, value) {
    currentProbabilities[index] = parseFloat(value) || 0;
    displayProbabilities(); // Refresh to show updated percentages
}

// Save probabilities to backend
async function saveProbabilities() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/probabilities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ probabilities: currentProbabilities })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Probabilities saved successfully', 'success');
        } else {
            showMessage(data.error || 'Failed to save probabilities', 'error');
        }
    } catch (error) {
        console.error('Error saving probabilities:', error);
        showMessage('Error saving probabilities', 'error');
    }
}

// Reset probabilities to default
function resetToDefault() {
    if (!confirm('Reset probabilities to default values?')) return;
    
    const prizeCount = Math.max(currentPrizes.en?.length || 0, currentPrizes.mm?.length || 0);
    
    // Default probabilities (higher for lower prizes, lower for higher prizes)
    const defaultProbs = [30, 20, 40, 30, 1, 0.1, 0.01, 0.001, 0.0001];
    currentProbabilities = defaultProbs.slice(0, prizeCount);
    
    // Fill remaining with 1 if more prizes than defaults
    while (currentProbabilities.length < prizeCount) {
        currentProbabilities.push(1);
    }
    
    displayProbabilities();
    showMessage('Probabilities reset to default', 'info');
}

// Delete single user by name (for table delete buttons)
async function deleteSingleUserByName(username) {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/delete-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`User "${username}" deleted successfully`, 'success');
            loadUsers();
            loadStats();
        } else {
            showMessage(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showMessage('Error deleting user', 'error');
    }
}

// ===== DISPLAY MODE MANAGEMENT =====

// Load current display mode
async function loadDisplayMode() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/display-mode`);
        const data = await response.json();
        
        if (data.success) {
            const mode = data.displayMode;
            document.getElementById(`displayMode${mode.charAt(0).toUpperCase() + mode.slice(1)}`).checked = true;
            updateDisplayModeStatus(mode);
        } else {
            showMessage('Failed to load display mode', 'error');
        }
    } catch (error) {
        console.error('Error loading display mode:', error);
        showMessage('Error loading display mode', 'error');
    }
}

// Update display mode
async function updateDisplayMode() {
    const selectedMode = document.querySelector('input[name="displayMode"]:checked').value;
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/display-mode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayMode: selectedMode })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateDisplayModeStatus(selectedMode);
            showMessage(`Display mode changed to ${selectedMode}`, 'success');
        } else {
            showMessage(data.error || 'Failed to update display mode', 'error');
        }
    } catch (error) {
        console.error('Error updating display mode:', error);
        showMessage('Error updating display mode', 'error');
    }
}

// Update display mode status
function updateDisplayModeStatus(mode) {
    const statusDiv = document.getElementById('displayModeStatus');
    if (mode === 'real') {
        statusDiv.innerHTML = '✅ Currently showing REAL users with masked usernames';
        statusDiv.style.color = '#00FF66';
    } else {
        statusDiv.innerHTML = '🎭 Currently showing DEMO users with fake data';
        statusDiv.style.color = '#FFD700';
    }
}

// Update date label
function updateDateLabel(dateLabel) {
    const statsDateLabelElement = document.getElementById('statsDateLabel');
    if (statsDateLabelElement) {
        const labelText = `Showing: ${dateLabel} Data`;
        statsDateLabelElement.textContent = labelText;
        console.log('Date label updated to:', labelText);
    } else {
        console.error('statsDateLabel element not found in DOM');
    }
}

// Refresh current view maintaining date filter
async function refreshCurrentView() {
    const statsDateFilter = document.getElementById('statsDateFilter').value;
    
    if (statsDateFilter) {
        const params = `?dateFilter=${statsDateFilter}`;
        await loadStats(params);
        await loadUsers(statsDateFilter);
    } else {
        await loadStats();
        await loadUsers();
    }
    
    showMessage('Data refreshed', 'success');
}

// Delete selected users
async function deleteSelectedUsers() {
    if (selectedUsers.size === 0) {
        showMessage('Please select users to delete', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedUsers.size} selected users?`)) {
        return;
    }
    
    try {
        const usernames = Array.from(selectedUsers);
        const response = await fetch(`${BACKEND_URL}/api/admin/batch-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`Successfully deleted ${data.deletedCount} users`, 'success');
            selectedUsers.clear();
            loadUsers();
            loadStats();
        } else {
            showMessage(data.error || 'Failed to delete users', 'error');
        }
    } catch (error) {
        console.error('Error deleting selected users:', error);
        showMessage('Error deleting users', 'error');
    }
}

// Reset all database
async function resetAllDatabase() {
    const confirmCheckbox = document.getElementById('confirmReset');
    
    if (!confirmCheckbox.checked) {
        showMessage('Please confirm that you understand this action', 'error');
        return;
    }
    
    const finalConfirm = prompt('Type "DELETE ALL" to confirm this action:');
    if (finalConfirm !== 'DELETE ALL') {
        showMessage('Action cancelled', 'info');
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/reset-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('All database records deleted successfully', 'success');
            confirmCheckbox.checked = false;
            document.getElementById('resetAllBtn').disabled = true;
            selectedUsers.clear();
            loadUsers();
            loadStats();
        } else {
            showMessage(data.error || 'Failed to reset database', 'error');
        }
    } catch (error) {
        console.error('Error resetting database:', error);
        showMessage('Error resetting database', 'error');
    }
}

// Export data
async function exportData(format) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/export?format=${format}`);
        const data = await response.json();
        
        if (data.success) {
            const blob = new Blob([data.data], { 
                type: format === 'json' ? 'application/json' : 'text/csv' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ezbet-data-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showMessage(`Data exported as ${format.toUpperCase()}`, 'success');
        } else {
            showMessage('Failed to export data', 'error');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showMessage('Error exporting data', 'error');
    }
}

// Import data
async function importData() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('Please select a file to import', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/import`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`Successfully imported ${data.importedCount} records`, 'success');
            fileInput.value = '';
            loadUsers();
            loadStats();
        } else {
            showMessage(data.error || 'Failed to import data', 'error');
        }
    } catch (error) {
        console.error('Error importing data:', error);
        showMessage('Error importing data', 'error');
    }
}

// Export to Excel with proper formatting
async function exportToExcel() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/spins`);
        const users = await response.json();
        
        if (!users.length) {
            showMessage('No data to export', 'error');
            return;
        }
        
        // Create Excel-compatible CSV with proper headers
        const headers = [
            'Username',
            'Prize',
            'Date',
            'Time',
            'Device Type',
            'IP Address',
            'Operating System',
            'Browser',
            'User Agent'
        ];
        
        const csvContent = [
            headers.join(','),
            ...users.map(user => {
                const date = new Date(user.date);
                return [
                    `"${user.username}"`,
                    `"${user.prize}"`,
                    `"${date.toLocaleDateString()}"`,
                    `"${date.toLocaleTimeString()}"`,
                    `"${user.device || 'Unknown'}"`,
                    `"${user.ipAddress || 'Unknown'}"`,
                    `"${user.os || 'Unknown'}"`,
                    `"${user.browser || 'Unknown'}"`,
                    `"${(user.userAgent || 'Unknown').replace(/"/g, '""')}"`
                ].join(',');
            })
        ].join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ezbet-data-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage(`Exported ${users.length} records to Excel format`, 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showMessage('Error exporting to Excel', 'error');
    }
}

// Test IP detection
async function testIPDetection() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/test-ip`);
        const data = await response.json();
        
        if (data.success) {
            console.log('=== IP DETECTION TEST ===');
            console.log('Detected IP:', data.detectedIP);
            console.log('Express req.ip:', data.expressIP);
            console.log('Headers:', data.headers);
            console.log('Connection IP:', data.connectionIP);
            console.log('Socket IP:', data.socketIP);
            
            showMessage(`IP Detection Test: ${data.detectedIP} - Check console for details`, 'info');
        } else {
            showMessage('Failed to test IP detection', 'error');
        }
    } catch (error) {
        console.error('Error testing IP detection:', error);
        showMessage('Error testing IP detection', 'error');
    }
}

// Update old records with default IP
async function updateOldIPs() {
    if (!confirm('This will update old records without IP addresses. Continue?')) {
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/update-old-ips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Update result:', data);
            showMessage(`Found ${data.foundRecords} records, updated ${data.updatedCount} with legacy IP`, 'success');
            refreshCurrentView();
        } else {
            showMessage(data.error || 'Failed to update old IPs', 'error');
        }
    } catch (error) {
        console.error('Error updating old IPs:', error);
        showMessage('Error updating old IPs', 'error');
    }
}

// Force update all records with sample IPs (for testing)
async function forceUpdateIPs() {
    if (!confirm('This will update ALL records with sample IP addresses. This is for testing only. Continue?')) {
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/force-update-ips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`Force updated ${data.updatedCount} records with sample IPs`, 'success');
            refreshCurrentView();
        } else {
            showMessage(data.error || 'Failed to force update IPs', 'error');
        }
    } catch (error) {
        console.error('Error force updating IPs:', error);
        showMessage('Error force updating IPs', 'error');
    }
}

// Check device data to see why it's showing "Unknown"
async function checkDeviceData() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/debug/device-data`);
        const data = await response.json();
        
        if (data.success) {
            console.log('=== DEVICE DATA ANALYSIS ===');
            console.log('Total records:', data.totalRecords);
            console.log('Summary:', data.summary);
            console.log('Detailed data:', data.deviceData);
            
            let reason = '';
            if (data.summary.recordsWithoutDeviceFields === data.totalRecords) {
                reason = 'All records are missing device fields - this means they were created BEFORE device detection was added to the system.';
            } else if (data.summary.recordsWithUserAgent === 0) {
                reason = 'No user agent data found - device detection cannot work without user agent information.';
            } else if (data.summary.recordsWithDevice === 0) {
                reason = 'User agent exists but device detection is failing - there might be an issue with the parsing logic.';
            } else {
                reason = `Mixed data: ${data.summary.recordsWithDevice} records have device info, ${data.summary.recordsWithoutDeviceFields} records don't.`;
            }
            
            console.log('REASON FOR "Unknown":', reason);
            showMessage(`Device data checked - see console for details. Reason: ${reason}`, 'info');
        } else {
            showMessage('Failed to check device data', 'error');
        }
    } catch (error) {
        console.error('Error checking device data:', error);
        showMessage('Error checking device data', 'error');
    }
}

// Show message
function showMessage(message, type, container = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    if (container) {
        container.innerHTML = '';
        container.appendChild(messageDiv);
    } else {
        const messageContainer = document.getElementById('messageContainer');
        messageContainer.appendChild(messageDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}
// 
//TOTAL SPINS COUNTER MANAGEMENT//

// Load total spins counter information
async function loadTotalSpinsCounter() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/total-spins-counter`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('displayedTotal').textContent = data.totalCounter.toLocaleString();
            document.getElementById('baseCounter').textContent = data.baseCounter.toLocaleString();
            document.getElementById('dbSpins').textContent = data.dbCount.toLocaleString();
            
            // Update input fields with current values
            document.getElementById('totalCounterInput').value = data.totalCounter;
            document.getElementById('baseCounterInput').value = data.baseCounter;
            
            showMessage('Total spins counter loaded successfully', 'success');
        } else {
            showMessage(data.error || 'Failed to load total spins counter', 'error');
        }
    } catch (error) {
        console.error('Error loading total spins counter:', error);
        showMessage('Error loading total spins counter', 'error');
    }
}

// Set total counter (adjusts base counter to achieve desired total)
async function setTotalCounter() {
    const totalCounterInput = document.getElementById('totalCounterInput');
    const totalCounter = parseInt(totalCounterInput.value);
    
    if (isNaN(totalCounter) || totalCounter < 0) {
        showMessage('Please enter a valid non-negative number for total counter', 'error');
        return;
    }
    
    if (!confirm(`Set total counter to ${totalCounter.toLocaleString()}? This will adjust the base counter automatically.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/set-total-counter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalCounter })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            loadTotalSpinsCounter(); // Refresh the display
        } else {
            showMessage(data.error || 'Failed to set total counter', 'error');
        }
    } catch (error) {
        console.error('Error setting total counter:', error);
        showMessage('Error setting total counter', 'error');
    }
}

// Set base counter directly
async function setBaseCounter() {
    const baseCounterInput = document.getElementById('baseCounterInput');
    const baseCounter = parseInt(baseCounterInput.value);
    
    if (isNaN(baseCounter) || baseCounter < 0) {
        showMessage('Please enter a valid non-negative number for base counter', 'error');
        return;
    }
    
    if (!confirm(`Set base counter to ${baseCounter.toLocaleString()}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/update-base-counter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ baseCounter })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            loadTotalSpinsCounter(); // Refresh the display
        } else {
            showMessage(data.error || 'Failed to set base counter', 'error');
        }
    } catch (error) {
        console.error('Error setting base counter:', error);
        showMessage('Error setting base counter', 'error');
    }
}

// Reset base counter to default (1958)
async function resetBaseCounter() {
    if (!confirm('Reset base counter to default value (1958)? This will change the displayed total counter.')) {
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/reset-base-counter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            loadTotalSpinsCounter(); // Refresh the display
        } else {
            showMessage(data.error || 'Failed to reset base counter', 'error');
        }
    } catch (error) {
        console.error('Error resetting base counter:', error);
        showMessage('Error resetting base counter', 'error');
    }
}