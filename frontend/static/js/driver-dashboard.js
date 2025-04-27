document.addEventListener('DOMContentLoaded', async function() {
    // Kiểm tra xác thực và vai trò
    if (!checkAuth()) return;
    
    // Kiểm tra nếu người dùng không phải driver
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (userData.role !== 'driver') {
        showAlert('Bạn không có quyền truy cập trang này', 'danger');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Elements
    const deliveryRequestsContainer = document.getElementById('delivery-requests-container');
    const deliveryDetailContent = document.getElementById('deliveryDetailContent');
    const acceptDeliveryBtn = document.getElementById('acceptDeliveryBtn');
    const deliveryDetailModal = new bootstrap.Modal(document.getElementById('deliveryDetailModal'));
    
    // Khởi tạo bản đồ
    const map = L.map('map').setView([10.8231, 106.6297], 13); // Mặc định là TP.HCM
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Lưu trữ markers trên bản đồ
    const markers = {};
    
    // Lấy danh sách đơn hàng sẵn sàng giao
    async function loadDeliveryRequests() {
        try {
            const response = await fetch('http://localhost:8004/delivery-requests/?is_active=true', {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (response.ok) {
                const deliveryRequests = await response.json();
                displayDeliveryRequests(deliveryRequests);
                updateMap(deliveryRequests);
            } else {
                const errorData = await response.json();
                showAlert('Không thể tải danh sách đơn hàng: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
                deliveryRequestsContainer.innerHTML = '<div class="text-center py-5"><p>Không thể tải danh sách đơn hàng</p></div>';
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
            deliveryRequestsContainer.innerHTML = '<div class="text-center py-5"><p>Lỗi kết nối đến máy chủ</p></div>';
        }
    }
    
    // Hiển thị danh sách đơn hàng sẵn sàng giao
    function displayDeliveryRequests(requests) {
        if (requests.length === 0) {
            deliveryRequestsContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-inbox" style="font-size: 3rem;"></i>
                    <p class="mt-3">Không có đơn hàng nào sẵn sàng để giao</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Mã đơn hàng</th>
                            <th>Chi nhánh</th>
                            <th>Khoảng cách</th>
                            <th>Phí giao hàng</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        requests.forEach(request => {
            html += `
                <tr>
                    <td>#${request.order_id}</td>
                    <td>Chi nhánh #${request.branch_id}</td>
                    <td>${request.distance_km.toFixed(1)} km</td>
                    <td>${formatCurrency(request.shipping_fee)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewDeliveryDetail(${request.order_id})">
                            <i class="bi bi-eye"></i> Chi tiết
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
        
        deliveryRequestsContainer.innerHTML = html;
    }
    
    // Cập nhật bản đồ với các đơn hàng
    function updateMap(requests) {
        // Xóa tất cả markers hiện tại
        Object.values(markers).forEach(marker => {
            map.removeLayer(marker);
        });
        
        // Thêm marker mới cho mỗi đơn hàng
        requests.forEach(request => {
            const marker = L.marker([request.dropoff_lat, request.dropoff_lon])
                .addTo(map)
                .bindPopup(`
                    <b>Đơn hàng #${request.order_id}</b><br>
                    Khoảng cách: ${request.distance_km.toFixed(1)} km<br>
                    Phí giao hàng: ${formatCurrency(request.shipping_fee)}<br>
                    <button class="btn btn-sm btn-primary mt-2" onclick="viewDeliveryDetail(${request.order_id})">
                        Chi tiết
                    </button>
                `);
            
            markers[request.order_id] = marker;
        });
        
        // Nếu có ít nhất 1 đơn hàng, điều chỉnh bản đồ để hiển thị tất cả
        if (requests.length > 0) {
            const bounds = Object.values(markers).map(marker => marker.getLatLng());
            map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
        }
    }
    
    // Hiển thị chi tiết đơn hàng
    window.viewDeliveryDetail = async function(orderId) {
        deliveryDetailContent.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
            </div>
        `;
        
        // Lưu ID đơn hàng hiện tại
        currentOrderId = orderId;
        
        // Hiển thị modal
        deliveryDetailModal.show();
        
        try {
            // Lấy thông tin chi tiết giao hàng
            const deliveryResponse = await fetch(`http://localhost:8004/delivery-requests/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            // Lấy thông tin đơn hàng
            const orderResponse = await fetch(`http://localhost:8003/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (deliveryResponse.ok && orderResponse.ok) {
                const deliveryData = await deliveryResponse.json();
                const orderData = await orderResponse.json();
                
                // Lấy thông tin chi nhánh
                const branchResponse = await fetch(`http://localhost:8002/branches/${deliveryData.branch_id}`, {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    }
                });
                
                let branchName = `Chi nhánh #${deliveryData.branch_id}`;
                if (branchResponse.ok) {
                    const branchData = await branchResponse.json();
                    branchName = branchData.name;
                }
                
                // Hiển thị chi tiết
                deliveryDetailContent.innerHTML = `
                    <div class="mb-3">
                        <h5>Thông tin đơn hàng #${orderId}</h5>
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Chi nhánh:</strong> ${branchName}</p>
                                <p><strong>Thời gian đặt:</strong> ${new Date(orderData.created_at).toLocaleString('vi-VN')}</p>
                                <p><strong>Khoảng cách:</strong> ${deliveryData.distance_km.toFixed(1)} km</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Phí giao hàng:</strong> ${formatCurrency(deliveryData.shipping_fee)}</p>
                                <p><strong>Vị trí giao hàng:</strong> ${deliveryData.dropoff_lat}, ${deliveryData.dropoff_lon}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <h5>Danh sách món ăn</h5>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Món ăn</th>
                                        <th>Số lượng</th>
                                        <th>Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                orderData.order_items.forEach(item => {
                    deliveryDetailContent.innerHTML += `
                        <tr>
                            <td>${item.menu_item_id}</td>
                            <td>${item.quantity}</td>
                            <td>${item.note || 'Không có'}</td>
                        </tr>
                    `;
                });
                
                deliveryDetailContent.innerHTML += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i> Nhấn "Nhận đơn giao hàng" để bắt đầu giao đơn hàng này.
                        </div>
                    </div>
                `;
                
                // Hiển thị nút nhận đơn
                acceptDeliveryBtn.style.display = 'block';
            } else {
                const errorMessage = deliveryResponse.ok ? 
                    'Không thể tải thông tin đơn hàng' : 
                    'Không thể tải thông tin giao hàng';
                
                deliveryDetailContent.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${errorMessage}
                    </div>
                `;
                
                // Ẩn nút nhận đơn
                acceptDeliveryBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error:', error);
            deliveryDetailContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Lỗi kết nối đến máy chủ
                </div>
            `;
            
            // Ẩn nút nhận đơn
            acceptDeliveryBtn.style.display = 'none';
        }
    };
    
    // Biến lưu ID đơn hàng hiện tại đang xem
    let currentOrderId = null;
    
    // Xử lý sự kiện khi nhấn nút nhận đơn
    acceptDeliveryBtn.addEventListener('click', async function() {
        if (!currentOrderId) return;
        
        try {
            const response = await fetch(`http://localhost:8004/delivery-requests/${currentOrderId}/accept`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (response.ok) {
                showAlert('Đã nhận đơn hàng thành công', 'success');
                deliveryDetailModal.hide();
                
                // Chuyển đến trang đơn hàng đang giao
                setTimeout(() => {
                    window.location.href = 'driver-active.html';
                }, 1500);
            } else {
                const errorData = await response.json();
                showAlert('Không thể nhận đơn hàng: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
        }
    });
    
    // Định dạng tiền tệ (VND)
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
    
    // Tải danh sách đơn hàng khi trang được tải
    loadDeliveryRequests();
    
    // Tải lại danh sách định kỳ (mỗi 30 giây)
    setInterval(loadDeliveryRequests, 30000);
});