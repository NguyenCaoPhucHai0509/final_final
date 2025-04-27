// Khởi tạo giỏ hàng trong localStorage nếu chưa có
function initCart() {
    if (!localStorage.getItem('cart')) {
        localStorage.setItem('cart', JSON.stringify([]));
    }
}

// Thêm món ăn vào giỏ hàng
function addToCart(itemId, itemName, price, branchId) {
    initCart();
    
    let cart = JSON.parse(localStorage.getItem('cart'));
    const existingBranch = cart.findIndex(item => item.branchId && item.branchId !== branchId);
    
    // Kiểm tra nếu đang có món ăn từ chi nhánh khác
    if (existingBranch !== -1 && cart.length > 0) {
        if (confirm('Giỏ hàng của bạn hiện có món ăn từ một chi nhánh khác. Thêm món ăn mới sẽ xóa những món đã có. Bạn có muốn tiếp tục không?')) {
            cart = [];
        } else {
            return;
        }
    }
    
    // Tìm món ăn trong giỏ hàng
    const existingItemIndex = cart.findIndex(item => item.id === itemId);
    
    if (existingItemIndex !== -1) {
        // Nếu món ăn đã có, tăng số lượng
        cart[existingItemIndex].quantity += 1;
    } else {
        // Nếu món ăn chưa có, thêm mới
        cart.push({
            id: itemId,
            name: itemName,
            price: price,
            quantity: 1,
            branchId: branchId
        });
    }
    
    // Lưu giỏ hàng vào localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Cập nhật số lượng hiển thị
    updateCartCount();
    
    // Hiển thị thông báo
    showAlert(`Đã thêm "${itemName}" vào giỏ hàng`, 'success');
}

// Xóa món ăn khỏi giỏ hàng
function removeFromCart(itemId) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart = cart.filter(item => item.id !== itemId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    return cart;
}

// Cập nhật số lượng món ăn trong giỏ hàng
function updateCartItemQuantity(itemId, quantity) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemIndex = cart.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        if (quantity <= 0) {
            // Nếu số lượng <= 0, xóa món ăn
            cart = removeFromCart(itemId);
        } else {
            // Cập nhật số lượng
            cart[itemIndex].quantity = quantity;
            localStorage.setItem('cart', JSON.stringify(cart));
        }
    }
    
    updateCartCount();
    return cart;
}

// Cập nhật số lượng hiển thị trên icon giỏ hàng
function updateCartCount() {
    const cartCountElement = document.getElementById('cartCount');
    if (!cartCountElement) return;
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    
    cartCountElement.textContent = itemCount;
}

// Tính tổng tiền giỏ hàng
function calculateCartTotal() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Xóa hết giỏ hàng
function clearCart() {
    localStorage.setItem('cart', JSON.stringify([]));
    updateCartCount();
}

// Khởi tạo giỏ hàng khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    initCart();
    updateCartCount();
});