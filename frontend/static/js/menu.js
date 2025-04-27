document.addEventListener('DOMContentLoaded', async function() {
    // Kiểm tra xác thực
    if (!checkAuth()) return;
    
    const menuContainer = document.getElementById('menu-container');
    const branchNameElement = document.getElementById('branch-name');
    const cartCountElement = document.getElementById('cartCount');
    
    // Lấy branch_id từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const branchId = urlParams.get('branch_id');
    
    if (!branchId) {
        showAlert('Không tìm thấy thông tin chi nhánh', 'danger');
        window.location.href = 'index.html';
        return;
    }
    
    // Cập nhật số lượng giỏ hàng
    updateCartCount();
    
    try {
        // Lấy thông tin chi nhánh
        const branchResponse = await fetch(`http://localhost:8002/branches/${branchId}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (branchResponse.ok) {
            const branchData = await branchResponse.json();
            branchNameElement.textContent = `Thực đơn - ${branchData.name}`;
            
            // Lấy danh sách thực đơn của chi nhánh
            const menuResponse = await fetch(`http://localhost:8002/branches/${branchId}/menu-items`, {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            });
            
            if (menuResponse.ok) {
                const menuItems = await menuResponse.json();
                displayMenuItems(menuItems, branchId);
            } else {
                const errorData = await menuResponse.json();
                showAlert('Không thể tải thực đơn: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
                menuContainer.innerHTML = '<div class="col-12 text-center"><p>Không thể tải thực đơn</p></div>';
            }
        } else {
            showAlert('Không thể tải thông tin chi nhánh', 'danger');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Lỗi kết nối đến máy chủ', 'danger');
        menuContainer.innerHTML = '<div class="col-12 text-center"><p>Lỗi kết nối đến máy chủ</p></div>';
    }
    
    function displayMenuItems(items, branchId) {
        if (items.length === 0) {
            menuContainer.innerHTML = '<div class="col-12 text-center"><p>Không có món ăn nào trong thực đơn</p></div>';
            return;
        }
        
        let menuHTML = '';
        items.forEach(item => {
            menuHTML += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${item.name}</h5>
                            <p class="card-text">${item.description || 'Không có mô tả'}</p>
                            <p class="card-text text-primary fw-bold">${formatCurrency(item.price)}</p>
                        </div>
                        <div class="card-footer bg-white border-top-0">
                            <button class="btn btn-primary btn-sm" onclick="addToCart(${item.id}, '${item.name}', ${item.price}, ${branchId})">
                                <i class="bi bi-cart-plus"></i> Thêm vào giỏ
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        menuContainer.innerHTML = menuHTML;
    }
    
    // Định dạng tiền tệ (VND)
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }
});