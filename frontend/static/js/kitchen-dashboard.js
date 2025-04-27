document.addEventListener('DOMContentLoaded', async function() {
    // Kiểm tra xác thực và vai trò
    if (!checkAuth()) return;
    
    // Kiểm tra nếu người dùng không phải kitchen_staff
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (userData.role !== 'kitchen_staff') {
        showAlert('Bạn không có quyền truy cập trang này', 'danger');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Lấy thông tin chi nhánh của nhân viên
    let kitchenStaffInfo;
    try {
        const kitchenStaffResponse = await fetch('http://localhost:8001/kitchen-staffs/me', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (kitchenStaffResponse.ok) {
            kitchenStaffInfo = await kitchenStaffResponse.json();
        } else {
            showAlert('Không thể lấy thông tin nhân viên. Vui lòng thử lại sau.', 'danger');
            return;
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Lỗi khi tải thông tin nhân viên', 'danger');
        return;
    }
    
    // Elements
    const pendingOrdersContainer = document.getElementById('pending-orders-container');
    const preparingOrdersContainer = document.getElementById('preparing-orders-container');
    const pendingCountElement = document.getElementById('pending-count');
    const preparingCountElement = document.getElementById('preparing-count');
    
    // Lấy danh sách đơn hàng
    async function loadOrders() {
        try {
            // Lấy danh sách tất cả các món ăn của chi nhánh
            const orderItemsResponse = await fetch(`http://localhost:8003/order-items/branches/${kitchenStaffInfo.branch_id}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (orderItemsResponse.ok) {
                const orderItems = await orderItemsResponse.json();
                
                // Phân loại theo trạng thái
                const pendingItems = orderItems.filter(item => item.status === 'pending');
                const preparingItems = orderItems.filter(item => item.status === 'preparing' && item.kitchen_staff_id === userData.id);
                
                // Cập nhật số lượng
                pendingCountElement.textContent = pendingItems.length;
                preparingCountElement.textContent = preparingItems.length;
                
                // Hiển thị các món ăn
                displayOrderItems(pendingItems, pendingOrdersContainer, 'pending');
                displayOrderItems(preparingItems, preparingOrdersContainer, 'preparing');
            } else {
                const errorData = await orderItemsResponse.json();
                showAlert('Không thể tải danh sách đơn hàng: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
        }
    }
    
    // Hiển thị các món ăn theo trạng thái
    function displayOrderItems(items, container, status) {
        if (items.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-inbox"></i>
                    <p class="mt-2">Không có món ăn nào ${status === 'pending' ? 'đang chờ xử lý' : 'đang chuẩn bị'}</p>
                </div>
            `;
            return;
        }
        
        // Nhóm theo đơn hàng
        const orderGroups = {};
        items.forEach(item => {
            if (!orderGroups[item.order_id]) {
                orderGroups[item.order_id] = [];
            }
            orderGroups[item.order_id].push(item);
        });
        
        let html = '';
        
        // Hiển thị từng đơn hàng
        Object.keys(orderGroups).forEach(orderId => {
            const orderItems = orderGroups[orderId];
            
            html += `
                <div class="card mb-4">
                    <div class="card-header bg-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Đơn hàng #${orderId}</h5>
                            <small>Thời gian: ${new Date(orderItems[0].created_at).toLocaleString('vi-VN')}</small>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Món ăn</th>
                                        <th>Số lượng</th>
                                        <th>Ghi chú</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            // Hiển thị từng món ăn trong đơn hàng
            orderItems.forEach(item => {
                html += `
                    <tr>
                        <td>${item.menu_item_id}</td>
                        <td>${item.quantity}</td>
                        <td>${item.note || 'Không có'}</td>
                        <td>
                `;
                
                if (status === 'pending') {
                    html += `
                        <button class="btn btn-sm btn-primary" onclick="acceptOrderItem(${item.id})">
                            <i class="bi bi-check-circle"></i> Nhận món
                        </button>
                    `;
                } else if (status === 'preparing') {
                    html += `
                        <button class="btn btn-sm btn-success" onclick="markAsReady(${item.id})">
                            <i class="bi bi-check2-all"></i> Hoàn thành
                        </button>
                    `;
                }
                
                html += `
                        </td>
                    </tr>
                `;
            });
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    // Nhận món ăn
    window.acceptOrderItem = async function(itemId) {
        try {
            const response = await fetch(`http://localhost:8003/order-items/${itemId}/accept`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (response.ok) {
                showAlert('Đã nhận món ăn thành công', 'success');
                loadOrders(); // Tải lại danh sách
            } else {
                const errorData = await response.json();
                showAlert('Không thể nhận món ăn: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
        }
    };
    
    // Đánh dấu món ăn đã hoàn thành
    window.markAsReady = async function(itemId) {
        try {
            const response = await fetch(`http://localhost:8003/order-items/${itemId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    status: 'ready'
                })
            });
            
            if (response.ok) {
                showAlert('Đã đánh dấu món ăn là đã hoàn thành', 'success');
                loadOrders(); // Tải lại danh sách
            } else {
                const errorData = await response.json();
                showAlert('Không thể cập nhật trạng thái: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
        }
    };
    
    // Tải danh sách đơn hàng khi trang được tải
    loadOrders();
    
    // Tải lại danh sách định kỳ (mỗi 30 giây)
    setInterval(loadOrders, 30000);
});