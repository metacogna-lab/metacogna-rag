
import { TrainingExample } from "../types";

const STORAGE_KEY = 'pratejra_fine_tuning_data';

export class TrainingDataService {
    
    private getStore(): TrainingExample[] {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to load training data", e);
            return [];
        }
    }

    private saveStore(data: TrainingExample[]) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save training data (Quota exceeded?)", e);
        }
    }

    /**
     * Saves a new interaction example to the local "Table".
     */
    saveExample(example: Omit<TrainingExample, 'id' | 'timestamp'>) {
        const store = this.getStore();
        const newRecord: TrainingExample = {
            ...example,
            id: `ft-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: Date.now()
        };
        // Prepend to list (newest first)
        store.unshift(newRecord);
        
        // Optional: Limit size to prevent localStorage overflow (e.g., 1000 items)
        if (store.length > 1000) {
            store.pop();
        }
        
        this.saveStore(store);
        console.debug(`[TrainingData] Saved ${example.source} example.`);
    }

    getAll(): TrainingExample[] {
        return this.getStore();
    }

    clear() {
        localStorage.removeItem(STORAGE_KEY);
    }

    /**
     * Export data as JSONL (JSON Lines) format, standard for fine-tuning.
     * Format: { "messages": [ { "role": "system", ... }, { "role": "user", ... }, { "role": "assistant", ... } ] }
     */
    exportJSONL(): string {
        const store = this.getStore();
        return store.map(ex => {
            // Construct standard Chat format for fine-tuning
            const messages = [];
            if (ex.input.system) messages.push({ role: "system", content: ex.input.system });
            
            // Combine User input with Context if available
            let userContent = ex.input.user;
            if (ex.input.context) {
                userContent += `\n\nCONTEXT:\n${ex.input.context}`;
            }
            messages.push({ role: "user", content: userContent });
            
            messages.push({ role: "assistant", content: ex.output });

            return JSON.stringify({ messages });
        }).join('\n');
    }
}

export const trainingService = new TrainingDataService();
