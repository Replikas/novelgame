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
        const initialPrompt = this.buildPrompt("GAME_START", "The story begins. Rick and Morty have just returned to the garage after a dangerous mission that went wrong. Morty is visibly shaken and emotionally vulnerable, while Rick is trying to process what happened in his usual deflective way.");
        
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

        return `You are the creative engine for a visual novel called "Rickorty: Fall Damage."

SETTING: Rick and Morty are alone in Rick's garage after a dangerous mission that went wrong. Morty is emotionally shaken, while Rick tries to deflect with his usual sarcasm. This is a character-driven story exploring their complex relationship with potential for emotional growth.

CHARACTERS:
- Rick Sanchez: Brilliant but emotionally guarded scientist. Uses sarcasm and cynicism to avoid vulnerability. Despite his harsh exterior, he cares deeply about Morty but struggles to show it.
- Morty Smith: Anxious 14-year-old who is more emotionally intelligent than he appears. Often overwhelmed but genuinely caring and honest about his feelings.

STORY CONTEXT:
Previous events: ${historyText}
Morty's last choice/action: ${lastChoice}
Current relationship dynamic: ${relationshipState}
${additionalContext}

TASK: Write the next story scene that includes:
1. Rich narrative descriptions (3-4 sentences) covering setting, atmosphere, character emotions, and what's happening between dialogue
2. Clean character dialogue (3-5 exchanges between Rick and Morty with no action descriptions)
3. Additional narrative between dialogue exchanges to show character reactions, emotions, and scene progression

Then provide exactly 3 meaningful choice options for Morty that will meaningfully impact the story direction.

Respond in this exact JSON format:
{
  "narrative": "Rich opening description of the scene, setting, atmosphere, and character states...",
  "scene": [
    {"character": "Rick", "dialogue": "What Rick says..."},
    {"narrative": "Description of what happens next, how characters react, body language, emotions..."},
    {"character": "Morty", "dialogue": "What Morty responds..."},
    {"narrative": "More narrative describing the tension, environment, or character feelings..."},
    {"character": "Rick", "dialogue": "Rick's response..."}
  ],
  "choices": [
    "First choice - more emotional/vulnerable approach",
    "Second choice - neutral/practical approach", 
    "Third choice - defensive/confrontational approach"
  ]
}

Make the dialogue authentic - Rick should be sharp-tongued but show hints of care, Morty should be genuine and reactive to Rick's behavior. Use rich narrative sections to show character emotions, environmental details, and psychological tension between dialogue exchanges. The narrative should paint a vivid picture of the scene and characters' internal states.

IMPORTANT: Use plain text for dialogue - no asterisks, markdown, or special formatting characters. Keep dialogue natural and conversational.`;
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
            max_tokens: 800,
            temperature: 0.7
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
            let parsedResponse;
            
            // Clean up response - remove markdown code blocks if present
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            try {
                parsedResponse = JSON.parse(cleanResponse);
            } catch (e) {
                // If JSON parsing fails, try to extract data manually
                parsedResponse = this.parseNonJSONResponse(response);
            }

            if (!parsedResponse.scene || !parsedResponse.choices) {
                throw new Error('Invalid response format from LLM');
            }

            this.gameState.currentScene = parsedResponse;
            this.gameState.turnCount++;
            
            // Clear previous content
            const dialogueContent = document.getElementById('dialogueContent');
            dialogueContent.innerHTML = '';
            
            // Display narrative if present
            if (parsedResponse.narrative) {
                this.displayNarrative(parsedResponse.narrative);
            }
            
            this.displayScene(parsedResponse.scene);
            this.displayChoices(parsedResponse.choices);
            
        } catch (error) {
            console.error('Failed to process LLM response:', error);
            console.error('Raw response:', response);
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

    // Display narrative text
    displayNarrative(narrative) {
        const dialogueContent = document.getElementById('dialogueContent');
        
        const narrativeElement = document.createElement('div');
        narrativeElement.className = 'narrative-text';
        narrativeElement.innerHTML = `<em>${narrative}</em>`;
        
        dialogueContent.appendChild(narrativeElement);
    }

    // Display scene dialogue and narrative
    displayScene(scene) {
        const dialogueContent = document.getElementById('dialogueContent');
        
        scene.forEach(item => {
            if (item.character) {
                // This is character dialogue
                const dialogueLine = document.createElement('div');
                dialogueLine.className = `dialogue-line ${item.character.toLowerCase()}`;
                
                const avatar = document.createElement('img');
                avatar.className = 'character-avatar';
                avatar.src = `assets/${item.character.toLowerCase()}-avatar.jpg`;
                avatar.alt = `${item.character} Avatar`;
                avatar.onerror = () => {
                    avatar.style.display = 'none';
                };
                
                const textContainer = document.createElement('div');
                textContainer.className = 'dialogue-text';
                
                const characterName = document.createElement('div');
                characterName.className = 'character-name';
                characterName.textContent = item.character;
                
                const dialogueText = document.createElement('div');
                // Process basic markdown formatting
                let formattedText = item.dialogue
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italics
                    .replace(/_(.*?)_/g, '<em>$1</em>'); // Underline to italics
                dialogueText.innerHTML = formattedText;
                
                textContainer.appendChild(characterName);
                textContainer.appendChild(dialogueText);
                
                dialogueLine.appendChild(avatar);
                dialogueLine.appendChild(textContainer);
                
                dialogueContent.appendChild(dialogueLine);
            } else if (item.narrative) {
                // This is narrative text between dialogue
                const narrativeElement = document.createElement('div');
                narrativeElement.className = 'narrative-text';
                narrativeElement.innerHTML = `<em>${item.narrative}</em>`;
                
                dialogueContent.appendChild(narrativeElement);
            }
        });
        
        // Add scene to history (only dialogue parts)
        const sceneText = scene.filter(item => item.character)
            .map(line => `${line.character}: ${line.dialogue}`).join('\n');
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
            // Clear dialogue content
            document.getElementById('dialogueContent').innerHTML = '';
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
