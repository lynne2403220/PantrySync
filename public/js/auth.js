(function () {
    const forms = document.querySelectorAll('[data-auth-form]');

    forms.forEach((form) => {
        form.addEventListener('submit', (event) => {
            const email = form.querySelector('input[type="email"]');
            const password = form.querySelector('input[name="password"]');
            const username = form.querySelector('input[name="username"]');

            if (username && username.value.trim().length < 2) {
                event.preventDefault();
                username.setCustomValidity('Username must be at least 2 characters.');
                username.reportValidity();
                return;
            }

            if (email && !email.validity.valid) {
                event.preventDefault();
                email.reportValidity();
                return;
            }

            if (password && password.value.length < 6 && form.hasAttribute('data-register-form')) {
                event.preventDefault();
                password.setCustomValidity('Password must be at least 6 characters.');
                password.reportValidity();
            }
        });
    });

    document.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', () => input.setCustomValidity(''));
    });

    const registerForm = document.querySelector('[data-register-form]');
    if (!registerForm) return;

    const email = registerForm.querySelector('input[name="email"]');
    const note = registerForm.querySelector('[data-email-note]');
    let timer = null;

    email.addEventListener('input', () => {
        clearTimeout(timer);
        note.textContent = '';
        if (!email.validity.valid) return;

        timer = setTimeout(async () => {
            try {
                const response = await fetch(`/api/check-email?email=${encodeURIComponent(email.value)}`);
                const result = await response.json();
                note.textContent = result.available ? 'Email is available.' : 'Email is already registered.';
                note.className = result.available ? 'field-note available' : 'field-note taken';
            } catch (err) {
                note.textContent = '';
            }
        }, 250);
    });
})();
