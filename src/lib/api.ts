import { getFallbackDetectionResult, getFallbackRecipes, getFallbackSwappedRecipe } from './fallback';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const OFFLINE_MESSAGE = '離線展示模式：無法連線至後端，使用內建示範資料';

/**
 * Local equivalent of each backend endpoint, used when the backend is unreachable
 * (e.g. static GitHub Pages deployment without VITE_API_BASE_URL).
 */
const localHandlers: Record<string, (body: any) => any> = {
  '/api/identify-ingredients': () => ({
    error: false,
    message: OFFLINE_MESSAGE,
    source: 'fallback',
    ingredients: getFallbackDetectionResult().ingredients,
  }),
  '/api/generate-recipes': (body) => {
    const valid = (body.ingredients || []).filter((i: any) => i.status !== 'wait' && i.status !== 'depleted');
    if (!valid.length) {
      return {
        error: true,
        message: '冰箱內無已確認 (ok) 的食材可供推薦，請先確認待確認食材或新增食材。',
      };
    }
    return {
      error: false,
      message: OFFLINE_MESSAGE,
      source: 'fallback',
      recipes: getFallbackRecipes(valid, body.equipments || [], body.dietaryStyle || 'none', !!body.quickTimeOnly),
    };
  },
  '/api/swap-recipe': (body) => ({
    error: false,
    message: OFFLINE_MESSAGE,
    source: 'fallback',
    recipe: getFallbackSwappedRecipe(
      body.originalRecipe,
      body.mustKeepIngredients || [],
      body.swapReason || '換個口味',
      body.equipments || [],
      body.dietaryStyle || 'none',
      !!body.quickTimeOnly
    ),
  }),
};

/**
 * POST JSON to the backend. Falls back to local demo data when the backend
 * is unreachable or does not answer with JSON (404 page, static hosting).
 */
export async function postApi<T = any>(path: string, body: unknown): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    if (isJson) return (await res.json()) as T;
    console.warn(`${path} returned non-JSON (HTTP ${res.status}), using local fallback`);
  } catch (err) {
    console.warn(`${path} unreachable, using local fallback`, err);
  }
  return localHandlers[path](body) as T;
}
