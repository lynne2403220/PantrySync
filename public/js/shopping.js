(function () {
    function validateNumber(input, label) {
        if (!input || input.value === '') return true;
        if (Number(input.value) >= 0) return true;
        input.setCustomValidity(`${label} cannot be negative.`);
        input.reportValidity();
        return false;
    }

    document.querySelectorAll('[data-shopping-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            const name = form.querySelector('input[name="name"]');
            const quantity = form.querySelector('input[name="quantity"]');
            const price = form.querySelector('input[name="priceEstimate"]');

            if (name && !name.value.trim()) {
                event.preventDefault();
                name.setCustomValidity('Item name is required.');
                name.reportValidity();
                return;
            }

            if (!validateNumber(quantity, 'Quantity') || !validateNumber(price, 'Price estimate')) {
                event.preventDefault();
            }
        });
    });

    document.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', () => input.setCustomValidity(''));
    });

    async function submitAction(form, method) {
        const response = await fetch(form.action, {
            method,
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('Request failed');
        window.location.reload();
    }

    document.querySelectorAll('[data-toggle-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            submitAction(form, 'PATCH').catch(() => form.submit());
        });
    });

    document.querySelectorAll('[data-delete-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            submitAction(form, 'DELETE').catch(() => form.submit());
        });
    });
})();
