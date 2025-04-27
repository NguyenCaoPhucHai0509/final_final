document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const alertContainer = document.getElementById('alert-container');

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        try {
            const response = await fetch('http://localhost:8001/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    username: username,
                    password: password,
                    role: role
                })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert('Đăng ký thành công! Tài khoản của bạn đang chờ phê duyệt.', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showAlert('Đăng ký thất bại: ' + (data.detail || 'Vui lòng kiểm tra lại thông tin'), 'danger');
            }
        } catch (error) {
            showAlert('Lỗi kết nối đến máy chủ', 'danger');
            console.error('Error:', error);
        }
    });

    function showAlert(message, type) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
});