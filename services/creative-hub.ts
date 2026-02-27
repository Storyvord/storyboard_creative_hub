import api from "./api";
import { Script, Scene, Character, Cloth, Shot } from "@/types/creative-hub";

export interface ImageModel {
  model_name: string;
  provider: string;
  credits_per_image: number;
  cost_per_image: string;
  resolution: string | null;
  aspect_ratio: string | null;
}


// Script
export const uploadScript = async (projectId: string, file: File): Promise<Script> => {
  const formData = new FormData();
  formData.append("file", file);
    const response = await api.post(`/api/creative_hub/scripts/upload/v3/?project_id=${projectId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getScriptConversionReview = async (scriptId: number): Promise<any> => {
    const response = await api.get(`/api/creative_hub/scripts/${scriptId}/conversion/review/`);
    return response.data;
};

export const confirmScriptConversion = async (
    scriptId: number,
    payload: { action: "confirm" | "reject"; scenes?: any[]; screenplay_text?: string }
): Promise<any> => {
    const response = await api.post(`/api/creative_hub/scripts/${scriptId}/conversion/confirm/`, payload);
    return response.data;
};

export const deleteScript = async (scriptId: number): Promise<void> => {
    await api.delete(`/api/creative_hub/scripts/${scriptId}/delete/`);
}

export const getScripts = async (projectId: string): Promise<Script[]> => {
    // There isn't a direct project-filtered script list endpoint in the provided snippets, 
    // but typically it might be /api/creative_hub/scripts/?project_id=...
    // or we might need to fetch from project details.
    // For now, assuming we can get list.
    try {
        const url = `/api/creative_hub/scripts/?project_id=${projectId}`;
        console.log(`[getScripts] Requesting: ${url}`);
        const response = await api.get(url);
        if (Array.isArray(response.data)) return response.data;
        if (response.data.results) return response.data.results;
        return [];
    } catch (error: any) {
        console.error("[getScripts] Full Error Object:", error);
        // Try to log specific properties if available, but relying on browser console to expand object
        if (error.response) {
             console.error("[getScripts] Response Data:", error.response.data);
             console.error("[getScripts] Response Status:", error.response.status);
        } else if (error.request) {
             console.error("[getScripts] No Response received (Network Error or CORS):", error.request);
        } else {
             console.error("[getScripts] Request setup error:", error.message);
        }
        throw error;
    }
}

export const getScriptDetail = async (scriptId: number): Promise<Script> => {
    const response = await api.get(`/api/creative_hub/scripts/${scriptId}/`);
    return response.data;
}

export const updateScript = async (scriptId: number, data: Partial<Script>): Promise<Script> => {
    const response = await api.patch(`/api/creative_hub/scripts/${scriptId}/`, data);
    return response.data;
}

export const reparseScript = async (scriptId: number): Promise<any> => {
    const response = await api.post(`/api/creative_hub/scripts/${scriptId}/reparse/`);
    return response.data;
}

// Scenes
export const getScenes = async (scriptId: number): Promise<Scene[]> => {
  const response = await api.get(`/api/creative_hub/scenes/${scriptId}/`);
  if (Array.isArray(response.data)) return response.data;
  if (response.data.results) return response.data.results;
  return [];
};

export const generateScenes = async (scriptId: number): Promise<void> => {
    await api.post(`/api/creative_hub/scripts/${scriptId}/scenes/`);
}

export const regenerateScene = async (sceneId: number): Promise<void> => {
    await api.post(`/api/creative_hub/scenes/${sceneId}/regenerate/`);
}

export const updateScene = async (sceneId: number, data: Partial<Scene>): Promise<Scene> => {
    const response = await api.put(`/api/creative_hub/scenes/${sceneId}/edit/`, data);
    return response.data;
}

export const deleteScene = async (sceneId: number): Promise<void> => {
    await api.delete(`/api/creative_hub/scenes/${sceneId}/delete/`);
}

// Characters
export const getCharacters = async (scriptId: number): Promise<Character[]> => {
    const response = await api.get(`/api/creative_hub/scripts/${scriptId}/characters/`);
    if (Array.isArray(response.data)) return response.data;
    if (response.data.results) return response.data.results;
    return [];
}

export const getSceneCharacters = async (sceneId: number): Promise<any[]> => {
    const response = await api.get(`/api/creative_hub/scenes/${sceneId}/characters/`);
    if (Array.isArray(response.data)) return response.data;
    if (response.data.results) return response.data.results;
    return [];
}

export const updateSceneCharacter = async (sceneCharacterId: number, data: any): Promise<any> => {
    let payload = data;
    let config = {};

    // Check if any value is a File object, implies FormData needed
    const hasFile = Object.values(data).some(value => value instanceof File);

    if (hasFile) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    // Handle arrays (like cloth_ids) for FormData
                    value.forEach(item => formData.append(key, item as string | Blob));
                } else {
                    formData.append(key, value as string | Blob);
                }
            }
        });
        payload = formData;
        config = { headers: { "Content-Type": "multipart/form-data" } };
    }

    const response = await api.put(`/api/creative_hub/scene-characters/${sceneCharacterId}/`, payload, config);
    return response.data;
}

export const generateSceneCharacterImage = async (sceneCharacterId: number, editPrompt?: string, model?: string, provider?: string): Promise<any> => {
    const response = await api.post(`/api/creative_hub/scene-characters/${sceneCharacterId}/generate-image/`, {
        edit_prompt: editPrompt,
        model,
        provider
    });
    return response.data; // Returns task_id
}

export const createCharacter = async (scriptId: number, data: Partial<Character> | any): Promise<Character> => {
    let payload = data;
    let config = {};
     if (data.image_url instanceof File) {
         const formData = new FormData();
         Object.entries(data).forEach(([key, value]) => {
             if (value !== undefined && value !== null) {
                formData.append(key, value as string | Blob);
             }
         });
         payload = formData;
         config = { headers: { "Content-Type": "multipart/form-data" } };
     }

    const response = await api.post(`/api/creative_hub/scripts/${scriptId}/characters/`, payload, config);
    return response.data;
}

export const updateCharacter = async (characterId: number, data: Partial<Character> | any): Promise<Character> => {
    let payload = data;
    let config = {};
    const hasFile = Object.values(data).some(value => value instanceof File);

    if (hasFile) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
             if (value !== undefined && value !== null) {
                formData.append(key, value as string | Blob);
             }
         });
        payload = formData;
        config = { headers: { "Content-Type": "multipart/form-data" } };
    }

    const response = await api.put(`/api/creative_hub/characters/${characterId}/`, payload, config);
    return response.data;
}

export const uploadPreviz = async (shotId: number, file: File, sceneId?: number): Promise<any> => {
    const formData = new FormData();
    formData.append('image_file', file);
    formData.append('description', 'Manual Upload');
    formData.append('generate_ai_image', 'false');
    if (sceneId) {
        formData.append('scene', sceneId.toString());
    }

    const response = await api.post(`/api/creative_hub/previsualization/create/`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    const createdPreviz = response.data;
    if (createdPreviz?.id) {
        await setActivePreviz(shotId, createdPreviz.id);
    }
    return createdPreviz;
}

export const deleteCharacter = async (characterId: number): Promise<void> => {
    await api.delete(`/api/creative_hub/characters/${characterId}/`);
}

export const generateCharacterImage = async (characterId: number, model?: string, provider?: string): Promise<void> => {
    await api.post(`/api/creative_hub/characters/${characterId}/generate-image/`, {
        model,
        provider
    });
}

// Wardrobe/Cloths
export const getCloths = async (scriptId: number): Promise<Cloth[]> => {
     const response = await api.get(`/api/creative_hub/scripts/${scriptId}/cloths/`);
     if (Array.isArray(response.data)) return response.data;
     if (response.data.results) return response.data.results;
     return [];
}

export const createCloth = async (scriptId: number, data: { name: string, cloth_type: string, image?: File, description?: string }): Promise<Cloth> => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("cloth_type", data.cloth_type);
    if (data.description) formData.append("description", data.description);
    if (data.image) formData.append("image_url", data.image);

    const response = await api.post(`/api/creative_hub/scripts/${scriptId}/cloths/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}

export const updateCloth = async (clothId: number, data: Partial<Cloth>): Promise<Cloth> => {
    // Assuming cloth detail endpoint supports PUT
    const response = await api.put(`/api/creative_hub/cloths/${clothId}/`, data);
    return response.data;
}

export const deleteCloth = async (clothId: number): Promise<void> => {
    // Assuming cloth detail endpoint supports DELETE
    await api.delete(`/api/creative_hub/cloths/${clothId}/`);
}

export const generateClothImage = async (clothId: number, model?: string, provider?: string): Promise<void> => {
    await api.post(`/api/creative_hub/cloths/${clothId}/generate-image/`, {
        model,
        provider
    });
}

// Shots/Previz
export const createShot = async (
  scriptId: number,
  data: { scene: number; description: string; type: string; order: number; camera_angle?: string; movement?: string; lighting?: string }
): Promise<Shot> => {
    const response = await api.post(`/api/creative_hub/shots/${scriptId}/`, [data]);
    // Backend returns an array; return the first item
    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    return result;
};

export const deleteShot = async (shotId: number): Promise<void> => {
    await api.delete(`/api/creative_hub/shots/${shotId}/detail/`);
};

export const getShots = async (sceneId: number): Promise<Shot[]> => {
    const response = await api.get(`/api/creative_hub/shots/scene/${sceneId}/`);
    if (Array.isArray(response.data)) return response.data;
    if (response.data.results) return response.data.results;
    return [];
}

export const generateShots = async (sceneId: number): Promise<void> => {
    await api.post(`/api/creative_hub/scenes/${sceneId}/shots/`);
}

export const generateShotImage = async (shotId: number, model?: string, provider?: string): Promise<any> => {
    // Reuse the bulk endpoint for single generation as it handles async properly
    const response = await api.post(`/api/creative_hub/previsualization/bulk-generate/`, {
        shot_ids: [shotId],
        model,
        provider
    });
    return response.data;
}

export const bulkGenerateShots = async (sceneIds: number[]): Promise<any> => {
    const response = await api.post(`/api/creative_hub/shots/bulk-generate/`, {
        scene_ids: sceneIds
    });
    return response.data;
}

export const reorderShots = async (shotOrders: { id: number; scene_id: number; order: number }[]): Promise<any> => {
    const response = await api.post(`/api/creative_hub/shots/reorder/`, {
        shot_orders: shotOrders
    });
    return response.data;
}

export const bulkGeneratePreviz = async (shotIds: number[], model?: string, provider?: string): Promise<any> => {
    const response = await api.post(`/api/creative_hub/previsualization/bulk-generate/`, {
        shot_ids: shotIds,
        model,
        provider
    });
    return response.data;
}

export const setActivePreviz = async (shotId: number, previzId: number): Promise<any> => {
    // According to ShotSerializer, we update the shot to set active_previz
    const response = await api.put(`/api/creative_hub/shots/${shotId}/detail/`, {
        active_previz: previzId
    });
    return response.data;
}

export const updateShotDetails = async (shotId: number, data: Partial<Shot>): Promise<Shot> => {
    const response = await api.put(`/api/creative_hub/shots/${shotId}/detail/`, data);
    return response.data;
}

export const createScriptPrevisualization = async (data: { script: number, description: string, aspect_ratio: string, camera_angle?: string, shot_type?: string, generate_ai_image: boolean; model?: string; provider?: string; }): Promise<any> => {
    const response = await api.post(`/api/creative_hub/previsualization/create/`, data);
    return response.data;
}

export const getImageModels = async (): Promise<ImageModel[]> => {
    const response = await api.get(`/api/creative_hub/image-models/`);
    return response.data;
}

export const getScriptTasks = async (scriptId: string | number): Promise<any> => {
    const response = await api.get(`/api/creative_hub/scripts/tasks/${scriptId}/`);
    return response.data;
}

export const getTaskStatus = async (taskId: string): Promise<any> => {
    const response = await api.get(`/api/creative_hub/tasks/${taskId}/`);
    return response.data;
}

export const getBulkTaskStatus = async (taskIds: string[]): Promise<any> => {
    const response = await api.post(`/api/project/v2/bulk_taskstatus/`, { task_ids: taskIds });
    return response.data;
}

// Fetches scenes with nested shots and previsualizations
// Returns raw structure from PrevisualizationListV2APIView
// Fetches scenes with nested shots and previsualizations
// Returns raw structure from PrevisualizationListV2APIView
export const getStoryboardData = async (scriptId: string | number): Promise<any[]> => {
    const response = await api.get(`/api/creative_hub/previsualization/list/v2/?script_id=${scriptId}`);
    
    // The API might return paginated response or direct list depending on implementation
    if (response.data.results) return response.data.results;
    if (Array.isArray(response.data)) return response.data;
    return [];
}

// Fetches a single scene with nested shots and previsualizations
export const getSceneStoryboardData = async (sceneId: number): Promise<any> => {
    const response = await api.get(`/api/creative_hub/previsualization/list/v2/?scene_ids=${sceneId}`);
    
    // Response should be a list containing one scene object or paginated result
    let results = [];
    if (response.data.results) results = response.data.results;
    else if (Array.isArray(response.data)) results = response.data;
    
    if (results.length > 0) return results[0];
    return null;
}

export const getShotPreviz = async (shotId: number): Promise<any[]> => {
    // Try V1 list endpoint filtered by shot to get history
    try {
         const response = await api.get(`/api/creative_hub/previsualization/list/?shot_id=${shotId}`);
         if (Array.isArray(response.data)) return response.data;
         if (response.data.results) return response.data.results;
    } catch (e) {
        console.warn("Failed to fetch previz via list endpoint", e);
    }
    return [];
}

export const regeneratePreviz = async (previzId: number, editPrompt?: string, model?: string, provider?: string): Promise<any> => {
    const response = await api.post(`/api/creative_hub/previsualization/${previzId}/regenerate/`, {
        edit_prompt: editPrompt,
        model,
        provider
    });
    return response.data;
}

/**
 * Creates a new Previz using the current active Previz image as reference,
 * then applies an edit prompt via image-to-image regeneration.
 * 
 * Flow:
 * 1. Download the active previz image as a blob
 * 2. Create a new previz via /previsualization/create/ with the image_file
 * 3. Regenerate the new previz with the edit prompt (image-to-image edit)
 */
export const editPrevizWithPrompt = async (
    shotId: number,
    activePrevizImageUrl: string,
    editPrompt: string,
    sceneId?: number,
    scriptId?: number,
    model?: string,
    provider?: string
): Promise<any> => {
    // Step 1: Download the active previz image
    const imageResponse = await fetch(activePrevizImageUrl);
    if (!imageResponse.ok) throw new Error("Failed to fetch reference image for editing.");
    const blob = await imageResponse.blob();
    const file = new File([blob], 'reference.png', { type: blob.type || 'image/png' });

    // Step 2: Create a new previz from the current image (do not set active yet)
    const formData = new FormData();
    formData.append('image_file', file);
    formData.append('description', editPrompt);
    formData.append('generate_ai_image', 'false');
    if (scriptId) {
        formData.append('script', String(scriptId));
    }

    const createRes = await api.post(`/api/creative_hub/previsualization/create/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    const newPreviz = createRes.data;

    // Step 3: Regenerate the new previz with the edit prompt (image-to-image)
    const regeneratedPreviz = await regeneratePreviz(newPreviz.id, editPrompt, model, provider);

    // Step 4: Only after successful regeneration, set it as active for the shot
    await setActivePreviz(shotId, newPreviz.id);

    return regeneratedPreviz;
}
