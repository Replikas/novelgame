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
        this.typingSpeed = {
            dialogue: 15,
            narrative: 12
        };
        this.avatarReactions = {
            rick: null,
            morty: null
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
            relationshipLevel: 50,
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
                    content: "You are a creative writing assistant specializing in character-driven dialogue for visual novels. Respond only with the requested JSON format. Do not include thinking tags, explanations, or any text outside the JSON structure."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 800,
            temperature: 0.7,
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
            this.showError('Failed to process the story response. Please try again.');
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
                
                const avatarContainer = document.createElement('div');
                avatarContainer.className = 'avatar-container';
                
                const avatar = document.createElement('img');
                avatar.className = 'character-avatar';
                avatar.id = `avatar-${item.character.toLowerCase()}`;
                avatar.src = `assets/${item.character.toLowerCase()}-avatar.jpg`;
                avatar.alt = `${item.character} Avatar`;
                avatar.onerror = () => {
                    console.error(`Failed to load avatar: ${avatar.src}`);
                    avatar.style.display = 'none';
                };
                
                avatarContainer.appendChild(avatar);
                
                const textContainer = document.createElement('div');
                textContainer.className = 'dialogue-text';
                
                const characterName = document.createElement('div');
                characterName.className = 'character-name';
                characterName.textContent = item.character;
                
                const dialogueText = document.createElement('div');
                
                textContainer.appendChild(characterName);
                textContainer.appendChild(dialogueText);
                
                dialogueLine.appendChild(avatarContainer);
                dialogueLine.appendChild(textContainer);
                
                dialogueContent.appendChild(dialogueLine);
                
                // Process basic markdown formatting
                let formattedText = item.dialogue
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italics
                    .replace(/_(.*?)_/g, '<em>$1</em>'); // Underline to italics
                
                // Add avatar reaction based on dialogue content
                this.addAvatarReaction(item.character, item.text);
                
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

    // Add avatar reaction based on dialogue content
    addAvatarReaction(character, text) {
        const characterKey = character.toLowerCase();
        const avatarId = `avatar-${characterKey}`;
        const avatar = document.getElementById(avatarId);
        
        if (!avatar) return;
        
        // Remove existing reaction
        const existingReaction = avatar.parentElement.querySelector('.avatar-reaction');
        if (existingReaction) {
            existingReaction.remove();
        }
        
        // Determine reaction based on text content
        let reaction = this.determineReaction(text, character);
        
        if (reaction) {
            const reactionElement = document.createElement('div');
            reactionElement.className = `avatar-reaction reaction-${reaction.type}`;
            reactionElement.textContent = reaction.emoji;
            reactionElement.title = reaction.description;
            
            avatar.parentElement.appendChild(reactionElement);
            
            // Remove reaction after 3 seconds
            setTimeout(() => {
                if (reactionElement.parentElement) {
                    reactionElement.remove();
                }
            }, 3000);
        }
    }
    
    // Determine reaction based on dialogue content and character
    determineReaction(text, character) {
        const lowerText = text.toLowerCase();
        
        // Character-specific reactions
        if (character === 'Rick') {
            if (lowerText.includes('burp') || lowerText.includes('*burp*')) {
                return { type: 'confused', emoji: '🍺', description: 'Burping' };
            }
            if (lowerText.includes('morty') && (lowerText.includes('idiot') || lowerText.includes('stupid'))) {
                return { type: 'angry', emoji: '😤', description: 'Annoyed' };
            }
            if (lowerText.includes('science') || lowerText.includes('genius')) {
                return { type: 'happy', emoji: '🧠', description: 'Proud' };
            }
            if (lowerText.includes('sorry') || lowerText.includes('my bad')) {
                return { type: 'surprised', emoji: '😯', description: 'Surprised' };
            }
        } else if (character === 'Morty') {
            if (lowerText.includes('rick') && lowerText.includes('!')) {
                return { type: 'surprised', emoji: '😰', description: 'Worried' };
            }
            if (lowerText.includes('geez') || lowerText.includes('oh man')) {
                return { type: 'confused', emoji: '😅', description: 'Nervous' };
            }
            if (lowerText.includes('sorry') || lowerText.includes('i didn\'t mean')) {
                return { type: 'sad', emoji: '😔', description: 'Apologetic' };
            }
            if (lowerText.includes('thanks') || lowerText.includes('appreciate')) {
                return { type: 'happy', emoji: '😊', description: 'Grateful' };
            }
        }
        
        // General emotional reactions
        if (lowerText.includes('angry') || lowerText.includes('mad') || lowerText.includes('furious')) {
            return { type: 'angry', emoji: '😠', description: 'Angry' };
        }
        if (lowerText.includes('happy') || lowerText.includes('glad') || lowerText.includes('excited')) {
            return { type: 'happy', emoji: '😄', description: 'Happy' };
        }
        if (lowerText.includes('sad') || lowerText.includes('upset') || lowerText.includes('crying')) {
            return { type: 'sad', emoji: '😢', description: 'Sad' };
        }
        if (lowerText.includes('surprised') || lowerText.includes('shocked') || lowerText.includes('wow')) {
            return { type: 'surprised', emoji: '😲', description: 'Surprised' };
        }
        if (lowerText.includes('confused') || lowerText.includes('what') || lowerText.includes('huh')) {
            return { type: 'confused', emoji: '🤔', description: 'Confused' };
        }
        if (lowerText.includes('blush') || lowerText.includes('embarrassed') || lowerText.includes('awkward')) {
            return { type: 'blush', emoji: '😊', description: 'Blushing' };
        }
        
        return null;
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
