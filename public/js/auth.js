// auth.js - handles client-side validation for login and register forms

document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        const password = document.querySelector('input[name="password"]');
        if (password && password.value.length < 6) {
            e.preventDefault();
            alert('Password must be at least 6 characters.');
        }
    });
});