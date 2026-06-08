(function () {
    const results = document.querySelector('[data-recipe-results]');
    const status = document.querySelector('[data-recipe-status]');
    const template = document.getElementById('recipe-card-template');
    const form = document.querySelector('[data-recipe-filters]');
    const refresh = document.querySelector('[data-refresh-recipes]');

    function setStatus(message, type) {
        status.textContent = message || '';
        status.className = `recipe-status ${type || ''}`.trim();
    }

    function appendList(list, items, render) {
        list.innerHTML = '';
        if (!items.length) {
            const empty = document.createElement('li');
            empty.textContent = 'None';
            list.appendChild(empty);
            return;
        }

        items.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = render(item);
            list.appendChild(li);
        });
    }

    function substitutionText(missing) {
        return missing
            .filter((item) => item.substitutions && item.substitutions.length)
            .map((item) => {
                const options = item.substitutions.map((sub) => sub.inPantry ? `${sub.name} in pantry` : sub.name).join(', ');
                return `${item.name}: ${options}`;
            });
    }

    function missingPayload(recipe) {
        return recipe.missingIngredients.map((item) => ({
            name: item.name,
            quantity: item.amount || 1,
            unit: item.unit || 'pcs'
        }));
    }

    async function addMissingToShopping(recipe, button) {
        button.disabled = true;
        button.textContent = 'Adding...';

        try {
            const response = await fetch('/shopping-list/from-recipe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({
                    recipeId: recipe.id,
                    recipeTitle: recipe.title,
                    missing: missingPayload(recipe)
                })
            });

            if (!response.ok) throw new Error('Shopping endpoint unavailable');
            const data = await response.json();
            button.textContent = data.added === 1 ? '1 item added' : `${data.added || 0} items added`;
        } catch (err) {
            button.textContent = 'Shopping endpoint unavailable';
        } finally {
            setTimeout(() => {
                button.disabled = false;
                button.textContent = 'Add missing to shopping list';
            }, 1800);
        }
    }

    function renderRecipe(recipe) {
        const node = template.content.firstElementChild.cloneNode(true);
        node.querySelector('[data-title]').textContent = recipe.title;
        node.querySelector('[data-meta]').textContent = `${recipe.preparationTimeMinutes} min · ${recipe.diets.join(', ') || 'no diet tag'} · EGP ${recipe.estimatedCost}`;
        node.querySelector('[data-match]').textContent = `${recipe.matchPercentage}%`;
        node.querySelector('[data-score]').textContent = `Recommendation score ${recipe.recommendationScore} (expiry boost +${recipe.expiryBoost})`;

        if (recipe.hasExpiredMatches) {
            const warning = document.createElement('p');
            warning.className = 'expired-warning';
            warning.textContent = 'One matched pantry item is expired. It is shown for inventory visibility and not boosted as safe food.';
            node.insertBefore(warning, node.querySelector('.ingredient-columns'));
        }

        appendList(node.querySelector('[data-matched]'), recipe.matchedIngredients, (item) => {
            const days = item.pantryItem.daysUntilExpiry;
            const expiry = days === null ? 'no expiry date' : days < 0 ? 'expired' : days === 0 ? 'expires today' : `${days} days left`;
            return `${item.ingredient.name} from ${item.pantryItem.name} (${expiry})`;
        });

        appendList(node.querySelector('[data-missing]'), recipe.missingIngredients, (item) => `${item.name} ${item.amount || ''} ${item.unit || ''}`.trim());
        appendList(node.querySelector('[data-steps]'), recipe.steps, (step) => step);

        const substitutions = substitutionText(recipe.missingIngredients);
        const subBox = node.querySelector('[data-substitutions]');
        if (substitutions.length) {
            const heading = document.createElement('h3');
            heading.textContent = 'Substitutions';
            subBox.appendChild(heading);
            const list = document.createElement('ul');
            substitutions.forEach((line) => {
                const li = document.createElement('li');
                li.textContent = line;
                list.appendChild(li);
            });
            subBox.appendChild(list);
        } else {
            subBox.hidden = true;
        }

        const addButton = node.querySelector('[data-add-shopping]');
        addButton.disabled = recipe.missingIngredients.length === 0;
        if (!recipe.missingIngredients.length) addButton.textContent = 'No missing ingredients';
        addButton.addEventListener('click', () => addMissingToShopping(recipe, addButton));
        return node;
    }

    function formPayload() {
        const data = new FormData(form);
        const payload = {};
        data.forEach((value, key) => {
            if (value !== '') payload[key] = value;
        });
        if (!data.has('quickOnly')) payload.quickOnly = false;
        if (!data.has('cheapOnly')) payload.cheapOnly = false;
        return payload;
    }

    async function loadRecipes(payload) {
        setStatus('Loading recommendations...', 'loading');
        results.innerHTML = '';

        try {
            const options = payload
                ? {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(payload)
                }
                : { headers: { Accept: 'application/json' } };
            const response = await fetch('/recipes/api/recommendations', options);
            if (!response.ok) throw new Error('Recipe request failed');
            const data = await response.json();

            setStatus(data.message, data.recommendations.length ? 'ok' : 'empty');
            data.recommendations.forEach((recipe) => results.appendChild(renderRecipe(recipe)));
        } catch (err) {
            setStatus('Recipe recommendations could not be loaded.', 'error');
        }
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        loadRecipes(formPayload());
    });

    refresh.addEventListener('click', () => loadRecipes());
    loadRecipes();
})();
