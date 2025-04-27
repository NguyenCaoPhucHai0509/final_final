document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const alertContainer = document.getElementById('alert-container');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:8001/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'username': username,
                    'password': password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Lưu token vào localStorage
                localStorage.setItem('access_token', data.access_token);
                
                // Lấy thông tin người dùng
                const userResponse = await fetch('http://localhost:8001/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${data.access_token}`
                    }
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    localStorage.setItem('user_data', JSON.stringify(userData));
                    
                    // Chuyển hướng dựa vào vai trò
                    switch(userData.role) {
                        case 'customer':
                            window.location.href = 'index.html';
                            break;
                        case 'owner':
                            window.location.href = 'owner-dashboard.html';
                            break;
                        case 'kitchen_staff':
                            window.location.href = 'kitchen-dashboard.html';
                            break;
                        case 'driver':
                            window.location.href = 'driver-dashboard.html';
                            break;
                        case 'admin':
                            window.location.href = 'admin-dashboard.html';
                            break;
                        default:
                            window.location.href = 'index.html';
                    }
                }
            } else {
                showAlert('Đăng nhập thất bại: ' + (data.detail || 'Vui lòng kiểm tra thông tin đăng nhập'), 'danger');
            }
        } catch (error) {
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
            console.error('Error:', error);
        }
    });

    function showAlert(message, type) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
});