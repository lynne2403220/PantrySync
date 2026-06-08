const Item = require('../models/item');
const Recipe = require('../models/recipe');
const substitutions = require('../data/substitutions');

const fillerWords = new Set([
    'fresh', 'frozen', 'canned', 'chopped', 'diced', 'sliced', 'minced',
    'large', 'small', 'medium', 'cooked', 'uncooked', 'raw', 'dry', 'dried'
]);

function normalizeIngredientName(value) {
    const words = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter((word) => !fillerWords.has(word))
        .map((word) => {
            if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
            if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
            if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
            return word;
        });

    return words.join(' ').trim();
}

function ingredientTokens(value) {
    return normalizeIngredientName(value).split(' ').filter((word) => word.length > 2);
}

function namesMatch(pantryName, recipeName) {
    const pantry = normalizeIngredientName(pantryName);
    const recipe = normalizeIngredientName(recipeName);
    if (!pantry || !recipe) return false;
    if (pantry === recipe) return true;
    if (pantry.includes(recipe) || recipe.includes(pantry)) return true;

    const pantryTokens = ingredientTokens(pantry);
    const recipeTokens = ingredientTokens(recipe);
    return recipeTokens.some((token) => pantryTokens.includes(token));
}

function daysUntil(date) {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(date);
    expiry.setHours(0, 0, 0, 0);
    return Math.round((expiry - today) / 86400000);
}

function buildPantryIndex(items) {
    const byName = new Map();
    const rows = items.map((item) => {
        const normalizedName = normalizeIngredientName(item.name);
        const row = {
            id: item._id.toString(),
            name: item.name,
            normalizedName,
            amount: item.amount,
            unit: item.unit,
            expiryDate: item.expiryDate,
            daysUntilExpiry: daysUntil(item.expiryDate),
            zone: item.zone
        };

        if (!byName.has(normalizedName)) byName.set(normalizedName, []);
        byName.get(normalizedName).push(row);
        return row;
    });

    return { byName, rows };
}

function findMatchingPantryItem(ingredient, pantryIndex) {
    const normalized = normalizeIngredientName(ingredient.name);
    const direct = pantryIndex.byName.get(normalized);
    if (direct && direct.length) return direct[0];
    return pantryIndex.rows.find((item) => namesMatch(item.name, ingredient.name)) || null;
}

function calculateMatchPercentage(matchedCount, totalCount) {
    if (!totalCount) return 0;
    return Math.round((matchedCount / totalCount) * 100);
}

function calculateExpiryBoost(matchedItems) {
    return matchedItems.reduce((boost, match) => {
        const days = match.pantryItem.daysUntilExpiry;
        if (days === null || days < 0) return boost;
        if (days <= 1) return boost + 15;
        if (days <= 3) return boost + 10;
        if (days <= 7) return boost + 5;
        return boost;
    }, 0);
}

function findSubstitutionOptions(ingredient, pantryIndex) {
    const normalized = normalizeIngredientName(ingredient.name);
    const key = Object.keys(substitutions).find((candidate) => namesMatch(candidate, normalized));
    const options = key ? substitutions[key] : [];

    return options.map((option) => {
        const pantryItem = pantryIndex.rows.find((item) => namesMatch(item.name, option));
        return {
            name: option,
            inPantry: Boolean(pantryItem)
        };
    });
}

function compareRecipeToPantry(recipe, pantryIndex) {
    const matchedIngredients = [];
    const missingIngredients = [];

    recipe.ingredients.forEach((ingredient) => {
        const pantryItem = findMatchingPantryItem(ingredient, pantryIndex);
        if (pantryItem) {
            matchedIngredients.push({
                ingredient: {
                    name: ingredient.name,
                    amount: ingredient.amount,
                    unit: ingredient.unit
                },
                pantryItem: {
                    id: pantryItem.id,
                    name: pantryItem.name,
                    amount: pantryItem.amount,
                    unit: pantryItem.unit,
                    expiryDate: pantryItem.expiryDate,
                    daysUntilExpiry: pantryItem.daysUntilExpiry,
                    expired: pantryItem.daysUntilExpiry !== null && pantryItem.daysUntilExpiry < 0
                }
            });
        } else {
            missingIngredients.push({
                name: ingredient.name,
                amount: ingredient.amount,
                unit: ingredient.unit,
                substitutions: findSubstitutionOptions(ingredient, pantryIndex)
            });
        }
    });

    const matchPercentage = calculateMatchPercentage(matchedIngredients.length, recipe.ingredients.length);
    const expiryBoost = calculateExpiryBoost(matchedIngredients);

    return {
        matchedIngredients,
        missingIngredients,
        matchPercentage,
        expiryBoost,
        recommendationScore: matchPercentage + expiryBoost
    };
}

function formatRecommendation(recipe, comparison) {
    return {
        id: recipe._id.toString(),
        title: recipe.title,
        preparationTimeMinutes: recipe.preparationTimeMinutes,
        diets: recipe.diets || [],
        tags: recipe.tags || [],
        estimatedCost: recipe.estimatedCost || 0,
        sourceName: recipe.sourceName || '',
        sourceUrl: recipe.sourceUrl || '',
        ingredients: recipe.ingredients.map((ingredient) => ({
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit
        })),
        steps: recipe.steps || [],
        matchedIngredients: comparison.matchedIngredients,
        missingIngredients: comparison.missingIngredients,
        matchPercentage: comparison.matchPercentage,
        expiryBoost: comparison.expiryBoost,
        recommendationScore: comparison.recommendationScore,
        hasExpiredMatches: comparison.matchedIngredients.some((match) => match.pantryItem.expired)
    };
}

function parseFilters(input) {
    const source = input || {};
    const diets = [].concat(source.diets || source.diet || []).map((item) => String(item).trim()).filter(Boolean);
    const tags = [].concat(source.tags || source.tag || []).map((item) => String(item).trim()).filter(Boolean);
    const rawMaxPrepTime = source.maxPrepTime ?? source.maxPreparationTime;
    const rawMaxMissing = source.maxMissing;
    const maxPrepTime = rawMaxPrepTime === undefined || rawMaxPrepTime === '' ? null : Number(rawMaxPrepTime);
    const maxMissing = rawMaxMissing === undefined || rawMaxMissing === '' ? null : Number(rawMaxMissing);

    return {
        diets,
        tags,
        maxPrepTime: Number.isFinite(maxPrepTime) && maxPrepTime > 0 ? maxPrepTime : null,
        maxMissing: Number.isFinite(maxMissing) && maxMissing >= 0 ? maxMissing : null,
        quickOnly: source.quickOnly === true || source.quickOnly === 'true',
        cheapOnly: source.cheapOnly === true || source.cheapOnly === 'true'
    };
}

function recipePassesFilters(recipe, recommendation, filters) {
    if (filters.diets.length && !filters.diets.every((diet) => recipe.diets.includes(diet))) return false;
    if (filters.tags.length && !filters.tags.every((tag) => recipe.tags.includes(tag))) return false;
    if (filters.maxPrepTime && recipe.preparationTimeMinutes > filters.maxPrepTime) return false;
    if (filters.maxMissing !== null && recommendation.missingIngredients.length > filters.maxMissing) return false;
    if (filters.quickOnly && recipe.preparationTimeMinutes > 15) return false;
    if (filters.cheapOnly && recipe.estimatedCost > 45) return false;
    return true;
}

async function recommendationRows(user, rawFilters) {
    const filters = parseFilters(rawFilters);
    const [pantryItems, recipes] = await Promise.all([
        Item.find({ owner: user._id }).sort({ expiryDate: 1, createdAt: -1 }),
        Recipe.find().sort({ title: 1 })
    ]);

    const pantryIndex = buildPantryIndex(pantryItems);
    if (!pantryItems.length) {
        return {
            pantryCount: 0,
            recipeCount: recipes.length,
            recommendations: [],
            filters,
            message: 'Add pantry items to get personalized recipe recommendations.'
        };
    }

    const recommendations = recipes
        .map((recipe) => {
            const comparison = compareRecipeToPantry(recipe, pantryIndex);
            return formatRecommendation(recipe, comparison);
        })
        .filter((recommendation, index) => recipePassesFilters(recipes[index], recommendation, filters))
        .sort((a, b) => b.recommendationScore - a.recommendationScore || a.missingIngredients.length - b.missingIngredients.length || a.preparationTimeMinutes - b.preparationTimeMinutes);

    return {
        pantryCount: pantryItems.length,
        recipeCount: recipes.length,
        recommendations,
        filters,
        message: pantryItems.length
            ? (recommendations.length ? 'Recommendations ranked by pantry match and expiry urgency.' : 'No recipes matched the selected filters.')
            : 'Add pantry items to get personalized recipe recommendations.'
    };
}

exports.renderRecipesPage = (req, res) => {
    res.render('recipes', {
        title: 'Recipe Recommendations',
        featureCss: '/css/recipes.css',
        featureJs: '/js/recipes.js'
    });
};

exports.getRecommendations = async (req, res, next) => {
    try {
        const filters = req.method === 'POST' ? req.body : req.query;
        res.json(await recommendationRows(req.user, filters));
    } catch (err) {
        next(err);
    }
};


async function deleteRecipe(req, res, next) {
    try {
        await Recipe.findByIdAndDelete(req.params.id);
        res.redirect('/recipes');
    } catch (err) {
        next(err);
    }
}

exports.deleteRecipe = deleteRecipe;
exports.normalizeIngredientName = normalizeIngredientName;
exports.buildPantryIndex = buildPantryIndex;
exports.compareRecipeToPantry = compareRecipeToPantry;
exports.calculateMatchPercentage = calculateMatchPercentage;
exports.calculateExpiryBoost = calculateExpiryBoost;
exports.findSubstitutionOptions = findSubstitutionOptions;
exports.formatRecommendation = formatRecommendation;
exports.recommendationRows = recommendationRows;
exports.matchesIngredientName = namesMatch;
