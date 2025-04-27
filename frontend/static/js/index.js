document.addEventListener('DOMContentLoaded', async function() {
    // Kiểm tra xác thực (được xử lý bởi auth.js)
    if (!checkAuth()) return;
    
    const branchesContainer = document.getElementById('branches-container');
    
    try {
        // Lấy danh sách chi nhánh nhà hàng
        const response = await fetch('http://localhost:8002/branches', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const branches = await response.json();
            displayBranches(branches);
        } else {
            const errorData = await response.json();
            showAlert('Không thể tải danh sách chi nhánh: ' + (errorData.detail || 'Lỗi không xác định'), 'danger');
            branchesContainer.innerHTML = '<div class="col-12 text-center"><p>Không thể tải danh sách chi nhánh</p></div>';
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Lỗi kết nối đến máy chủ', 'danger');
        branchesContainer.innerHTML = '<div class="col-12 text-center"><p>Lỗi kết nối đến máy chủ</p></div>';
    }
    
    function displayBranches(branches) {
        if (branches.length === 0) {
            branchesContainer.innerHTML = '<div class="col-12 text-center"><p>Không có chi nhánh nào</p></div>';
            return;
        }
        
        let branchesHTML = '';
        branches.forEach(branch => {
            branchesHTML += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${branch.name}</h5>
                            <p class="card-text">
                                <i class="bi bi-geo-alt"></i> Vị trí: ${branch.latitude}, ${branch.longitude}
                            </p>
                        </div>
                        <div class="card-footer bg-white border-top-0">
                            <a href="menu.html?branch_id=${branch.id}" class="btn btn-primary btn-sm">Xem thực đơn</a>
                        </div>
                    </div>
                </div>
            `;
        });
        
        branchesContainer.innerHTML = branchesHTML;
    }
});