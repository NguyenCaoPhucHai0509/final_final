 document.addEventListener('DOMContentLoaded', async function() {
    // Kiểm tra xác thực
    if (!checkAuth()) return;
    
    const cartItemsContainer = document.getElementById('cart-items');
    const subtotalElement = document.getElementById('subtotal');
    const checkoutBtn = document.getElementById('checkout-btn');
    const deliveryForm = document.getElementById('delivery-form');
    const searchAddressBtn = document.getElementById('searchAddressBtn');
    const addressInput = document.getElementById('address');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    
    // Khởi tạo bản đồ
    const map = L.map('map').setView([10.8231, 106.6297], 13); // Mặc định là TP.HCM
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    let marker;
    
    // Sự kiện khi click vào bản đồ
    map.on('click', function(e) {
        setMarkerPosition(e.latlng.lat, e.latlng.lng);
        // Thử reverse geocoding để lấy địa chỉ từ tọa độ
        reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
    
    // Tìm kiếm địa chỉ khi nhấn nút tìm kiếm
    searchAddressBtn.addEventListener('click', function() {
        const address = addressInput.value.trim();
        if (address) {
            geocodeAddress(address);
        } else {
            showAlert('Vui lòng nhập địa chỉ để tìm kiếm', 'warning');
        }
    });
    
    // Tìm kiếm địa chỉ từ văn bản
    async function geocodeAddress(address) {
        try {
            // Thêm "Việt Nam" vào cuối địa chỉ nếu chưa có
            let searchAddress = address;
            if (!address.toLowerCase().includes('việt nam') && !address.toLowerCase().includes('vietnam')) {
                searchAddress = address + ', Việt Nam';
            }
            
            // Tìm kiếm với tham số quốc gia và giới hạn kết quả trong Việt Nam
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&countrycodes=vn&limit=1&accept-language=vi`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                
                // Cập nhật bản đồ
                map.setView([lat, lon], 16); // Zoom gần hơn
                setMarkerPosition(lat, lon);
                
                // Hiển thị kết quả tìm kiếm
                showAlert(`Đã tìm thấy: ${data[0].display_name}`, 'success');
            } else {
                showAlert('Không tìm thấy địa chỉ này. Vui lòng thử lại với địa chỉ chi tiết hơn.', 'warning');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            showAlert('Lỗi khi tìm kiếm địa chỉ', 'danger');
        }
    }
    
    // Lấy địa chỉ từ tọa độ
    async function reverseGeocode(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&accept-language=vi`);
            const data = await response.json();
            
            if (data && data.display_name) {
                addressInput.value = data.display_name;
                
                // Lưu thông tin địa chỉ chi tiết vào dữ liệu người dùng nếu cần
                if (data.address) {
                    const addressDetail = {
                        street: data.address.road || data.address.pedestrian || '',
                        ward: data.address.suburb || '',
                        district: data.address.city_district || data.address.county || '',
                        city: data.address.city || data.address.town || data.address.state || '',
                        country: data.address.country || 'Việt Nam'
                    };
                    console.log('Thông tin địa chỉ chi tiết:', addressDetail);
                }
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
    }
    
    // Đặt vị trí marker
    function setMarkerPosition(lat, lng) {
        latitudeInput.value = lat.toFixed(6);
        longitudeInput.value = lng.toFixed(6);
        
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng]).addTo(map);
        }
    }
    
    // Hiển thị giỏ hàng
    function displayCart() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-cart" style="font-size: 3rem;"></i>
                    <p class="mt-3">Giỏ hàng của bạn đang trống</p>
                    <a href="index.html" class="btn btn-primary mt-2">Tiếp tục mua sắm</a>
                </div>
            `;
            checkoutBtn.disabled = true;
            return;
        }
        
        let cartHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Món ăn</th>
                        <th>Đơn giá</th>
                        <th>Số lượng</th>
                        <th>Thành tiền</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        cart.forEach(item => {
            cartHTML += `
                <tr>
                    <td>${item.name}</td>
                    <td>${formatCurrency(item.price)}</td>
                    <td>
                        <div class="input-group input-group-sm" style="width: 120px;">
                            <button class="btn btn-outline-secondary" type="button" onclick="updateCartItemQuantity(${item.id}, ${item.quantity - 1})">-</button>
                            <input type="text" class="form-control text-center" value="${item.quantity}" readonly>
                            <button class="btn btn-outline-secondary" type="button" onclick="updateCartItemQuantity(${item.id}, ${item.quantity + 1})">+</button>
                        </div>
                    </td>
                    <td>${formatCurrency(item.price * item.quantity)}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="removeCartItem(${item.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        cartHTML += `
                </tbody>
            </table>
            <div class="d-flex justify-content-end">
                <button class="btn btn-outline-danger" onclick="clearCartAndReload()">
                    <i class="bi bi-trash"></i> Xóa giỏ hàng
                </button>
            </div>
        `;
        
        cartItemsContainer.innerHTML = cartHTML;
        
        // Cập nhật tổng tiền
        const total = calculateCartTotal();
        subtotalElement.textContent = formatCurrency(total);
    }
    
    // Xóa một món ăn khỏi giỏ hàng và cập nhật giao diện
    window.removeCartItem = function(itemId) {
        removeFromCart(itemId);
        displayCart();
    };
    
    // Xóa toàn bộ giỏ hàng và tải lại trang
    window.clearCartAndReload = function() {
        if (confirm('Bạn có chắc chắn muốn xóa tất cả món ăn trong giỏ hàng?')) {
            clearCart();
            window.location.reload();
        }
    };
    
    // Xử lý khi người dùng nhấn nút đặt hàng
    deliveryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        if (cart.length === 0) {
            showAlert('Giỏ hàng của bạn đang trống', 'warning');
            return;
        }
        
        const latitude = latitudeInput.value;
        const longitude = longitudeInput.value;
        
        if (!latitude || !longitude) {
            showAlert('Vui lòng chọn địa điểm giao hàng trên bản đồ', 'warning');
            return;
        }
        
        // Lấy branch_id từ món ăn đầu tiên trong giỏ hàng
        const branchId = cart[0].branchId;
        
        // Chuẩn bị dữ liệu đơn hàng
        const orderData = {
            branch_id: branchId,
            items: cart.map(item => ({
                menu_item_id: item.id,
                quantity: item.quantity,
                note: null
            })),
            dropoff_lat: parseFloat(latitude),
            dropoff_lon: parseFloat(longitude)
        };
        
        try {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';
            
            // Gửi yêu cầu tạo đơn hàng
            const response = await fetch('http://localhost:8003/orders/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                const orderData = await response.json();
                
                // Xóa giỏ hàng sau khi đặt hàng thành công
                clearCart();
                
                // Hiển thị thông báo thành công
                showAlert('Đặt hàng thành công! Đang chuyển hướng đến trang thanh toán...', 'success');
                
                // Chuyển hướng đến trang thanh toán
                setTimeout(() => {
                    window.location.href = `payment.html?order_id=${orderData.id}`;
                }, 2000);
            } else {
                const errorData = await response.json();
                showAlert('Đặt hàng thất bại: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = 'Đặt hàng';
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Đặt hàng';
        }
    });
    
    // Định dạng tiền tệ (VND)
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
    
    // Hiển thị giỏ hàng khi trang được tải
    displayCart();
});