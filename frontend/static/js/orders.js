document.addEventListener('DOMContentLoaded', async function() {
    // Kiểm tra xác thực
    if (!checkAuth()) return;
    
    const ordersContainer = document.getElementById('orders-container');
    const orderDetailContent = document.getElementById('orderDetailContent');
    const orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    
    try {
        // Lấy danh sách đơn hàng
        const response = await fetch('http://localhost:8003/orders/me', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const orders = await response.json();
            displayOrders(orders);
        } else {
            const errorData = await response.json();
            showAlert('Không thể tải danh sách đơn hàng: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
            ordersContainer.innerHTML = '<div class="text-center py-5"><p>Không thể tải danh sách đơn hàng</p></div>';
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Lỗi kết nối đến máy chủ', 'danger');
        ordersContainer.innerHTML = '<div class="text-center py-5"><p>Lỗi kết nối đến máy chủ</p></div>';
    }
    
    // Hiển thị danh sách đơn hàng
    function displayOrders(orders) {
        if (orders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-bag" style="font-size: 3rem;"></i>
                    <p class="mt-3">Bạn chưa có đơn hàng nào</p>
                    <a href="index.html" class="btn btn-primary mt-2">Đặt hàng ngay</a>
                </div>
            `;
            return;
        }
        
        // Sắp xếp đơn hàng theo thời gian tạo (mới nhất lên đầu)
        orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        let ordersHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Mã đơn hàng</th>
                            <th>Ngày đặt</th>
                            <th>Trạng thái</th>
                            <th>Số món</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        orders.forEach(order => {
            const orderDate = new Date(order.created_at).toLocaleString('vi-VN');
            const statusText = getStatusText(order.status);
            const statusClass = getStatusClass(order.status);
            
            ordersHTML += `
                <tr>
                    <td>#${order.id}</td>
                    <td>${orderDate}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${order.order_items.length}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewOrderDetail(${order.id})">
                            <i class="bi bi-eye"></i> Chi tiết
                        </button>
                    </td>
                </tr>
            `;
        });
        
        ordersHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        ordersContainer.innerHTML = ordersHTML;
    }
    
    // Hiển thị chi tiết đơn hàng
    window.viewOrderDetail = async function(orderId) {
        orderDetailContent.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
            </div>
        `;
        
        orderDetailModal.show();
        
        try {
            // Lấy thông tin chi tiết đơn hàng
            const response = await fetch(`http://localhost:8003/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (response.ok) {
                const order = await response.json();
                
                // Lấy thông tin thanh toán nếu có
                let paymentHTML = '';
                try {
                    const paymentResponse = await fetch(`http://localhost:8005/payments/${orderId}`, {
                        headers: {
                            'Authorization': `Bearer ${getToken()}`
                        }
                    });
                    
                    if (paymentResponse.ok) {
                        const payment = await paymentResponse.json();
                        
                        const paymentStatus = payment.status === 'pending' ? 'Chờ thanh toán' : 
                                                payment.status === 'completed' ? 'Đã thanh toán' : 'Thanh toán thất bại';
                        const paymentStatusClass = payment.status === 'pending' ? 'bg-warning' : 
                                                payment.status === 'completed' ? 'bg-success' : 'bg-danger';
                        
                        paymentHTML = `
                            <div class="card mb-3">
                                <div class="card-header bg-white">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h5 class="mb-0">Thông tin thanh toán</h5>
                                        <span class="badge ${paymentStatusClass}">${paymentStatus}</span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p><strong>Phương thức:</strong> ${getPaymentMethodText(payment.payment_method || 'Chưa chọn')}</p>
                                        </div>
                                        <div class="col-md-6">
                                            <p><strong>Ngày thanh toán:</strong> ${payment.last_updated_at ? new Date(payment.last_updated_at).toLocaleString('vi-VN') : 'Chưa thanh toán'}</p>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-4">
                                            <p><strong>Tổng tiền hàng:</strong> ${formatCurrency(payment.order_total_amount)}</p>
                                        </div>
                                        <div class="col-md-4">
                                            <p><strong>Phí giao hàng:</strong> ${formatCurrency(payment.shipping_fee)}</p>
                                        </div>
                                        <div class="col-md-4">
                                            <p><strong>Tổng thanh toán:</strong> ${formatCurrency(payment.final_amount)}</p>
                                        </div>
                                    </div>
                                    ${payment.status === 'pending' ? `
                                        <div class="d-grid gap-2 mt-2">
                                            <a href="payment.html?order_id=${orderId}" class="btn btn-primary">Thanh toán ngay</a>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }
                } catch (error) {
                    console.error('Error fetching payment:', error);
                }
                
                // Tạo HTML cho chi tiết đơn hàng
                let orderDetailHTML = `
                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5>Đơn hàng #${order.id}</h5>
                            <span class="badge ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
                        </div>
                        <p><strong>Ngày đặt:</strong> ${new Date(order.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    
                    ${paymentHTML}
                    
                    <div class="card">
                        <div class="card-header bg-white">
                            <h5 class="mb-0">Danh sách món ăn</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Món ăn</th>
                                            <th>Đơn giá</th>
                                            <th>Số lượng</th>
                                            <th>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                `;
                
                // Thêm danh sách món ăn
                let totalAmount = 0;
                order.order_items.forEach(item => {
                    const itemTotal = item.price * item.quantity;
                    totalAmount += itemTotal;
                    
                    orderDetailHTML += `
                        <tr>
                            <td>${item.menu_item_id}</td>
                            <td>${formatCurrency(item.price)}</td>
                            <td>${item.quantity}</td>
                            <td><span class="badge ${getItemStatusClass(item.status)}">${getItemStatusText(item.status)}</span></td>
                        </tr>
                    `;
                });
                
                orderDetailHTML += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                
                orderDetailContent.innerHTML = orderDetailHTML;
                
            } else {
                const errorData = await response.json();
                orderDetailContent.innerHTML = `<div class="alert alert-danger">Không thể tải chi tiết đơn hàng: ${errorData.detail || 'Lỗi không xác định'}</div>`;
            }
        } catch (error) {
            console.error('Error:', error);
            orderDetailContent.innerHTML = `<div class="alert alert-danger">Lỗi kết nối đến máy chủ</div>`;
        }
    };
    
    // Lấy trạng thái đơn hàng dưới dạng text
    function getStatusText(status) {
        switch (status) {
            case 'pending':
                return 'Chờ xử lý';
            case 'preparing':
                return 'Đang chuẩn bị';
            case 'ready_for_delivery':
                return 'Sẵn sàng giao hàng';
            case 'canceled':
                return 'Đã hủy';
            default:
                return 'Không xác định';
        }
    }
    
    // Lấy class hiển thị màu cho trạng thái đơn hàng
    function getStatusClass(status) {
        switch (status) {
            case 'pending':
                return 'bg-warning';
            case 'preparing':
                return 'bg-info';
            case 'ready_for_delivery':
                return 'bg-success';
            case 'canceled':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }
    
    // Lấy trạng thái món ăn dưới dạng text
    function getItemStatusText(status) {
        switch (status) {
            case 'pending':
                return 'Chờ xử lý';
            case 'preparing':
                return 'Đang chuẩn bị';
            case 'ready':
                return 'Hoàn thành';
            default:
                return 'Không xác định';
        }
    }
    
    // Lấy class hiển thị màu cho trạng thái món ăn
    function getItemStatusClass(status) {
        switch (status) {
            case 'pending':
                return 'bg-warning';
            case 'preparing':
                return 'bg-info';
            case 'ready':
                return 'bg-success';
            default:
                return 'bg-secondary';
        }
    }
    
    // Lấy phương thức thanh toán dưới dạng text
    function getPaymentMethodText(method) {
        switch (method) {
            case 'cash':
                return 'Tiền mặt khi nhận hàng';
            case 'credit_card':
                return 'Thẻ tín dụng/ghi nợ';
            case 'e_wallet':
                return 'Ví điện tử';
            default:
                return 'Chưa chọn';
        }
    }
    
    // Định dạng tiền tệ (VND)
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
});