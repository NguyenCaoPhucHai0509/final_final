document.addEventListener('DOMContentLoaded', async function() {
    // Kiểm tra xác thực và vai trò
    if (!checkAuth()) return;
    
    // Kiểm tra nếu người dùng không phải owner
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (userData.role !== 'owner') {
        showAlert('Bạn không có quyền truy cập trang này', 'danger');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Lấy dữ liệu thống kê
    try {
        // Lấy danh sách chi nhánh
        const branchesResponse = await fetch('http://localhost:8002/branches', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (branchesResponse.ok) {
            const branches = await branchesResponse.json();
            document.getElementById('branch-count').textContent = branches.length;
            
            // Lấy đơn hàng mới nhất từ chi nhánh đầu tiên
            if (branches.length > 0) {
                const branchId = branches[0].id;
                
                // Lấy thực đơn
                const menuResponse = await fetch(`http://localhost:8002/branches/${branchId}/menu-items`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    }
                });
                
                if (menuResponse.ok) {
                    const menuItems = await menuResponse.json();
                    document.getElementById('menu-count').textContent = menuItems.length;
                }
                
                // Lấy đơn hàng
                const ordersResponse = await fetch(`http://localhost:8003/orders/branches/${branchId}`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    }
                });
                
                if (ordersResponse.ok) {
                    const orders = await ordersResponse.json();
                    
                    // Đếm đơn hàng hôm nay
                    const today = new Date().toISOString().split('T')[0];
                    const todayOrders = orders.filter(order => order.created_at.startsWith(today));
                    document.getElementById('today-orders').textContent = todayOrders.length;
                    
                    // Hiển thị đơn hàng mới nhất
                    displayRecentOrders(orders, branches);
                    
                    // Tính doanh thu (giả định, vì chúng ta không có dữ liệu thanh toán thực tế ở đây)
                    document.getElementById('today-revenue').textContent = formatCurrency(todayOrders.length * 150000);
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Lỗi khi tải dữ liệu', 'danger');
    }
    
    // Hiển thị đơn hàng mới nhất
    function displayRecentOrders(orders, branches) {
        const recentOrdersElement = document.getElementById('recent-orders');
        
        if (orders.length === 0) {
            recentOrdersElement.innerHTML = '<tr><td colspan="6" class="text-center">Không có đơn hàng nào</td></tr>';
            return;
        }
        
        // Sắp xếp đơn hàng theo thời gian tạo (mới nhất lên đầu)
        orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Lấy 10 đơn hàng mới nhất
        const recentOrders = orders.slice(0, 10);
        
        let ordersHTML = '';
        recentOrders.forEach(order => {
            const orderDate = new Date(order.created_at).toLocaleString('vi-VN');
            const branch = branches.find(b => b.id === order.branch_id);
            const branchName = branch ? branch.name : 'Không xác định';
            
            // Hiển thị trạng thái
            let statusText = '';
            let statusClass = '';
            switch (order.status) {
                case 'pending':
                    statusText = 'Chờ xử lý';
                    statusClass = 'bg-warning';
                    break;
                case 'preparing':
                    statusText = 'Đang chuẩn bị';
                    statusClass = 'bg-info';
                    break;
                case 'ready_for_delivery':
                    statusText = 'Sẵn sàng giao hàng';
                    statusClass = 'bg-success';
                    break;
                case 'canceled':
                    statusText = 'Đã hủy';
                    statusClass = 'bg-danger';
                    break;
                default:
                    statusText = 'Không xác định';
                    statusClass = 'bg-secondary';
            }
            
            ordersHTML += `
                <tr>
                    <td>#${order.id}</td>
                    <td>${branchName}</td>
                    <td>${orderDate}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${formatCurrency(150000)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewOrderDetail(${order.id})">
                            <i class="bi bi-eye"></i> Chi tiết
                        </button>
                    </td>
                </tr>
            `;
        });
        
        recentOrdersElement.innerHTML = ordersHTML;
    }
    
    // Định dạng tiền tệ (VND)
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
    
    // Hiển thị chi tiết đơn hàng (sẽ được implement sau)
    window.viewOrderDetail = function(orderId) {
        alert('Chức năng xem chi tiết đơn hàng #' + orderId + ' đang được phát triển');
    };
});