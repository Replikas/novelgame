// Game State Management
class RickortyGame {
    constructor() {
        this.apiKey = null;
        this.apiEndpoint = 'https://llm.chutes.ai/v1/chat/completions';
        this.gameState = {
            storyHistory: [],
            relationshipLevel: 50, // 0-100 scale
            currentScene: null,
            isGameOver: false,
            turnCount: 0
        };
        
        this.initializeGame();
        this.bindEvents();
    }

    // Load configuration from server
    async loadConfig() {
        // Use configuration from loaded config file
        if (window.gameConfig) {
            this.apiKey = window.gameConfig.apiKey;
            this.apiEndpoint = window.gameConfig.apiEndpoint;
            return true;
        }
        
        // Fallback if config not loaded
        this.showError('Game configuration not loaded. Please refresh the page.');
        return false;
    }

    // Initialize the game
    async initializeGame() {
        this.showLoading();
        
        // Load configuration first
        const configLoaded = await this.loadConfig();
        if (!configLoaded || !this.apiKey) {
            this.showError('Failed to load game configuration. Please check your connection and try again.');
            return;
        }
        
        this.startNewGame();
    }

    // Bind event listeners
    bindEvents() {
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());
        document.getElementById('closeHistoryBtn').addEventListener('click', () => this.hideHistory());
        document.getElementById('retryBtn').addEventListener('click', () => this.retryConnection());
        
        // Close modal when clicking outside
        document.getElementById('historyModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('historyModal')) {
                this.hideHistory();
            }
        });
    }

    // Show loading screen
    showLoading() {
        document.getElementById('loadingScreen').classList.remove('hidden');
        document.getElementById('gameContent').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
    }

    // Hide loading screen
    hideLoading() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('gameContent').classList.remove('hidden');
    }

    // Show error message
    showError(message) {
        document.getElementById('errorText').textContent = message;
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('loadingScreen').classList.add('hidden');
    }

    // Hide error message
    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }

    // Start a new game
    async startNewGame() {
        this.gameState = {
            storyHistory: [],
            relationshipLevel: 50,
            currentScene: null,
            isGameOver: false,
            turnCount: 0
        };
        
        this.updateRelationshipDisplay();
        
        // Initial story prompt
        const initialPrompt = this.buildPrompt("START", "The story begins. Rick and Morty are alone in the garage after a failed mission. Morty is shaken; Rick deflects with sarcasm.");
        
        try {
            const response = await this.callLLM(initialPrompt);
            this.processLLMResponse(response);
            this.hideLoading();
        } catch (error) {
            console.error('Failed to start game:', error);
            this.showError('Failed to start the game. Please check your connection and try again.');
        }
    }

    // Build prompt for LLM
    buildPrompt(lastChoice, additionalContext = "") {
        const relationshipState = this.getRelationshipState();
        const historyText = this.gameState.storyHistory.length > 0 
            ? this.gameState.storyHistory.join('\n') 
            : "Story just beginning.";

        return `You are the engine for a text-based visual novel called "Rickorty: Fall Damage."
Characters: Rick Sanchez (sarcastic, emotionally repressed, highly intelligent) and Morty Smith (anxious, emotionally intuitive, reactive).
Setting: Rick and Morty are alone in the garage after a failed mission. This is a slow-burn romance with emotional tension.

Story so far: ${historyText}
Last choice: ${lastChoice}
Current relationship: ${relationshipState}
Additional context: ${additionalContext}

Respond with:
1. The next scene (3-6 lines of in-character dialogue between Rick and Morty)
2. Exactly 3 player choices that naturally follow the scene

Format your response as JSON:
{
  "scene": [
    {"character": "Rick", "dialogue": "..."},
    {"character": "Morty", "dialogue": "..."}
  ],
  "choices": [
    "Choice 1 text",
    "Choice 2 text", 
    "Choice 3 text"
  ]
}

Keep dialogue authentic to the characters. Rick should be sarcastic and deflective. Morty should be anxious but emotionally honest.`;
    }

    // Call the LLM API
    async callLLM(prompt) {
        const requestBody = {
            model: "deepseek-ai/DeepSeek-V3-0324",
            messages: [
                {
                    role: "system",
                    content: "You are a creative writing assistant specializing in character-driven dialogue for visual novels."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.8
        };

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // Process LLM response
    processLLMResponse(response) {
        try {
            // Try to parse as JSON first
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(response);
            } catch (e) {
                // If JSON parsing fails, try to extract data manually
                parsedResponse = this.parseNonJSONResponse(response);
            }

            if (!parsedResponse.scene || !parsedResponse.choices) {
                throw new Error('Invalid response format from LLM');
            }

            this.gameState.currentScene = parsedResponse;
            this.gameState.turnCount++;
            
            this.displayScene(parsedResponse.scene);
            this.displayChoices(parsedResponse.choices);
            
        } catch (error) {
            console.error('Failed to process LLM response:', error);
            this.showError('Failed to process the story response. Please try again.');
        }
    }

    // Parse non-JSON response (fallback)
    parseNonJSONResponse(response) {
        // Simple parser for cases where LLM doesn't return proper JSON
        const lines = response.split('\n').filter(line => line.trim());
        const scene = [];
        const choices = [];
        
        let currentSection = null;
        
        for (const line of lines) {
            if (line.includes('Rick:') || line.includes('Morty:')) {
                const [character, dialogue] = line.split(':').map(s => s.trim());
                scene.push({ character, dialogue });
            } else if (line.match(/^\d+\./)) {
                choices.push(line.replace(/^\d+\.\s*/, ''));
            }
        }
        
        // Fallback if parsing fails
        if (scene.length === 0) {
            scene.push({ character: "Rick", dialogue: "Uh, something went wrong with the story generator, Morty." });
            scene.push({ character: "Morty", dialogue: "Oh no, Rick! What do we do now?" });
        }
        
        if (choices.length === 0) {
            choices.push("Try to fix the problem", "Ask Rick for help", "Panic slightly");
        }
        
        return { scene, choices };
    }

    // Display scene dialogue
    displayScene(scene) {
        const dialogueContent = document.getElementById('dialogueContent');
        dialogueContent.innerHTML = '';
        
        scene.forEach(line => {
            const dialogueLine = document.createElement('div');
            dialogueLine.className = `dialogue-line ${line.character.toLowerCase()}`;
            
            const avatar = document.createElement('img');
            avatar.className = 'character-avatar';
            avatar.src = `assets/${line.character.toLowerCase()}-avatar.svg`;
            avatar.alt = `${line.character} Avatar`;
            avatar.onerror = () => {
                // Fallback if avatar image fails to load
                avatar.style.display = 'none';
            };
            
            const textContainer = document.createElement('div');
            textContainer.className = 'dialogue-text';
            
            const characterName = document.createElement('div');
            characterName.className = 'character-name';
            characterName.textContent = line.character;
            
            const dialogueText = document.createElement('div');
            dialogueText.textContent = line.dialogue;
            
            textContainer.appendChild(characterName);
            textContainer.appendChild(dialogueText);
            
            dialogueLine.appendChild(avatar);
            dialogueLine.appendChild(textContainer);
            
            dialogueContent.appendChild(dialogueLine);
        });
        
        // Add scene to history
        const sceneText = scene.map(line => `${line.character}: ${line.dialogue}`).join('\n');
        this.gameState.storyHistory.push(sceneText);
    }

    // Display choice buttons
    displayChoices(choices) {
        const choicesContainer = document.getElementById('choicesContainer');
        choicesContainer.innerHTML = '';
        
        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'choice-btn';
            button.textContent = choice;
            button.addEventListener('click', () => this.selectChoice(choice, index));
            choicesContainer.appendChild(button);
        });
    }

    // Handle choice selection
    async selectChoice(choice, index) {
        // Disable all choice buttons
        const choiceButtons = document.querySelectorAll('.choice-btn');
        choiceButtons.forEach(btn => btn.disabled = true);
        
        this.showLoading();
        
        // Update relationship based on choice (simple logic)
        this.updateRelationship(index);
        
        try {
            const prompt = this.buildPrompt(choice);
            const response = await this.callLLM(prompt);
            this.processLLMResponse(response);
            this.hideLoading();
        } catch (error) {
            console.error('Failed to get next scene:', error);
            this.showError('Failed to continue the story. Please try again.');
            // Re-enable buttons on error
            choiceButtons.forEach(btn => btn.disabled = false);
        }
    }

    // Update relationship level
    updateRelationship(choiceIndex) {
        // Simple relationship logic - first choice increases, second neutral, third decreases
        const changes = [2, 0, -1];
        const change = changes[choiceIndex] || 0;
        
        this.gameState.relationshipLevel = Math.max(0, Math.min(100, this.gameState.relationshipLevel + change));
        this.updateRelationshipDisplay();
    }

    // Update relationship display
    updateRelationshipDisplay() {
        const fillElement = document.getElementById('relationshipFill');
        const statusElement = document.getElementById('relationshipStatus');
        
        fillElement.style.width = `${this.gameState.relationshipLevel}%`;
        
        let status;
        if (this.gameState.relationshipLevel < 30) {
            status = 'Tense';
        } else if (this.gameState.relationshipLevel < 70) {
            status = 'Neutral';
        } else {
            status = 'Close';
        }
        
        statusElement.textContent = status;
    }

    // Get relationship state description
    getRelationshipState() {
        const level = this.gameState.relationshipLevel;
        if (level < 20) return 'Very tense, emotionally distant';
        if (level < 40) return 'Somewhat tense, guarded';
        if (level < 60) return 'Neutral, cautious';
        if (level < 80) return 'Growing closer, more open';
        return 'Very close, emotionally intimate';
    }

    // Restart game
    restartGame() {
        if (confirm('Are you sure you want to restart the story? All progress will be lost.')) {
            this.startNewGame();
        }
    }

    // Show history modal
    showHistory() {
        const historyContent = document.getElementById('historyContent');
        const modal = document.getElementById('historyModal');
        
        if (this.gameState.storyHistory.length === 0) {
            historyContent.innerHTML = '<p>No story history yet.</p>';
        } else {
            historyContent.innerHTML = this.gameState.storyHistory
                .map(scene => `<div class="history-entry">${scene.replace(/\n/g, '<br>')}</div>`)
                .join('<hr>');
        }
        
        modal.style.display = 'block';
    }

    // Hide history modal
    hideHistory() {
        document.getElementById('historyModal').style.display = 'none';
    }

    // Retry connection
    retryConnection() {
        this.hideError();
        this.initializeGame();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Start the game
    window.rickortyGame = new RickortyGame();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        window.rickortyGame.restartGame();
    } else if (e.key === 'h' && e.ctrlKey) {
        e.preventDefault();
        window.rickortyGame.showHistory();
    }
});
