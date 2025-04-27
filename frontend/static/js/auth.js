// Kiểm tra nếu người dùng đã đăng nhập chưa
function checkAuth() {
    const token = localStorage.getItem('access_token');
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    
    const welcomeUser = document.getElementById('welcomeUser');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    // Nếu không có token hoặc token không hợp lệ, chuyển đến trang đăng nhập
    if (!token) {
        // Hiển thị nút đăng nhập
        if (loginBtn) loginBtn.classList.remove('d-none');
        if (logoutBtn) logoutBtn.classList.add('d-none');
        if (welcomeUser) welcomeUser.classList.add('d-none');
        
        // Nếu không phải trang đăng nhập hoặc đăng ký, chuyển hướng
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'login.html' && currentPage !== 'register.html') {
            window.location.href = 'login.html';
        }
        return false;
    }
    
    // Nếu đã đăng nhập, hiển thị thông tin người dùng và nút đăng xuất
    if (welcomeUser) {
        welcomeUser.textContent = `Xin chào, ${userData.username || 'Người dùng'}`;
        welcomeUser.classList.remove('d-none');
    }
    if (logoutBtn) {
        logoutBtn.classList.remove('d-none');
        logoutBtn.addEventListener('click', logout);
    }
    if (loginBtn) {
        loginBtn.classList.add('d-none');
    }
    
    return true;
}

// Đăng xuất
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    window.location.href = 'login.html';
}

// Hàm hiển thị thông báo
function showAlert(message, type, containerId = 'alert-container') {
    const alertContainer = document.getElementById(containerId);
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

// Hàm lấy token JWT
function getToken() {
    return localStorage.getItem('access_token');
}

// Kiểm tra xác thực khi trang được tải
document.addEventListener('DOMContentLoaded', checkAuth);