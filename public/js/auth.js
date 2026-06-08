document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('email');
    const emailCheckSpan = document.getElementById('emailCheck');
    if (emailInput && emailCheckSpan) {
        let typingTimer;
        emailInput.addEventListener('input', function() {
            clearTimeout(typingTimer);
            const email = this.value.trim();
            if (email.length < 5) { emailCheckSpan.textContent = ''; emailCheckSpan.className = 'field-hint'; return; }
            typingTimer = setTimeout(async function() {
                try {
                    const response = await fetch('/api/check-email?email=' + encodeURIComponent(email));
                    const data = await response.json();
                    if (!data.valid) { emailCheckSpan.textContent = '❌ Please enter a valid email address'; emailCheckSpan.className = 'field-hint error'; }
                    else if (data.exists) { emailCheckSpan.textContent = '❌ This email is already registered'; emailCheckSpan.className = 'field-hint error'; }
                    else { emailCheckSpan.textContent = '✅ Email is available!'; emailCheckSpan.className = 'field-hint success'; }
                } catch (err) { emailCheckSpan.textContent = ''; }
            }, 500);
        });
    }
    const passwordInput = document.getElementById('password');
    const strengthSpan = document.getElementById('passwordStrength');
    if (passwordInput && strengthSpan) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = '', className = '';
            if (password.length === 0) { strength = ''; className = 'field-hint'; }
            else if (password.length < 6) { strength = '❌ Password must be at least 6 characters'; className = 'field-hint error'; }
            else if (password.length < 10) { strength = '⚠️ Weak - add more characters'; className = 'field-hint warning'; }
            else if (password.length < 14) { strength = '👍 Medium - good password'; className = 'field-hint success'; }
            else { strength = '✅ Strong - excellent password!'; className = 'field-hint success'; }
            strengthSpan.textContent = strength;
            strengthSpan.className = className;
        });
    }
    const confirmInput = document.getElementById('confirmPassword');
    const confirmSpan = document.getElementById('confirmMatch');
    if (passwordInput && confirmInput && confirmSpan) {
        function checkConfirm() {
            if (confirmInput.value.length === 0) { confirmSpan.textContent = ''; confirmSpan.className = 'field-hint'; }
            else if (passwordInput.value === confirmInput.value) { confirmSpan.textContent = '✅ Passwords match'; confirmSpan.className = 'field-hint success'; }
            else { confirmSpan.textContent = '❌ Passwords do not match'; confirmSpan.className = 'field-hint error'; }
        }
        passwordInput.addEventListener('input', checkConfirm);
        confirmInput.addEventListener('input', checkConfirm);
    }
});
