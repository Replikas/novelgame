# Rickorty: Fall Damage - Visual Novel Game

## Overview

Rickorty: Fall Damage is a browser-based visual novel game featuring Rick and Morty characters. The game uses AI-powered dialogue generation through the Chutes API to create dynamic, branching storylines based on player choices. Players navigate an emotional narrative between Rick and Morty in a post-mission garage setting, with multiple possible endings and a relationship tracking system.

## System Architecture

### Frontend Architecture
- **Pure Client-Side Application**: Built with vanilla HTML, CSS, and JavaScript
- **Single Page Application (SPA)**: All game content loads dynamically without page refreshes
- **Responsive Design**: Mobile-friendly interface that scales across devices
- **Component-Based Structure**: Modular game elements (dialogue box, choice buttons, relationship tracker)

### Backend Architecture
- **Serverless Frontend**: No traditional backend - static files served via Python HTTP server
- **AI Integration**: External API calls to Chutes AI service for dynamic content generation
- **Local State Management**: Browser-based game state using JavaScript classes and localStorage

## Key Components

### 1. Game Engine (`RickortyGame` class)
- **Purpose**: Central game state management and API coordination
- **Responsibilities**: 
  - Managing story progression and player choices
  - Handling API communication with Chutes AI
  - Tracking relationship dynamics between characters
  - Coordinating UI updates and game flow

### 2. User Interface Components
- **Dialogue System**: Dynamic text display with character avatars
- **Choice System**: Interactive button-based decision making
- **Relationship Tracker**: Visual progress bar showing character relationship status
- **Game Controls**: Restart functionality and story history viewer

### 3. Visual Assets
- **Character Avatars**: Custom SVG graphics for Rick and Morty
- **Styling System**: Dark theme with Rick and Morty aesthetic
- **Responsive Layout**: Flexible CSS grid and flexbox implementation

### 4. AI Integration Layer
- **API Client**: Handles requests to Chutes AI completions endpoint
- **Prompt Engineering**: Structures game context for consistent character responses
- **Response Processing**: Parses AI responses into game-ready dialogue and choices

## Data Flow

1. **Game Initialization**: Load game state, initialize UI components
2. **Story Generation**: Send current context to Chutes AI API
3. **Content Display**: Render AI-generated dialogue with character avatars
4. **Player Interaction**: Present choices and capture player selection
5. **State Update**: Modify relationship levels and story history
6. **Loop Continuation**: Return to step 2 with updated context

### API Communication Flow
```
Player Choice → Game State Update → API Request (with context) → 
AI Response → Content Parsing → UI Update → Await Next Choice
```

## External Dependencies

### Primary Dependencies
- **Chutes AI API**: Core dialogue and choice generation
- **Browser APIs**: localStorage for state persistence, fetch for HTTP requests

### Development Dependencies
- **Python HTTP Server**: Local development serving (port 5000)
- **Modern Browser**: ES6+ JavaScript support required

### API Integration Details
- **Endpoint**: `https://api.chutes.ai/v1/chat/completions`
- **Authentication**: API key stored in localStorage
- **Request Format**: Chat completions with game context and character definitions
- **Response Processing**: Extracts dialogue text and player choice options

## Deployment Strategy

### Current Setup
- **Static File Serving**: Python's built-in HTTP server for development
- **Port Configuration**: Default port 5000 with automatic port waiting
- **Asset Management**: All assets (HTML, CSS, JS, SVGs) served statically

### Production Considerations
- **CDN Deployment**: Static files can be deployed to any web server or CDN
- **API Key Management**: Secure API key storage needed for production
- **HTTPS Requirements**: Chutes API requires secure connections
- **Browser Compatibility**: Modern browser features used throughout

### Environment Configuration
- **Replit Integration**: Configured for Replit's workflow system
- **Multi-language Support**: Node.js and Python modules available
- **Parallel Execution**: Workflow supports concurrent task execution

## Changelog
- June 18, 2025: Initial setup and complete implementation
  - Built full visual novel game with AI-powered dialogue
  - Integrated Chutes API with DeepSeek model for story generation
  - Implemented character avatars and relationship tracking system
  - Added interactive choice system affecting story progression

## User Preferences

Preferred communication style: Simple, everyday language.
UI preferences: Less intrusive loading indicators, prefer inline loading in story box rather than full-screen overlays.