// Game State Management
class RickortyGame {
    constructor() {
        this.apiKey = null;
        this.apiEndpoint = 'https://llm.chutes.ai/v1/chat/completions';
        this.gameState = {
            storyHistory: [],
            relationshipLevel: 0, // 0-100 scale, starting at 0 (strained)
            currentScene: null,
            isGameOver: false,
            turnCount: 0
        };
        this.typingSpeed = {
            dialogue: 15,
            narrative: 12
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
        // Show game content immediately
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('gameContent').classList.remove('hidden');
        
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
        const speedSelect = document.getElementById('speedSelect');
        if (speedSelect) {
            speedSelect.addEventListener('change', (e) => this.updateTypingSpeed(e.target.value));
        }
        // Save/Load Progress
        const saveBtn = document.getElementById('saveBtn');
        const loadBtn = document.getElementById('loadBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProgress());
        }
        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.loadProgress());
        }
        // Close modal when clicking outside
        document.getElementById('historyModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('historyModal')) {
                this.hideHistory();
            }
        });
    }

    // Typewriter effect for text
    async typewriterEffect(element, text, speed = 30) {
        element.innerHTML = '';
        for (let i = 0; i < text.length; i++) {
            element.innerHTML += text.charAt(i);
            await new Promise(resolve => setTimeout(resolve, speed));
        }
    }

    // Typewriter effect for HTML content
    async typewriterEffectHTML(element, htmlText, speed = 30) {
        // If speed is 0 (instant), just set the content immediately
        if (speed === 0) {
            element.innerHTML = htmlText;
            return;
        }
        
        element.innerHTML = '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;
        const textContent = tempDiv.textContent || tempDiv.innerText;
        
        let currentChar = 0;
        const typeNextChar = () => {
            if (currentChar < textContent.length) {
                // Find the HTML up to the current character
                let htmlUpToChar = '';
                let charCount = 0;
                let inTag = false;
                
                for (let i = 0; i < htmlText.length; i++) {
                    if (htmlText[i] === '<') inTag = true;
                    htmlUpToChar += htmlText[i];
                    if (!inTag && htmlText[i] !== '<') {
                        charCount++;
                        if (charCount > currentChar) break;
                    }
                    if (htmlText[i] === '>') inTag = false;
                }
                
                element.innerHTML = htmlUpToChar;
                currentChar++;
            }
        };
        
        // Type out character by character
        for (let i = 0; i <= textContent.length; i++) {
            typeNextChar();
            if (i < textContent.length) {
                await new Promise(resolve => setTimeout(resolve, speed));
            }
        }
        
        element.innerHTML = htmlText; // Ensure final HTML is complete
    }

    // Display player's choice
    displayPlayerChoice(choice) {
        const dialogueContent = document.getElementById('dialogueContent');
        
        const choiceElement = document.createElement('div');
        choiceElement.className = 'player-choice';
        choiceElement.innerHTML = `<strong>You:</strong> ${choice}`;
        
        dialogueContent.appendChild(choiceElement);
        
        // Add generating indicator
        const generatingElement = document.createElement('div');
        generatingElement.className = 'generating-indicator';
        generatingElement.id = 'generatingIndicator';
        generatingElement.innerHTML = '<span class="dots">...</span>';
        dialogueContent.appendChild(generatingElement);
        
        // Auto-scroll to show new content
        const dialogueContainer = document.getElementById('dialogueContainer');
        dialogueContainer.scrollTop = dialogueContainer.scrollHeight;
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
            relationshipLevel: 0, // Starting at 0 (strained)
            currentScene: null,
            isGameOver: false,
            turnCount: 0
        };
        
        this.updateRelationshipDisplay();
        
        // Clear content for new game
        document.getElementById('dialogueContent').innerHTML = '';
        document.getElementById('choicesContainer').innerHTML = '';
        
        // Initial story prompt
        const initialPrompt = this.buildPrompt("GAME_START", "The story begins. Rick and Morty have just returned to the garage after a dangerous mission that went wrong. Morty is visibly shaken and emotionally vulnerable, while Rick is trying to process what happened in his usual deflective way.");
        
        try {
            const response = await this.callLLM(initialPrompt);
            await this.processLLMResponse(response);
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

SETTING: Rick and Morty are in Rick's garage. This is an ongoing character-driven story exploring their complex relationship with potential for emotional growth.

CHARACTERS:
- Rick Sanchez: Brilliant but emotionally guarded scientist. Uses sarcasm and cynicism to avoid vulnerability. Despite his harsh exterior, he cares deeply about Morty but struggles to show it.
- Morty Smith: Anxious 14-year-old who is more emotionally intelligent than he appears. Often overwhelmed but genuinely caring and honest about his feelings.

STORY CONTEXT:
Story progression so far: ${historyText}
Morty's most recent action: ${lastChoice}
Current relationship dynamic: ${relationshipState}
${additionalContext}

WRITING GUIDELINES:
- Continue the existing narrative flow - DO NOT restart or re-describe the setting
- Maintain consistent present tense throughout
- Build naturally from the previous scene
- Focus on character development and relationship dynamics
- Keep the story moving forward, not resetting
- ALTERNATE between Rick and Morty - never have the same character speak twice in a row
- Rick should respond to Morty's choices, then Morty responds back

TASK: Write the next story scene that naturally continues from where we left off:
1. Rich narrative continuation (2-3 sentences) showing immediate character reactions and scene progression
2. Character dialogue that ALTERNATES between Rick and Morty (Rick speaks first, then Morty, then Rick, etc.)
3. Additional narrative between dialogue showing emotional development

Respond in this exact JSON format:
{
  "narrative": "Narrative continuation showing immediate reactions and scene development...",
  "scene": [
    {"character": "Rick", "dialogue": "What Rick says in response to Morty's choice..."},
    {"narrative": "Character reactions and emotional context..."},
    {"character": "Morty", "dialogue": "What Morty responds to Rick..."},
    {"narrative": "Further development and tension..."},
    {"character": "Rick", "dialogue": "Rick's follow-up response..."}
  ],
  "choices": [
    "First choice - more emotional/vulnerable approach",
    "Second choice - neutral/practical approach", 
    "Third choice - defensive/confrontational approach"
  ]
}

CRITICAL: 
- Continue the story naturally - do not restart, reset, or re-establish the setting
- Maintain present tense and story flow
- ALWAYS alternate speakers - Rick responds first to Morty's choice, then they alternate
- Use plain text for dialogue with no special formatting
- Respond ONLY with the JSON structure - no thinking tags, no explanations, just the JSON`;
    }

    // Call the LLM API
    async callLLM(prompt) {
        const requestBody = {
            model: "deepseek-ai/DeepSeek-V3-0324",
            messages: [
                {
                    role: "system",
                    content: `
You are a masterful visual novel writer and dialogue specialist. Your job is to create emotionally rich, varied, and engaging scenes for a Rick and Morty visual novel.

- Write dialogue and narrative that is creative, surprising, and true to the characters' personalities.
- Rick is brilliant, cynical, and often hides his vulnerability behind sarcasm, but sometimes lets his guard down in subtle ways. He uses scientific jargon, dark humor, and unexpected metaphors.
- Morty is anxious, earnest, and craves Rick's approval, but is capable of surprising insight and courage. He often stammers, uses slang, and expresses genuine emotion.
- Vary the emotional tone: include humor, tension, awkwardness, warmth, and moments of vulnerability.
- Avoid repetition. Make each exchange feel fresh and meaningful.
- Every line of dialogue should be unique, creative, and true to the characters' personalities.
- Avoid formulaic or repetitive exchanges. Each conversation should feel fresh, surprising, and meaningful.
- Use subtext, implication, and body language—let the characters' feelings show through their words and actions, not just direct statements.
- Use subtext and implication—let the characters' feelings show through their words and actions, not just direct statements.
- Occasionally include small, vivid details about the setting or body language to add atmosphere and depth.
- Alternate speakers naturally, and keep the story moving forward with each exchange.
- Respond ONLY with the requested JSON structure. Do not include thinking tags, explanations, or any text outside the JSON structure.
                    `
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 800,
            temperature: 0.9,
            reasoning: false
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
    async processLLMResponse(response) {
        try {
            let parsedResponse;
            
            // Clean up response - remove various wrapper tags and formatting
            let cleanResponse = response.trim();
            
            // Remove <think> tags and content
            cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/g, '');
            
            // Remove markdown code blocks
            if (cleanResponse.includes('```json')) {
                const jsonMatch = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    cleanResponse = jsonMatch[1].trim();
                }
            } else if (cleanResponse.includes('```')) {
                const codeMatch = cleanResponse.match(/```\s*([\s\S]*?)\s*```/);
                if (codeMatch) {
                    cleanResponse = codeMatch[1].trim();
                }
            }
            
            // Handle truncated JSON responses
            if (cleanResponse.includes('[TRUNCATED]') || (!cleanResponse.endsWith('}') && cleanResponse.includes('"scene"'))) {
                // Try to fix truncated JSON
                cleanResponse = this.fixTruncatedJSON(cleanResponse);
            }
            
            // Look for JSON content between braces if other methods fail
            if (!cleanResponse.startsWith('{')) {
                const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    cleanResponse = jsonMatch[0];
                }
            }
            
            cleanResponse = cleanResponse.trim();
            
            try {
                parsedResponse = JSON.parse(cleanResponse);
            } catch (e) {
                console.log('JSON parsing failed, attempting to fix:', e.message);
                // If JSON parsing fails, try to extract data manually
                parsedResponse = this.parseNonJSONResponse(response);
            }

            if (!parsedResponse.scene || !parsedResponse.choices) {
                throw new Error('Invalid response format from LLM');
            }

            this.gameState.currentScene = parsedResponse;
            this.gameState.turnCount++;
            
            // Remove generating indicator
            const generatingIndicator = document.getElementById('generatingIndicator');
            if (generatingIndicator) {
                generatingIndicator.remove();
            }
            
            // Display content with typewriter effect (keep previous content)
            if (parsedResponse.narrative) {
                await this.displayNarrative(parsedResponse.narrative);
            }
            
            await this.displayScene(parsedResponse.scene);
            this.displayChoices(parsedResponse.choices);
            
            // Auto-scroll to bottom to show new content
            const dialogueContainer = document.getElementById('dialogueContainer');
            dialogueContainer.scrollTop = dialogueContainer.scrollHeight;
            
        } catch (error) {
            console.error('Failed to process LLM response:', error);
            console.error('Raw response:', response);
            
            // Remove generating indicator
            const generatingIndicator = document.getElementById('generatingIndicator');
            if (generatingIndicator) {
                generatingIndicator.remove();
            }
            
            // Provide fallback content to continue gameplay  
            console.log('Using fallback dialogue system');
            const fallbackResponse = {
                narrative: "The conversation continues in the garage...",
                scene: [
                    { character: 'Rick', text: 'Ugh, the portal gun is acting up again. Classic interdimensional interference.' },
                    { character: 'Morty', text: 'Rick, I just want to know if we\'re safe now. That was really scary.' }
                ],
                choices: [
                    "Ask Rick to explain what went wrong",
                    "Suggest checking the equipment for damage", 
                    "Express relief that you both made it back"
                ]
            };
            
            if (fallbackResponse.narrative) {
                await this.displayNarrative(fallbackResponse.narrative);
            }
            await this.displayScene(fallbackResponse.scene);
            this.displayChoices(fallbackResponse.choices);
            
            // Auto-scroll to bottom to show new content
            const dialogueContainer = document.getElementById('dialogueContainer');
            dialogueContainer.scrollTop = dialogueContainer.scrollHeight;
        }
    }

    // Parse non-JSON response (fallback)
    parseNonJSONResponse(response) {
        // Simple parser for cases where LLM doesn't return proper JSON
        console.warn('Parsing non-JSON response:', response);
        
        // Create a basic alternating dialogue structure
        const scene = [
            { character: "Rick", dialogue: "Look, Morty, the story generator's being weird again." },
            { narrative: "Rick waves his hand dismissively while Morty looks confused." },
            { character: "Morty", dialogue: "Aw geez, Rick, can't you just fix it?" },
            { narrative: "The tension in the garage grows as technical difficulties interrupt their moment." },
            { character: "Rick", dialogue: "I'm working on it, okay? These things happen." }
        ];
        
        const choices = [
            "Try to help Rick fix the problem",
            "Wait patiently for Rick to handle it", 
            "Suggest taking a break from the adventure"
        ];
        
        return { 
            narrative: "The story engine encounters some technical difficulties, but Rick and Morty continue their conversation.",
            scene, 
            choices 
        };
    }

    // Display narrative text with typewriter effect
    async displayNarrative(narrative) {
        const dialogueContent = document.getElementById('dialogueContent');
        
        const narrativeElement = document.createElement('div');
        narrativeElement.className = 'narrative-text';
        
        dialogueContent.appendChild(narrativeElement);
        
        // Typewriter effect for narrative
        await this.typewriterEffectHTML(narrativeElement, `<em>${narrative}</em>`, this.typingSpeed.narrative);
    }

    // Display scene dialogue and narrative with typewriter effect
    async displayScene(scene) {
        const dialogueContent = document.getElementById('dialogueContent');
        
        for (const item of scene) {
            if (item.character) {
                // This is character dialogue
                const dialogueLine = document.createElement('div');
                dialogueLine.className = `dialogue-line ${item.character.toLowerCase()}`;
                
                const avatar = document.createElement('img');
                avatar.className = 'character-avatar';
                avatar.src = `assets/${item.character.toLowerCase()}-avatar.jpg`;
                avatar.alt = `${item.character} Avatar`;
                avatar.onerror = () => {
                    console.error(`Failed to load avatar: ${avatar.src}`);
                    avatar.style.display = 'none';
                };
                
                const textContainer = document.createElement('div');
                textContainer.className = 'dialogue-text';
                
                const characterName = document.createElement('div');
                characterName.className = 'character-name';
                characterName.textContent = item.character;
                
                const dialogueText = document.createElement('div');
                
                textContainer.appendChild(characterName);
                textContainer.appendChild(dialogueText);
                
                dialogueLine.appendChild(avatar);
                dialogueLine.appendChild(textContainer);
                
                dialogueContent.appendChild(dialogueLine);
                
                // Process basic markdown formatting
                let formattedText = item.dialogue
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italics
                    .replace(/_(.*?)_/g, '<em>$1</em>'); // Underline to italics
                
                // Typewriter effect for dialogue
                await this.typewriterEffectHTML(dialogueText, formattedText, this.typingSpeed.dialogue);
                
            } else if (item.narrative) {
                // This is narrative text between dialogue
                const narrativeElement = document.createElement('div');
                narrativeElement.className = 'narrative-text';
                
                dialogueContent.appendChild(narrativeElement);
                
                // Typewriter effect for narrative
                await this.typewriterEffectHTML(narrativeElement, `<em>${item.narrative}</em>`, this.typingSpeed.narrative);
            }
        }
        
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
        // Display the selected choice in the dialogue
        this.displayPlayerChoice(choice);
        
        // Remove choice buttons
        document.getElementById('choicesContainer').innerHTML = '';
        
        // Update relationship based on choice (simple logic)
        this.updateRelationship(index);
        
        try {
            const prompt = this.buildPrompt(choice);
            const response = await this.callLLM(prompt);
            await this.processLLMResponse(response);
        } catch (error) {
            console.error('Failed to get next scene:', error);
            this.showError('Failed to continue the story. Please try again.');
        }
    }

    // Update relationship level
    updateRelationship(choiceIndex) {
        // Moderate relationship changes
        // First choice: +5, Second: 0, Third: -3
        const changes = [5, 0, -3];
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
        if (this.gameState.relationshipLevel < 20) {
            status = 'Very Tense';
        } else if (this.gameState.relationshipLevel < 40) {
            status = 'Tense';
        } else if (this.gameState.relationshipLevel < 60) {
            status = 'Neutral';
        } else if (this.gameState.relationshipLevel < 80) {
            status = 'Friendly';
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
            // Clear dialogue content and choices
            document.getElementById('dialogueContent').innerHTML = '';
            document.getElementById('choicesContainer').innerHTML = '';
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
                .map((scene, index) => `<div class="history-entry"><strong>Scene ${index + 1}:</strong><br>${scene.replace(/\n/g, '<br>')}</div>`)
                .join('<hr style="border-color: #333; margin: 20px 0;">');
        }
        
        modal.style.display = 'block';
    }

    // Hide history modal
    hideHistory() {
        document.getElementById('historyModal').style.display = 'none';
    }

    // Update typing speed
    updateTypingSpeed(speed) {
        switch(speed) {
            case 'slow':
                this.typingSpeed = { dialogue: 30, narrative: 25 };
                break;
            case 'normal':
                this.typingSpeed = { dialogue: 15, narrative: 12 };
                break;
            case 'fast':
                this.typingSpeed = { dialogue: 5, narrative: 3 };
                break;
            case 'instant':
                this.typingSpeed = { dialogue: 0, narrative: 0 };
                break;
        }
    }

    // Retry connection
    retryConnection() {
        this.hideError();
        this.initializeGame();
    }

    // Save progress to localStorage
    saveProgress() {
        try {
            localStorage.setItem('rickortyGameSave', JSON.stringify(this.gameState));
            alert('Progress saved!');
        } catch (e) {
            alert('Failed to save progress.');
        }
    }

    // Load progress from localStorage
    loadProgress() {
        try {
            const data = localStorage.getItem('rickortyGameSave');
            if (data) {
                this.gameState = JSON.parse(data);
                this.updateRelationshipDisplay();
                this.showLoadedProgress();
                alert('Progress loaded!');
            } else {
                alert('No saved progress found.');
            }
        } catch (e) {
            alert('Failed to load progress.');
        }
    }

    // Optionally show loaded progress (refresh UI)
    showLoadedProgress() {
        // Redraw dialogue, choices, etc. as needed
        // For now, just restart the current scene
        document.getElementById('dialogueContent').innerHTML = '';
        document.getElementById('choicesContainer').innerHTML = '';
        if (this.gameState.currentScene) {
            this.displayScene(this.gameState.currentScene.scene || []);
            this.displayChoices(this.gameState.currentScene.choices || []);
        }
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
