(function () {
    function setInvalid(input, message) {
        input.setCustomValidity(message);
        input.reportValidity();
    }

    document.querySelectorAll('[data-pantry-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            const name = form.querySelector('input[name="name"]');
            const amount = form.querySelector('input[name="amount"]');
            const price = form.querySelector('input[name="price"]');

            if (name && !name.value.trim()) {
                event.preventDefault();
                setInvalid(name, 'Item name is required.');
                return;
            }

            if (amount && Number(amount.value) < 0) {
                event.preventDefault();
                setInvalid(amount, 'Amount cannot be negative.');
                return;
            }

            if (price && price.value && Number(price.value) < 0) {
                event.preventDefault();
                setInvalid(price, 'Price cannot be negative.');
            }
        });
    });

    document.querySelectorAll('input, textarea, select').forEach((field) => {
        field.addEventListener('input', () => field.setCustomValidity(''));
    });

    const foodInput = document.querySelector('input[list="food-options"]');
    const datalist = document.getElementById('food-options');
    let foodTimer = null;

    if (foodInput && datalist) {
        foodInput.addEventListener('input', () => {
            clearTimeout(foodTimer);
            foodTimer = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/foods?q=${encodeURIComponent(foodInput.value)}`);
                    const data = await response.json();
                    datalist.innerHTML = '';
                    data.suggestions.forEach((name) => {
                        const option = document.createElement('option');
                        option.value = name;
                        datalist.appendChild(option);
                    });
                } catch (err) {
                    datalist.innerHTML = '';
                }
            }, 200);
        });
    }

    document.querySelectorAll('[data-delete-form]').forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const card = form.closest('[data-item-card]');
            const id = card && card.dataset.itemCard;
            if (!id) return form.submit();

            try {
                const response = await fetch(`/api/items/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
                if (!response.ok) throw new Error('Delete failed');
                card.remove();
            } catch (err) {
                form.submit();
            }
        });
    });
})();
