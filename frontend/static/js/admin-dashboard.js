document.addEventListener('DOMContentLoaded', async function() {
    // Kiểm tra xác thực và vai trò
    if (!checkAuth()) return;
    
    // Kiểm tra nếu người dùng không phải admin
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (userData.role !== 'admin') {
        showAlert('Bạn không có quyền truy cập trang này', 'danger');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Elements
    const userCountElement = document.getElementById('user-count');
    const newUserCountElement = document.getElementById('new-user-count');
    const restaurantCountElement = document.getElementById('restaurant-count');
    const pendingCountElement = document.getElementById('pending-count');
    const pendingUsersContainer = document.getElementById('pending-users-container');
    
    // Lấy danh sách người dùng
    async function loadUsers() {
        try {
            const response = await fetch('http://localhost:8001/users/', {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (response.ok) {
                const users = await response.json();
                
                // Cập nhật thống kê
                userCountElement.textContent = users.length;
                
                // Đếm người dùng mới (ví dụ: đăng ký trong 1 tuần qua)
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                
                // Giả định: Chúng ta không có trường created_at trong API, nên sẽ đặt giá trị cứng
                newUserCountElement.textContent = '5';
                
                // Đếm người dùng chờ kích hoạt
                const pendingUsers = users.filter(user => !user.is_active);
                pendingCountElement.textContent = pendingUsers.length;
                
                // Hiển thị danh sách người dùng chờ kích hoạt
                displayPendingUsers(pendingUsers);
                
                // Giả định: Đặt số lượng nhà hàng
                restaurantCountElement.textContent = '3';
            } else {
                const errorData = await response.json();
                showAlert('Không thể tải danh sách người dùng: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
                pendingUsersContainer.innerHTML = '<div class="text-center py-5"><p>Không thể tải danh sách người dùng</p></div>';
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
            pendingUsersContainer.innerHTML = '<div class="text-center py-5"><p>Lỗi kết nối đến máy chủ</p></div>';
        }
    }
    
    // Hiển thị danh sách người dùng chờ kích hoạt
    function displayPendingUsers(users) {
        if (users.length === 0) {
            pendingUsersContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-check-circle" style="font-size: 3rem; color: #28a745;"></i>
                    <p class="mt-3">Không có tài khoản nào đang chờ kích hoạt</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên đăng nhập</th>
                            <th>Email</th>
                            <th>Vai trò</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        users.forEach(user => {
            html += `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="badge bg-secondary">${user.role}</span></td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="activateUser(${user.id})">
                            <i class="bi bi-check"></i> Kích hoạt
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        pendingUsersContainer.innerHTML = html;
    }
    
    // Kích hoạt người dùng
    window.activateUser = async function(userId) {
        try {
            const response = await fetch(`http://localhost:8001/users/${userId}/active`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (response.ok) {
                showAlert('Đã kích hoạt tài khoản thành công', 'success');
                loadUsers(); // Tải lại danh sách
            } else {
                const errorData = await response.json();
                showAlert('Không thể kích hoạt tài khoản: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
        }
    };
    
    // Tải danh sách người dùng khi trang được tải
    loadUsers();
});