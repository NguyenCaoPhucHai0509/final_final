document.addEventListener('DOMContentLoaded', async function() {
    // Kiểm tra xác thực
    if (!checkAuth()) return;
    
    const paymentContainer = document.getElementById('payment-container');
    
    // Lấy order_id từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    
    if (!orderId) {
        showAlert('Không tìm thấy thông tin đơn hàng', 'danger');
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 2000);
        return;
    }
    
    try {
        // Thử lấy thông tin thanh toán
        const response = await fetch(`http://localhost:8005/payments/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        // Nếu thành công, hiển thị thông tin thanh toán
        if (response.ok) {
            const paymentData = await response.json();
            displayPaymentInfo(paymentData);
        } else {
            // Nếu không tìm thấy thông tin thanh toán, có thể đang được xử lý
            showAlert('Đơn hàng của bạn đang được xử lý. Vui lòng đợi trong giây lát...', 'info');
            
            // Thử lại sau 3 giây
            setTimeout(checkPaymentStatus, 3000);
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Lỗi kết nối đến máy chủ', 'danger');
    }
    
    // Kiểm tra trạng thái thanh toán
    async function checkPaymentStatus() {
        try {
            const response = await fetch(`http://localhost:8005/payments/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (response.ok) {
                const paymentData = await response.json();
                displayPaymentInfo(paymentData);
            } else {
                // Vẫn chưa có thông tin thanh toán, thử lại sau 3 giây nữa
                setTimeout(checkPaymentStatus, 3000);
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
        }
    }
    
    // Hiển thị thông tin thanh toán
    function displayPaymentInfo(payment) {
        // Nếu đã thanh toán, hiển thị thông báo và chuyển hướng
        if (payment.status === 'completed') {
            paymentContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
                    <h4 class="mt-3">Đơn hàng đã được thanh toán</h4>
                    <p class="mt-2">Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đang được xử lý.</p>
                    <a href="orders.html" class="btn btn-primary mt-3">Xem đơn hàng của tôi</a>
                </div>
            `;
            return;
        }
        
        // Hiển thị form thanh toán
        paymentContainer.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5>Chi tiết đơn hàng #${payment.order_id}</h5>
                </div>
                <div class="col-md-6 text-md-end">
                    <span class="badge ${payment.status === 'pending' ? 'bg-warning' : payment.status === 'completed' ? 'bg-success' : 'bg-danger'}">
                        ${payment.status === 'pending' ? 'Chờ thanh toán' : payment.status === 'completed' ? 'Đã thanh toán' : 'Thanh toán thất bại'}
                    </span>
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-12">
                    <div class="table-responsive">
                        <table class="table">
                            <tbody>
                                <tr>
                                    <td>Tổng tiền hàng:</td>
                                    <td class="text-end">${formatCurrency(payment.order_total_amount)}</td>
                                </tr>
                                <tr>
                                    <td>Phí giao hàng:</td>
                                    <td class="text-end">${formatCurrency(payment.shipping_fee)}</td>
                                </tr>
                                <tr>
                                    <td class="fw-bold">Tổng thanh toán:</td>
                                    <td class="text-end fw-bold">${formatCurrency(payment.final_amount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <form id="payment-form">
                <div class="mb-3">
                    <label class="form-label">Chọn phương thức thanh toán</label>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="payment_method" id="cash" value="cash" checked>
                        <label class="form-check-label" for="cash">
                            <i class="bi bi-cash"></i> Thanh toán khi nhận hàng
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="payment_method" id="credit_card" value="credit_card">
                        <label class="form-check-label" for="credit_card">
                            <i class="bi bi-credit-card"></i> Thẻ tín dụng/ghi nợ
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="payment_method" id="e_wallet" value="e_wallet">
                        <label class="form-check-label" for="e_wallet">
                            <i class="bi bi-wallet2"></i> Ví điện tử
                        </label>
                    </div>
                </div>
                
                <div class="d-grid gap-2">
                    <button type="submit" class="btn btn-primary" id="pay-button">Xác nhận thanh toán</button>
                </div>
            </form>
        `;
        
        // Xử lý submit form thanh toán
        document.getElementById('payment-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
            const payButton = document.getElementById('pay-button');
            
            try {
                payButton.disabled = true;
                payButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';
                
                // Gửi yêu cầu thanh toán
                const response = await fetch(`http://localhost:8005/payments/${orderId}/pay`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        payment_method: paymentMethod
                    })
                });
                
                if (response.ok) {
                    const updatedPayment = await response.json();
                    
                    // Hiển thị thông báo thành công
                    showAlert('Thanh toán thành công!', 'success');
                    
                    // Hiển thị trang xác nhận
                    paymentContainer.innerHTML = `
                        <div class="text-center py-5">
                            <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
                            <h4 class="mt-3">Thanh toán thành công</h4>
                            <p class="mt-2">Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đang được xử lý.</p>
                            <a href="orders.html" class="btn btn-primary mt-3">Xem đơn hàng của tôi</a>
                        </div>
                    `;
                } else {
                    const errorData = await response.json();
                    showAlert('Thanh toán thất bại: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
                    payButton.disabled = false;
                    payButton.textContent = 'Xác nhận thanh toán';
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('Lỗi kết nối đến máy chủ', 'danger');
                payButton.disabled = false;
                payButton.textContent = 'Xác nhận thanh toán';
            }
        });
    }
    
    // Định dạng tiền tệ (VND)
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
});