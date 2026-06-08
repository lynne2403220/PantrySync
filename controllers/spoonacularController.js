// External API: Spoonacular — search recipes by pantry ingredients
const SPOON_KEY = process.env.SPOONACULAR_API_KEY;
const BASE = 'https://api.spoonacular.com';

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Spoonacular error: ${res.status}`);
    return res.json();
}

// GET /api/spoonacular/search?ingredients=egg,tomato
exports.searchByIngredients = async (req, res, next) => {
    try {
        if (!SPOON_KEY) {
            return res.status(503).json({ error: 'External API key not configured.' });
        }

        const ingredients = String(req.query.ingredients || '').trim();
        if (!ingredients) {
            return res.status(400).json({ error: 'ingredients query param required.' });
        }

        const url = `${BASE}/recipes/findByIngredients?apiKey=${SPOON_KEY}&ingredients=${encodeURIComponent(ingredients)}&number=6&ranking=2&ignorePantry=true`;
        const data = await fetchJson(url);

        const results = data.map(r => ({
            id: r.id,
            title: r.title,
            image: r.image,
            usedIngredientCount: r.usedIngredientCount,
            missedIngredientCount: r.missedIngredientCount,
            missedIngredients: (r.missedIngredients || []).map(i => i.name),
            usedIngredients: (r.usedIngredients || []).map(i => i.name),
            sourceUrl: `https://spoonacular.com/recipes/${r.title.replace(/\s+/g, '-').toLowerCase()}-${r.id}`
        }));

        res.json({ results, query: ingredients });
    } catch (err) {
        next(err);
    }
};

// GET /api/spoonacular/recipe/:id  — full recipe details
exports.getRecipeDetail = async (req, res, next) => {
    try {
        if (!SPOON_KEY) {
            return res.status(503).json({ error: 'External API key not configured.' });
        }

        const { id } = req.params;
        const url = `${BASE}/recipes/${id}/information?apiKey=${SPOON_KEY}&includeNutrition=false`;
        const data = await fetchJson(url);

        res.json({
            id: data.id,
            title: data.title,
            image: data.image,
            readyInMinutes: data.readyInMinutes,
            servings: data.servings,
            summary: data.summary ? data.summary.replace(/<[^>]+>/g, '') : '',
            sourceUrl: data.sourceUrl,
            ingredients: (data.extendedIngredients || []).map(i => ({
                name: i.name,
                amount: i.amount,
                unit: i.unit
            })),
            instructions: data.instructions ? data.instructions.replace(/<[^>]+>/g, '') : ''
        });
    } catch (err) {
        next(err);
    }
};
