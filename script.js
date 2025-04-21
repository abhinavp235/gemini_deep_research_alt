// --- DOM Elements ---
const configSection = document.getElementById('config-section');
const researchSection = document.getElementById('research-section');
const progressSection = document.getElementById('progress-section');
const resultsSection = document.getElementById('results-section');
const processSummarySection = document.getElementById('process-summary-section');

const modelSelect = document.getElementById('model-select');
const apiKeyInput = document.getElementById('api-key');
const fileUploadInput = document.getElementById('file-upload');
const fileInfoDiv = document.getElementById('file-info');
const saveConfigButton = document.getElementById('save-config');

const researchTopicInput = document.getElementById('research-topic');
const startResearchButton = document.getElementById('start-research');

const loader = document.getElementById('loader'); // Main initial loader
const initialScanOutputDiv = document.getElementById('initial-scan-output');
const initialScanContentDiv = initialScanOutputDiv.querySelector('.content-markdown');

const suggestionsArea = document.getElementById('suggestions-area'); // Ensure this exists
const suggestionButtonsDiv = document.getElementById('suggestion-buttons'); // Ensure this exists
const noSuggestionsMessage = document.getElementById('no-suggestions-message'); // Add reference
const topLevelCustomDiveGroup = document.getElementById('top-level-custom-dive'); // Add reference
const topLevelCustomInput = topLevelCustomDiveGroup?.querySelector('.custom-dive-input'); // Add reference
const topLevelCustomButton = topLevelCustomDiveGroup?.querySelector('.custom-dive-button'); // Add reference

const synthesizeButton = document.getElementById('synthesize-button');

const deepDiveResultsDiv = document.getElementById('deep-dive-results');
const deepDiveContentContainer = document.getElementById('deep-dive-content-container');

const synthesisLoader = document.getElementById('synthesis-loader');
const finalReportContentDiv = document.getElementById('final-report-content');
const processDetailsDiv = document.getElementById('process-details');

const actionFooter = document.getElementById('action-footer'); // Add footer ref
const footerResetButton = document.getElementById('footer-reset-button'); // Add footer button ref
const footerSynthesizeButton = document.getElementById('footer-synthesize-button'); // Add footer button ref
// const resetButton = document.getElementById('reset-button'); // Remove old reset button ref
const currentActionStatusDiv = document.getElementById('current-action-status'); // Add reference
const toneSelect = document.getElementById('tone-select');
const opposingViewsCheckbox = document.getElementById('opposing-views-checkbox');
const customFocusInput = document.getElementById('custom-focus-input');


// const resetButton = document.getElementById('reset-button');

// --- State Variables ---
let apiKey = '';
let selectedModel = modelSelect.value;
let fileContents = []; // Array to hold { name: string, content: string }
let researchHistory = []; // Stores { title: string, content: string (Markdown) }
let processLog = []; // Stores { step: string, reasoning: string, output_summary: string, user_choice?: string }
let suggestedTopics = []; // Stores strings of suggested topics
let completedDeepDives = 0; // Count completed deep dives
let totalSuggestions = 0; // Count total suggestions made
let currentTopic = ""; // The main research topic
let selectedTone = 'Neutral/Objective'; // Default value
let includeOpposingViews = true; // Default value
let customFocus = ''; // Default value

// --- Application States ---
const AppState = {
    CONFIG: 'CONFIG',
    READY_TO_START: 'READY_TO_START',
    INITIAL_SCANNING: 'INITIAL_SCANNING',
    SHOWING_SUGGESTIONS: 'SHOWING_SUGGESTIONS',
    DEEP_DIVING: 'DEEP_DIVING', // Generic state while any dive is happening
    READY_FOR_SYNTHESIS: 'READY_FOR_SYNTHESIS', // At least one dive done
    SYNTHESIZING: 'SYNTHESIZING',
    DONE: 'DONE',
    ERROR: 'ERROR'
};
let currentState = AppState.CONFIG;

// --- Constants ---
const API_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

// --- Event Listeners ---
// Modify the listener attachment point for broader scope if needed,
// or rely on the specific container existing. Let's try attaching
// to the progress section to catch clicks on dynamically added buttons.
// Remove: suggestionButtonsDiv.addEventListener('click', handleSuggestionClick);
// Add:
progressSection.addEventListener('click', handleGenericButtonClick); // Handles both types
saveConfigButton.addEventListener('click', saveConfig);
modelSelect.addEventListener('change', () => { selectedModel = modelSelect.value; });
fileUploadInput.addEventListener('change', handleFileUpload);
startResearchButton.addEventListener('click', startInitialScan);
// synthesizeButton.addEventListener('click', startSynthesis);
// ... (keep existing listeners like saveConfig, fileUpload, startResearch) ...
// Remove old reset listener: resetButton.addEventListener('click', handleReset);
// Add footer listeners:
footerResetButton.addEventListener('click', handleReset); // Point reset to footer button
footerSynthesizeButton.addEventListener('click', startSynthesis); // Point synthesize to footer button
// Keep generic button click for suggestions/custom dives:
progressSection.addEventListener('click', handleGenericButtonClick);
// Add listener for copy buttons (using event delegation on body)
document.body.addEventListener('click', handleCopyClick);
// Event delegation for suggestion buttons
// suggestionButtonsDiv.addEventListener('click', handleSuggestionClick);

// --- Initialization ---
function initializeApp() {
    // Ensure marked.js is loaded
    if (typeof marked === 'undefined') {
        console.error("marked.js library not loaded. Please ensure marked.min.js is included correctly.");
        alert("Error: Markdown library (marked.js) failed to load. Please check the console.");
        // Optionally disable functionality
        configSection.innerHTML = "<p style='color: var(--error-color);'>Error: Markdown library failed to load. App cannot function.</p>";
        return;
    }
     // Configure marked options (optional, e.g., enable GitHub Flavored Markdown)
     marked.setOptions({
         gfm: true, // Enable GitHub Flavored Markdown
         breaks: true, // Convert single line breaks to <br>
         mangle: false, // prevents marked from changing mail addresses
         headerIds: false // prevents marked from adding id="" to header tags
     });
    console.log("App Initialized, marked.js loaded.");
    updateUIForState(AppState.CONFIG);
}

// --- Helper Function for Status Updates ---
function updateCurrentActionStatus(statusText, isWorking = false) {
    if (!currentActionStatusDiv) return;
    currentActionStatusDiv.textContent = `Status: ${statusText}`;
    if (isWorking) {
        currentActionStatusDiv.classList.add('working');
    } else {
        currentActionStatusDiv.classList.remove('working');
    }
}

// --- State Management and UI Updates (Control Footer) ---
function updateUIForState(newState) {
    currentState = newState;
    console.log("Updating UI for state:", currentState);

    // --- Reset common elements ---
    loader.style.display = 'none';
    synthesisLoader.style.display = 'none';
    // Button Enables/Disables
    startResearchButton.disabled = true;
    researchTopicInput.disabled = true;
    // Footer buttons
    actionFooter.style.display = 'none'; // Hide footer by default
    footerResetButton.disabled = true;
    footerSynthesizeButton.style.display = 'none'; // Hide synthesize by default
    footerSynthesizeButton.disabled = true;

    // --- Show/hide sections based on state ---
    configSection.style.display = (currentState === AppState.CONFIG) ? 'block' : 'none';
    researchSection.style.display = (currentState !== AppState.CONFIG) ? 'block' : 'none';
    progressSection.style.display = (currentState !== AppState.CONFIG && currentState !== AppState.READY_TO_START) ? 'block' : 'none';
    resultsSection.style.display = (currentState === AppState.SYNTHESIZING || currentState === AppState.DONE || (currentState === AppState.ERROR && researchHistory.length > 0)) ? 'block' : 'none';
    processSummarySection.style.display = (currentState === AppState.DONE || (currentState === AppState.ERROR && researchHistory.length > 0)) ? 'block' : 'none';

    // --- Control Footer and Specific Buttons ---
    if (currentState !== AppState.CONFIG) {
         actionFooter.style.display = 'block'; // Show footer once config is done
    }

    if (currentState === AppState.READY_TO_START) {
        startResearchButton.disabled = false;
        footerResetButton.disabled = false; // Enable footer reset
        researchTopicInput.disabled = false;
        researchTopicInput.value = '';
        fileInfoDiv.textContent = 'No files selected.';
        progressSection.style.display = 'none';
        resultsSection.style.display = 'none';
        processSummarySection.style.display = 'none';
        actionFooter.style.display = 'block'; // Ensure footer shown
    } else if (currentState === AppState.INITIAL_SCANNING) {
        loader.style.display = 'block';
        footerResetButton.disabled = true;
    } else if (currentState === AppState.SHOWING_SUGGESTIONS || currentState === AppState.READY_FOR_SYNTHESIS || currentState === AppState.DEEP_DIVING) {
         footerResetButton.disabled = (currentState === AppState.DEEP_DIVING); // Disable reset only while actively diving
        // Synthesize button visibility/state:
        if (completedDeepDives > 0) {
             footerSynthesizeButton.style.display = 'inline-block'; // Show button
             footerSynthesizeButton.disabled = (currentState === AppState.DEEP_DIVING || currentState === AppState.SYNTHESIZING); // Disable if busy
        } else {
             footerSynthesizeButton.style.display = 'none'; // Hide if no dives complete
        }
    } else if (currentState === AppState.SYNTHESIZING) {
        synthesisLoader.style.display = 'block';
        footerResetButton.disabled = true;
        if (footerSynthesizeButton) footerSynthesizeButton.disabled = true;
    } else if (currentState === AppState.DONE) {
        footerResetButton.disabled = false;
        if (footerSynthesizeButton) footerSynthesizeButton.style.display = 'none';
    } else if (currentState === AppState.ERROR) {
         footerResetButton.disabled = false;
         if (completedDeepDives > 0 && footerSynthesizeButton) {
             footerSynthesizeButton.style.display = 'inline-block';
             footerSynthesizeButton.disabled = true; // Keep disabled on error
         }
    }
}

// --- NEW: Handler for Copy Buttons ---
async function handleCopyClick(event) {
    const button = event.target.closest('.copy-button');
    if (!button) return; // Exit if click wasn't on a copy button

    const rawMarkdown = button.dataset.copyContent;
    if (!rawMarkdown) {
        console.error("No content found to copy.");
        return;
    }

    try {
        await navigator.clipboard.writeText(rawMarkdown);
        console.log("Content copied to clipboard.");
        // Provide feedback
        button.textContent = "Copied!";
        button.classList.add("copied");
        setTimeout(() => {
            button.textContent = "Copy";
            button.classList.remove("copied");
        }, 1500); // Reset after 1.5 seconds
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy text. Your browser might not support this feature or permissions were denied.');
    }
}

// --- NEW: Handler for Reset Button ---
function handleReset() {
    console.log("--- Resetting Application State ---");
    // Optional: Ask for confirmation?
    // if (!confirm("Are you sure you want to reset the research? All progress will be lost.")) {
    //     return;
    // }

    // Clear all state and UI elements related to research results
    resetResearchState(true);

    // Set the state back to allow entering a new topic
    // (Keeps API key and selected model)
    updateUIForState(AppState.READY_TO_START);
}

// --- Configuration and File Handling (Mostly unchanged) ---
function saveConfig() {
    apiKey = apiKeyInput.value.trim();
    selectedModel = modelSelect.value;
    if (!apiKey) {
        alert('Please enter your Google AI API Key.');
        return;
    }
    console.log(`Config saved. Model: ${selectedModel}. Files: ${fileContents.length}`);
    updateUIForState(AppState.READY_TO_START);
    alert('Configuration saved. Please enter your research topic and start the initial scan.');
}

function handleFileUpload(event) {
    // (Identical to previous version - reads text files into fileContents)
    const files = event.target.files;
    if (!files.length) {
        fileInfoDiv.textContent = 'No files selected.';
        fileContents = [];
        return;
    }
    fileContents = [];
    const filePromises = [];
    let fileNames = [];
    for (const file of files) {
         fileNames.push(file.name);
        if (file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('xml') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
            const reader = new FileReader();
            const promise = new Promise((resolve, reject) => {
                reader.onload = (e) => {
                    fileContents.push({ name: file.name, content: e.target.result });
                    resolve();
                };
                reader.onerror = (e) => {
                     console.error(`Error reading file ${file.name}:`, e);
                     alert(`Error reading file ${file.name}. Skipping.`);
                     resolve(); // Resolve anyway to not block others
                };
                reader.readAsText(file);
            });
            filePromises.push(promise);
        } else {
            console.warn(`Skipping non-text file: ${file.name} (Type: ${file.type})`);
        }
    }
    Promise.all(filePromises).then(() => {
         if(fileContents.length > 0) {
            fileInfoDiv.textContent = `Selected: ${fileNames.filter(name => fileContents.some(f => f.name === name)).join(', ')}`;
            console.log("File contents loaded:", fileContents.length);
         } else {
             fileInfoDiv.textContent = 'No compatible text files selected or loaded.';
         }
    }).catch(error => {
        console.error("Error processing files:", error);
         fileInfoDiv.textContent = 'Error reading one or more files.';
    });
}


// --- Core Research Logic ---
// Function to start the initial scan (with added logging)
// Modified: Differentiate between top-level and nested custom dives
function handleGenericButtonClick(event) {
    const button = event.target.closest('button');
    if (!button) return;

    const isSuggestion = button.classList.contains('suggestion-button');
    const isSubSuggestion = button.classList.contains('sub-suggestion-button');
    const isCustomDive = button.classList.contains('custom-dive-button');

    if (isSuggestion || isSubSuggestion) {
        // --- Handle AI Suggestion Clicks (No Change Needed) ---
        const topic = button.dataset.topic;
        if (button.classList.contains('loading') || button.classList.contains('completed')) {
            return;
        }
        // Determine if it's a sub-suggestion based on class
        const isSub = button.classList.contains('sub-suggestion-button');
        performDeepDive(topic, button, isSub);

    } else if (isCustomDive) {
        // --- Handle Custom Dive Button Click ---
        const inputGroup = button.closest('.custom-dive-input-group');
        if (!inputGroup) return;
        const inputElement = inputGroup.querySelector('.custom-dive-input');
        if (!inputElement) return;

        const customTopic = inputElement.value.trim();
        if (!customTopic) {
            alert("Please enter a question or topic to explore.");
            inputElement.focus();
            return;
        }
        console.log(`Custom dive requested for: "${customTopic}"`);

        // *** Determine Context (Top-Level vs Nested) ***
        const parentItem = button.closest('.deep-dive-item');
        const isSub = (parentItem !== null); // It's a sub-dive if nested within a result item
        const parentItemForNesting = parentItem; // Pass parent item only if it exists

        console.log(`Custom dive context: isSub = ${isSub}`);

        // Disable input and button
        inputElement.disabled = true;
        button.disabled = true;

        // Call performDeepDive, passing correct isSub flag and parent context
        performDeepDive(customTopic, null, isSub, parentItemForNesting);
    }
}

async function startInitialScan() {
    currentTopic = researchTopicInput.value.trim();
    currentTopic_OG = currentTopic
    // *** ADDED: Log the value read from the textarea ***
    console.log(`Read research topic value: "${currentTopic}"`);
    // *** END ADDED LOG ***
    if (!currentTopic) {
        alert('Please enter a research topic.');
        return;
    }
    if (!apiKey) {
        alert('API Key not set. Please configure first.');
        updateUIForState(AppState.CONFIG);
        return;
    }
    // *** Read Tone Controls ***
    selectedTone = toneSelect.value;
    includeOpposingViews = opposingViewsCheckbox.checked;
    customFocus = customFocusInput.value.trim();
    console.log(`Starting research with Tone: ${selectedTone}, Opposing Views: ${includeOpposingViews}, Custom Focus: "${customFocus || 'None'}"`);
    // *** --- ***

    updateUIForState(AppState.INITIAL_SCANNING);
    resetResearchState(false);
    updateCurrentActionStatus("Performing initial grounded scan...", true); // Update status
    // currentTopic = researchTopicInput.value.trim();
    currentTopic = currentTopic_OG
    // *** ADDED: Log the value read from the textarea ***
    console.log(`Read research topic value: "${currentTopic}"`);
    // *** END ADDED LOG ***

    addProcessLog('Initiation', `Starting research for topic: "${currentTopic}"`, `User input topic.`);
    console.log("--- Starting Initial Scan ---"); // Added log

    try {
        const initialPrompt = buildInitialPrompt(currentTopic);
        console.log("--- Initial Prompt ---"); // Added log
        console.log(initialPrompt); // Added log

        const initialResponse = await callGeminiAPI(initialPrompt, true);

        // *** ADDED: Log the raw response ***
        console.log("--- Raw Initial API Response ---");
        console.log(initialResponse);
        // *** END ADDED LOG ***
        updateCurrentActionStatus("Initial scan complete. Review overview and suggestions.", false); // Update status on success

        researchHistory.push({ title: 'Initial Scan & Plan', content: initialResponse });
        addProcessLog('Initial Scan', 'Performed grounded search for overview and suggestions.', summarizeContent(initialResponse, 150));

         // --- Render initial scan markdown ---
        initialScanContentDiv.innerHTML = ''; // Clear previous
        renderMarkdown(initialScanContentDiv, initialResponse, initialResponse); // Pass raw text
        initialScanOutputDiv.style.display = 'block';

        // Extract suggestions
        suggestedTopics = extractSuggestions(initialResponse); // This function now has enhanced logging too
        totalSuggestions = suggestedTopics.length;
        completedDeepDives = 0;
        suggestionsArea.style.display = 'block'; // Show the whole suggestions area

        if (suggestedTopics.length > 0) {
            console.log(`Successfully extracted ${suggestedTopics.length} suggestions.`);
            noSuggestionsMessage.style.display = 'none'; // Hide message
            displaySuggestions(suggestedTopics); // Display AI buttons
            updateUIForState(AppState.SHOWING_SUGGESTIONS);
        } else {
            console.warn("No suggestions extracted.");
            addProcessLog('Initial Scan Warning', 'No specific sub-topics extracted.', 'Showing custom input.');
            suggestionButtonsDiv.innerHTML = ''; // Clear any potential leftover buttons
            noSuggestionsMessage.style.display = 'block'; // Show message
        }
        // *** ALWAYS show the top-level custom input group after initial scan ***
        if (topLevelCustomDiveGroup) {
            topLevelCustomDiveGroup.style.display = 'flex'; // Make it visible
            if (topLevelCustomInput) topLevelCustomInput.disabled = false; // Ensure input is enabled
            if (topLevelCustomButton) topLevelCustomButton.disabled = false; // Ensure button is enabled
        }
        // *** --- ***
        // Update state (might allow synthesis if no suggestions, or wait for dives)
        // Let's require at least one dive (AI or custom) before enabling synthesis
        updateUIForState(AppState.SHOWING_SUGGESTIONS); // Or a similar state indicating interaction is possible


    } catch (error) {
        console.error("Initial Scan failed:", error);
        updateCurrentActionStatus("Error during initial scan.", false); // Update status on error
        renderError(`Initial Scan failed: ${error.message}`);
        updateUIForState(AppState.ERROR);
    } finally {
        if (currentState !== AppState.INITIAL_SCANNING) loader.style.display = 'none';
        displayProcessLog();
    }
}

// Updated prompt builder with stricter formatting instructions
function buildInitialPrompt(topic) {
    let contextFilesString = "";
    if (fileContents.length > 0) {
        contextFilesString = "\n\nConsider the following context provided in these uploaded files:\n";
        fileContents.forEach(file => {
            contextFilesString += `--- File: ${file.name} ---\n${file.content}\n--- End File: ${file.name} ---\n\n`;
        });
    }
    // Get tone instructions
    const toneInstructions = getToneFocusInstructions();

    // *** Refined Instructions ***
    return `Act as a senior researcher initiating a deep dive into the topic: "${topic}".

${toneInstructions}

Your first task is to perform an initial, **up-to-date, grounded analysis** using Google Search, adhering to the tone and focus guidelines above. Provide:
1.  A comprehensive overview of the current state of the topic.
2.  Mention major ongoing debates or controversies (considering the guideline on opposing views).
3.  Identify and list 3-5 specific, actionable sub-topics or key questions for deeper investigation (formatted as a numbered list starting after "Suggested Deep Dive Topics:").
4.  Provide verifiable URL links as citations **within the overview text** using Markdown format \`[source text](URL)\`.

${contextFilesString}

Ensure the entire output is in Markdown format.`;
    // *** End Refined Instructions ***
}


// Updated extraction function with more logging and slight flexibility
function extractSuggestions(text) {
    console.log("--- Attempting to Extract Suggestions ---"); // Added log
    const suggestions = [];
    if (!text) {
        console.log("Extraction failed: Input text is empty.");
        return suggestions; // Return empty if no text
    }
    const lines = text.split('\n');
    let capture = false;
    let foundSpecificHeader = false;

    // --- Strategy 1: Look for the specific header ---
    console.log("Trying Strategy 1: Looking for exact header 'Suggested Deep Dive Topics:'");
    const headerIndex = lines.findIndex(line => line.trim().toLowerCase() === 'suggested deep dive topics:');

    if (headerIndex !== -1) {
        console.log("Found specific header at line index:", headerIndex);
        foundSpecificHeader = true;
        capture = true; // Start capturing from the line *after* the header
        for (let i = headerIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            const match = line.trim().match(/^(\d+)\.?\s+(.*)/); // Match "1. Topic" or "1 Topic"
            if (match && match[2]) {
                console.log(`  Extracted (Strategy 1): "${match[2].trim()}"`);
                suggestions.push(match[2].trim());
            } else if (suggestions.length > 0 && line.trim() === '') {
                // Stop if we hit a blank line after finding some suggestions in this block
                console.log("  Stopping Strategy 1 capture due to blank line.");
                break;
            } else if (suggestions.length > 0 && !match && line.trim() !== '') {
                 // Stop if we found items but this line doesn't match format
                 console.log("  Stopping Strategy 1 capture due to non-matching line:", line);
                 break;
            }
        }
    } else {
         console.log("Specific header not found.");
    }

    // --- Strategy 2: Fallback - Look for keywords and then numbered/bulleted lists ---
    // Only run if Strategy 1 failed to find anything
    if (suggestions.length === 0) {
        console.log("Trying Strategy 2: Fallback keyword search + list detection");
        capture = false; // Reset capture flag
        const keywords = ["suggested topics", "explore further", "deep dive", "key questions", "areas to investigate"];
        let keywordFoundLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lowerLine = line.toLowerCase().trim();

            // Check if this line contains a keyword
            if (!capture && keywords.some(kw => lowerLine.includes(kw))) {
                console.log(`Found keyword hint "${keywords.find(kw => lowerLine.includes(kw))}" at line index ${i}`);
                capture = true; // Start looking for list items from the *next* line
                keywordFoundLine = i;
                continue; // Move to the next line
            }

            // If capturing (meaning a keyword line was found just before), look for list items
            if (capture) {
                // Match numbered lists (e.g., "1. Topic", "1 Topic")
                let match = line.trim().match(/^(\d+)\.?\s+(.*)/);
                if (match && match[2]) {
                     console.log(`  Extracted (Strategy 2 - Numbered): "${match[2].trim()}"`);
                    suggestions.push(match[2].trim());
                    continue; // Found a match, check next line
                }

                // Match bulleted lists (e.g., "* Topic", "- Topic", "+ Topic")
                match = line.trim().match(/^[-*+]\s+(.*)/);
                 if (match && match[1]) {
                     console.log(`  Extracted (Strategy 2 - Bulleted): "${match[1].trim()}"`);
                     suggestions.push(match[1].trim());
                     continue; // Found a match, check next line
                 }

                // Stop capturing for this keyword block if we hit a blank line or non-list item
                // after finding at least one suggestion OR if we are too far from the keyword line? (heuristic)
                const distance = keywordFoundLine !== -1 ? i - keywordFoundLine : i;
                if ((suggestions.length > 0 && line.trim() === '') || (suggestions.length > 0 && !match && line.trim() !== '') || (distance > 10 && suggestions.length == 0)) {
                    console.log("  Stopping Strategy 2 capture block for this keyword.");
                    capture = false; // Stop capturing for this block
                    keywordFoundLine = -1; // Reset keyword line index
                    // Don't break the outer loop, maybe another keyword appears later?
                }
            }
        }
    }

    console.log(`--- Finished Extraction: Found ${suggestions.length} suggestions ---`);
    return suggestions;
}


function displaySuggestions(topics) {
    suggestionButtonsDiv.innerHTML = ''; // Clear previous
    topics.forEach((topic, index) => {
        const button = document.createElement('button');
        button.classList.add('suggestion-button');
        button.textContent = topic;
        button.dataset.topic = topic; // Store topic data
        button.dataset.index = index; // Store index
        suggestionButtonsDiv.appendChild(button);
    });
    suggestionsArea.style.display = 'block';
}

function handleSuggestionClick(event) {
    if (event.target.tagName === 'BUTTON' && event.target.classList.contains('suggestion-button')) {
        const button = event.target;
        const topic = button.dataset.topic;

        // Prevent clicking if already loading or completed
        if (button.classList.contains('loading') || button.classList.contains('completed')) {
            return;
        }

        performDeepDive(topic, button);
    }
}

// Modified: Add optional parentItem parameter for explicit context
// Modified: Ensure isCustom is defined and used correctly
async function performDeepDive(topic, buttonElement, isSub = false, explicitParentItem = null) {
    // --- Define isCustom based on presence of buttonElement ---
    const isCustom = !buttonElement; // True if custom/no button, False if AI suggestion button provided
    // --- ---

    const diveType = isCustom ? "Custom" : "AI Suggestion";
    const levelText = isSub ? "Sub-Topic/Custom" : "Topic";

    console.log(`Starting deep dive for ${levelText} (${diveType}): "${topic}"`);
    updateCurrentActionStatus(`Exploring ${levelText}: "${topic}"...`, true);

    // State handling for suggestion buttons (if buttonElement is provided)
    if (buttonElement) {
        buttonElement.classList.add('loading');
        buttonElement.disabled = true;
    }
    updateUIForState(AppState.DEEP_DIVING);
    if (footerSynthesizeButton) footerSynthesizeButton.disabled = true;

    let parentTopicInfo = "";
    let parentDiveContent = null;
    let parentItemForNesting = explicitParentItem;

    if (isSub) {
        if (!parentItemForNesting && buttonElement) {
             parentItemForNesting = buttonElement.closest('.deep-dive-item');
        }
        if (parentItemForNesting) {
            const parentTitleElement = parentItemForNesting.querySelector('h4, h5');
            if (parentTitleElement) {
                parentTopicInfo = parentTitleElement.textContent.replace(/^Exploration: |^↳ Exploration: /, '').trim(); // Adjusted prefix removal
                console.log(`Identified parent topic: "${parentTopicInfo}"`);
                const parentHistoryEntry = researchHistory.slice().reverse().find(entry =>
                     entry.title.includes(parentTopicInfo) &&
                     !entry.title.startsWith('Final Report') && !entry.title.startsWith('Initial Scan')
                );
                if (parentHistoryEntry) {
                    parentDiveContent = parentHistoryEntry.content;
                    console.log(`Found parent content in history for "${parentTopicInfo}". Length: ${parentDiveContent?.length}`);
                } else {
                     console.warn(`Could not find parent content in history for "${parentTopicInfo}".`);
                }
                 parentTopicInfo = ` (refining "${parentTopicInfo}")`;
            }
        } else {
             console.warn("Could not determine parent item for nesting/context.");
        }
    }

    addProcessLog(`Deep Dive Start (${levelText}, ${diveType})`, `Exploring ${levelText}${parentTopicInfo}.`, `Topic: "${topic}"`);

    try {
        // Pass parent content to prompt builder
        const deepDivePrompt = buildDeepDivePrompt(currentTopic, topic, researchHistory, isSub, parentDiveContent);
        const deepDiveResponse = await callGeminiAPI(deepDivePrompt, true);

        updateCurrentActionStatus(`Completed exploration for: "${topic}". Review results.`, false); // Update status on success

        // Store result - Title includes parent context if available for clarity in history
        const historyTitle = isSub ? `Sub-Dive${parentTopicInfo}: ${topic}` : `Deep Dive: ${topic}`;
        researchHistory.push({ title: historyTitle, content: deepDiveResponse });
        addProcessLog(`Deep Dive Complete (${levelText}, ${diveType})`, `Completed deep dive.`, `Topic: "${topic}", Summary: ${summarizeContent(deepDiveResponse, 100)}`);

        const subSuggestions = extractSubSuggestions(deepDiveResponse);

        // Pass dive type info (isCustom) for styling
        displayDeepDiveResult(topic, deepDiveResponse, subSuggestions, isSub, parentItemForNesting, isCustom);

        // --- State Update ---
        if (buttonElement) { // Only update state for suggestion buttons
             buttonElement.classList.remove('loading');
             buttonElement.classList.add('completed');
        }

        if (!isSub) { // Only increment for top-level dives
            completedDeepDives++;
        }

        const stillLoading = progressSection.querySelector('.suggestion-button.loading, .sub-suggestion-button.loading');
        if (stillLoading) {
            updateUIForState(AppState.DEEP_DIVING);
            if (footerSynthesizeButton) footerSynthesizeButton.disabled = true;
        } else {
            updateUIForState(AppState.READY_FOR_SYNTHESIS);
            // Enable synth button only if at least one top-level (AI or Custom) dive is done
            if (completedDeepDives > 0 && footerSynthesizeButton) {
                 footerSynthesizeButton.disabled = false;
             }
        }

    } catch (error) {
        console.error(`Deep Dive failed for ${levelText} (${diveType}) "${topic}":`, error);
        renderError(`Deep Dive failed for "${topic}": ${error.message}`, topic);
        updateCurrentActionStatus(`Error exploring topic: "${topic}".`, false); // Update status on error

        // Handle button states on error
        if (buttonElement) { // Reset suggestion button on error
            buttonElement.classList.remove('loading');
            buttonElement.style.backgroundColor = 'var(--error-color)';
            buttonElement.style.color = 'white';
            buttonElement.textContent += " (Error)";
        } else { // Re-enable custom input/button on error to allow retry
            const inputGroup = parentItemForNesting?.querySelector('.custom-dive-input-group') || topLevelCustomDiveGroup; // Check both nested and top-level
            if(inputGroup) {
                const inputEl = inputGroup.querySelector('.custom-dive-input');
                const buttonEl = inputGroup.querySelector('.custom-dive-button');
                if(inputEl) inputEl.disabled = false;
                if(buttonEl) buttonEl.disabled = false;
                 inputEl?.focus();
                 alert(`Exploration failed for "${topic}". You can try again or ask something else.`);
            }
        }

        updateUIForState(AppState.ERROR); // Set error state, but potentially allow further action
         // Ensure synthesize button is re-enabled if appropriate
        if (completedDeepDives > 0 && footerSynthesizeButton) footerSynthesizeButton.disabled = false;


    } finally {
        displayProcessLog();
        // Double-check synthesize button state after any dive finishes/fails
        const stillLoading = progressSection.querySelector('.suggestion-button.loading, .sub-suggestion-button.loading');
        if (!stillLoading && completedDeepDives > 0 && currentState !== AppState.SYNTHESIZING && footerSynthesizeButton) {
            footerSynthesizeButton.disabled = false;
         }
    }
}

// Modified: Removed dynamic addition of custom input group
// Modified: Use strong tags for title, call renderMarkdown correctly, add output-container class
function displayDeepDiveResult(topic, markdownContent, subSuggestions = [], isSub = false, parentItemForNesting = null, isCustom = false) {
    // const isCustom = !buttonElement; // True if custom/no button, False if AI suggestion button provided
    deepDiveResultsDiv.style.display = 'block';

    let containerToAppendTo = deepDiveContentContainer;
    let itemDiv;

    // Create the main container div for this result item and add relative positioning class
    itemDiv = document.createElement('div');
    itemDiv.classList.add('progress-item', 'output-container'); // Base classes
    if (isSub) {
        itemDiv.classList.add('sub-dive-result'); // Indentation/border color
    }
    // Add class based on how dive was triggered
    if (isCustom) {
         itemDiv.classList.add('custom-dive-result'); // Specific border/icon color
    } else {
         itemDiv.classList.add('ai-suggestion-dive'); // Specific border/icon color
    }

    // Determine title and nesting, apply strong tag
    // Create title element (H4 or H5) - already includes <strong>
    let titleElement;
    const safeTopic = escapeHtml(topic);
    if (isSub) {
        titleElement = document.createElement('h5');
        // Icon added via CSS based on .custom-dive-result or .ai-suggestion-dive + .sub-dive-result
        titleElement.innerHTML = `Exploration: <strong>${safeTopic}</strong>`;
    } else {
        titleElement = document.createElement('h4');
         // Icon added via CSS based on .custom-dive-result or .ai-suggestion-dive
        titleElement.innerHTML = `Exploration: <strong>${safeTopic}</strong>`;
    }
    itemDiv.appendChild(titleElement);


    // Render markdown content container and call renderMarkdown
    const contentContainerDiv = document.createElement('div');
    contentContainerDiv.classList.add('content-markdown');
    itemDiv.appendChild(contentContainerDiv);
    renderMarkdown(contentContainerDiv, markdownContent, markdownContent); // Render content + add copy button

    // Render the main markdown content *into the contentContainerDiv*
    // Pass the raw markdownContent for the copy button
    // renderMarkdown(contentContainerDiv, markdownContent, markdownContent);


    // Create container for AI sub-suggestions AND the custom input group
    const subSuggestionContainer = document.createElement('div');
    subSuggestionContainer.classList.add('sub-suggestion-container');
    subSuggestionContainer.style.display = 'none';
    itemDiv.appendChild(subSuggestionContainer);

    // Append the whole itemDiv to the appropriate place (nested or main)
    containerToAppendTo.appendChild(itemDiv);

    // --- Display AI Sub-Suggestions (if any were generated) ---
    let contentAddedToSubContainer = false;
    if (subSuggestions.length > 0) {
        // ... (create heading and buttons - same as before) ...
        const heading = document.createElement('h5');
        heading.textContent = 'Further Refinement Options:';
        subSuggestionContainer.appendChild(heading);
        subSuggestions.forEach((subTopic, index) => {
             const button = document.createElement('button');
             button.classList.add('sub-suggestion-button');
             button.textContent = subTopic;
             button.dataset.topic = subTopic;
             button.dataset.index = index;
             button.dataset.isSub = "true";
             subSuggestionContainer.appendChild(button);
         });
        contentAddedToSubContainer = true;
    } else {
        console.log(`No AI sub-suggestions found for "${topic}"`);
    }

    // --- Add Custom Input Group ---
    const customGroup = document.createElement('div');
    customGroup.classList.add('custom-dive-input-group');
    if (contentAddedToSubContainer) { /* ... add spacing styles ... */
        customGroup.style.marginTop = '20px';
        customGroup.style.paddingTop = '15px';
        customGroup.style.borderTop = '1px dotted var(--border-color)';
    }
    // ... (create customInput and customButton - same as before) ...
     const customInput = document.createElement('input');
     customInput.type = 'text';
     customInput.classList.add('custom-dive-input');
     customInput.placeholder = 'Ask a follow-up question or specify topic...';
     customGroup.appendChild(customInput);
     const customButton = document.createElement('button');
     customButton.classList.add('custom-dive-button', 'button', 'button-outline');
     customButton.textContent = 'Explore';
     customGroup.appendChild(customButton);

    subSuggestionContainer.appendChild(customGroup);
    contentAddedToSubContainer = true;


    // Make sub-container visible ONLY if content was added
    if (contentAddedToSubContainer) {
        subSuggestionContainer.style.display = 'block';
    }

    // itemDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Function to start the final synthesis (with cleanup for markdown fences)
async function startSynthesis() {
    console.log("Starting final synthesis.");
    updateUIForState(AppState.SYNTHESIZING);
    updateCurrentActionStatus("Synthesizing final report...", true); // Update status
    addProcessLog('Synthesis Start', 'User requested final report synthesis.', `Based on initial scan and accumulated deep dives.`);

    try {
        const finalPrompt = buildFinalReportPrompt(currentTopic, researchHistory);
        // console.log("--- Final Synthesis Prompt ---"); // Uncomment to debug prompt
        // console.log(finalPrompt);

        let finalReportMarkdown = await callGeminiAPI(finalPrompt, false); // No grounding

        console.log("--- Raw Final Report Markdown Response ---");
        console.log(finalReportMarkdown);

        // *** ADDED: Cleanup Markdown Fences ***
        if (finalReportMarkdown && typeof finalReportMarkdown === 'string') {
            // Remove ```markdown at the beginning and ``` at the end, handling potential whitespace
            const cleanedMarkdown = finalReportMarkdown.trim();
            if (cleanedMarkdown.startsWith('```markdown') && cleanedMarkdown.endsWith('```')) {
                 finalReportMarkdown = cleanedMarkdown.substring('```markdown'.length, cleanedMarkdown.length - '```'.length).trim();
                 console.log("Cleaned markdown fences (```markdown ... ```)");
            } else if (cleanedMarkdown.startsWith('```') && cleanedMarkdown.endsWith('```')) {
                 // Also handle generic ``` ``` fences just in case
                 finalReportMarkdown = cleanedMarkdown.substring('```'.length, cleanedMarkdown.length - '```'.length).trim();
                 console.log("Cleaned generic markdown fences (``` ... ```)");
            }
        }
        // *** END ADDED CLEANUP ***


        addProcessLog('Synthesis Complete', 'Generated final comprehensive report.', `Report length: ${finalReportMarkdown?.length || 0} chars`);

        if (finalReportMarkdown) {
            // Clear previous content before rendering
            finalReportContentDiv.innerHTML = '';
             // Call renderMarkdown targeting the correct div, pass raw text for copy
            renderMarkdown(finalReportContentDiv, finalReportMarkdown, finalReportMarkdown);
            console.log("Called renderMarkdown for final report.");
        } else {
            console.error("Final report content received from API was empty or invalid after cleanup.");
            renderError("Failed to generate final report content.");
        }
        updateCurrentActionStatus("Final report generated.", false); // Update status on success
        updateUIForState(AppState.DONE);

    } catch (error) {
        // ... (error handling) ...
        console.error("Synthesis failed:", error);
        renderError(`Synthesis failed: ${error.message}`);
        updateCurrentActionStatus("Error during final synthesis.", false); // Update status on error
        updateUIForState(AppState.ERROR);
        resultsSection.style.display = 'block';
    } finally {
        synthesisLoader.style.display = 'none';
        displayProcessLog();
    }
}

// --- Prompt Engineering Functions ---

// Utility function to build tone/focus instructions
function getToneFocusInstructions() {
    let instructions = `\n\n--- Tone and Focus Guidelines ---`;
    instructions += `\nAdopt a primarily "${selectedTone}" tone throughout your response.`;

    if (includeOpposingViews) {
        instructions += `\nIt is important to identify, present, and objectively analyze significant opposing viewpoints or counter-arguments related to the topic where applicable.`;
    } else {
        instructions += `\nFocus mainly on the primary findings and evidence for the main perspective. Briefly mention alternative views only if essential for context, but do not elaborate extensively on them.`;
    }

    if (customFocus) {
        // Escape custom focus to prevent prompt injection? Basic escaping for now.
        const safeFocus = customFocus.replace(/`/g, "'"); // Basic safety
        instructions += `\nPay special attention to aspects related to the following user instructions: "${safeFocus}". Integrate this focus naturally where relevant.`;
    }
    instructions += `\n--- End Guidelines ---`;
    return instructions;
}

// Modified: Added parentDiveContent parameter
function buildDeepDivePrompt(mainTopic, specificSubTopic, history, isSub = false, parentDiveContent = null) {
    const initialScan = history.find(item => item.title === 'Initial Scan & Plan');
    let previousContext = initialScan ? `--- Initial Scan Context ---\n${initialScan.content}\n\n` : "";
    // Get tone instructions
    const toneInstructions = getToneFocusInstructions();
    const diveTypeText = isSub ? "specific sub-question/topic derived from previous exploration" : "sub-topic or question identified in the initial scan";

    // *** NEW: Add parent dive content if available ***
    if (isSub && parentDiveContent) {
         console.log("Including parent dive content in prompt.");
         previousContext += `--- Context from Immediate Parent Dive ---\n${parentDiveContent}\n\n`;
    } else if (isSub) {
         console.log("Parent dive content not available for prompt.");
    }
    // *** END NEW ***

    return `Continuing the research on the main topic: "${mainTopic}".

Focus **specifically** on this ${diveTypeText}: "${specificSubTopic}"

${toneInstructions}

Your primary goal is to:
1.  Perform a **detailed, grounded exploration** of "${specificSubTopic}" using Google Search, using the context provided below and adhering to the tone and focus guidelines above.
2.  Provide in-depth information, evidence, examples, data points, and nuances related *only* to "${specificSubTopic}".
3.  Discuss different perspectives or arguments concerning it, if relevant (considering the guideline on opposing views).
4.  Provide verifiable URL citations as Markdown links \`[source text](URL)\` within your response for significant claims.

**Secondary Goal:** Based *only* on the information you generate *in this response* about "${specificSubTopic}", identify and list 2-3 potential **further refinement questions or more granular sub-topics**.
- Format this list clearly at the end of your main response.
- Start the list section *EXACTLY* with the line: "Further Refinement Suggestions:"
- Below that line, list the suggestions, each prefixed with "- " (hyphen space).

Use the context below for reference, concentrating your new findings on "${specificSubTopic}".

${previousContext}

Present your findings and the refinement suggestions in well-structured Markdown format. The main content about "${specificSubTopic}" should come first, followed by the 'Further Refinement Suggestions:' section if applicable.`;
}

// NEW: Function to extract sub-suggestions from a deep dive response
function extractSubSuggestions(text) {
    console.log("--- Attempting to Extract Sub-Suggestions ---");
    const suggestions = [];
    if (!text) return suggestions;

    const lines = text.split('\n');
    let capture = false;
    const header = "Further Refinement Suggestions:";

    // Find the exact header line
    const headerIndex = lines.findIndex(line => line.trim().toLowerCase() === header.toLowerCase());

    if (headerIndex !== -1) {
        console.log("Found sub-suggestion header at line index:", headerIndex);
        capture = true;
        for (let i = headerIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            // Match lines starting with "- "
            const match = line.match(/^[-*+]\s+(.*)/); // Accept various bullet types
            if (match && match[1]) {
                console.log(`  Extracted Sub-Suggestion: "${match[1].trim()}"`);
                suggestions.push(match[1].trim());
            } else if (suggestions.length > 0 && line === '') {
                // Stop if blank line encountered after finding some
                console.log("  Stopping sub-suggestion capture due to blank line.");
                break;
            } else if (suggestions.length > 0 && !match && line !== '') {
                 // Stop if non-empty, non-matching line encountered
                 console.log("  Stopping sub-suggestion capture due to non-matching line:", line);
                 break;
            }
        }
    } else {
         console.log("Sub-suggestion header not found in response.");
    }

    console.log(`--- Finished Sub-Suggestion Extraction: Found ${suggestions.length} suggestions ---`);
    return suggestions;
}


function buildFinalReportPrompt(topic, history) {
    // Consolidate all previous steps (initial scan + all completed deep dives)
    const fullContext = history.map(step => `--- ${step.title} ---\n${step.content}`).join('\n\n---\n');
    // Get tone instructions for the FINAL report
    const toneInstructions = getToneFocusInstructions();

    return `Synthesize all the information gathered in the previous research stages (provided below) into a single, comprehensive, well-structured report in **Markdown format** on the topic: "${topic}".

**IMPORTANT: Adhere strictly to the following Tone and Focus Guidelines for this final report:**
${toneInstructions}

Your final report should:
1.  Start with a clear introduction defining the topic, its scope, and the report's structure.
2.  Logically integrate the overview and detailed findings from all previous stages, organizing thematically.
3.  Objectively discuss differing viewpoints or controversies as per the guidelines.
4.  Conclude with a summary of key takeaways or the current state of understanding, reflecting the specified tone.
5.  Ensure claims are supported by citations (\`[source text](URL)\`) present in the context below.
6.  Format the entire output as clean, readable Markdown.
7.  Maintain the specified overall tone and focus throughout the synthesized report.

Full context from previous research steps:
${fullContext}

Generate the final Markdown report based *only* on the context provided above and the specified guidelines.`;
}

// === Add this helper function somewhere in script.js ===

/**
 * Creates a promise that rejects after a specified timeout.
 * @param {number} ms Timeout duration in milliseconds.
 * @param {string} [errorMessage='Promise timed out'] Optional error message.
 * @returns {Promise<never>} A promise that rejects on timeout.
 */
function timeoutPromise(ms, errorMessage = 'Promise timed out') {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });
}

// === End of helper function ===

// === Replace the ENTIRE callGeminiAPI function ===

/**
 * Main function to interact with Gemini API.
 * Implements an internal Plan -> Parallel Execute -> Synthesize strategy.
 * Falls back to a direct call if internal steps fail significantly.
 * Maintains the original external signature.
 *
 * @param {string} promptText The original user prompt or instruction.
 * @param {boolean} [useGrounding=false] Whether grounding should be used (applies to parallel execution).
 * @returns {Promise<string>} The final synthesized text response.
 */
async function callGeminiAPI(originalPromptText, useGrounding = false) {
    console.log(`callGeminiAPI invoked for: "${summarizeContent(originalPromptText, 50)}" (Grounding: ${useGrounding}) - Using Multi-Step Strategy`);
    const MAX_PARALLEL_QUERIES = 3; // How many parallel calls to attempt
    const PARALLEL_TIMEOUT_MS = 30000; // 30 seconds timeout for each parallel call

    // --- Internal Helper for making individual LLM calls ---
    // This reduces code duplication for the internal steps
    async function _internalLlmCall(prompt, groundingNeeded, isPlanning = false) {
        console.log(`  _internalLlmCall: (Grounding: ${groundingNeeded}) "${summarizeContent(prompt, 50)}"`);
        const endpoint = `${API_ENDPOINT_BASE}${selectedModel}:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            // Lower temperature slightly for planning/synthesis? Optional.
            // generationConfig: { temperature: isPlanning ? 0.5 : 0.7 },
        };
        if (groundingNeeded) {
            requestBody.tools = [{ googleSearch: {} }];
            console.log("Attempting to use Google Search grounding.");
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorBody = await response.text();
                try { errorBody = JSON.parse(errorBody); } catch (e) { /* Use text */ }
                 console.error("  _internalLlmCall Error Response:", errorBody);
                throw new Error(`Internal API call failed: ${response.status} ${response.statusText} - ${errorBody?.error?.message || JSON.stringify(errorBody)}`);
            }
            const data = await response.json();

            // Basic response extraction (similar to original)
            const candidate = data?.candidates?.[0];
            const contentPart = candidate?.content?.parts?.[0];
             if (contentPart && typeof contentPart.text === 'string') {
                 return contentPart.text;
             } else if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                  throw new Error(`Internal API call finished unexpectedly. Reason: ${candidate.finishReason}`);
             } else if (data.promptFeedback?.blockReason) {
                  throw new Error(`Internal Request blocked: ${data.promptFeedback.blockReason}`);
             } else {
                 throw new Error("Could not extract text from internal API response.");
             }
        } catch (error) {
            console.error("  _internalLlmCall Fetch/Processing Error:", error);
            throw error; // Re-throw to be caught by main logic
        }
    }
    // --- End Internal Helper ---


    // === Main Multi-Step Logic ===
    let plan = null;
    let subQueries = [];
    let parallelResults = [];
    let finalSynthesizedResponse = null;
    let fallbackNeeded = false;

    try {
        // --- STEP 1: Planning ---
        console.log("  Multi-Step: 1. Planning...");
        updateCurrentActionStatus("Planning research strategy...", true); // Update status

        // Read current tone/focus settings for context if needed in planning/synthesis
        const toneInstructionsForContext = getToneFocusInstructions(); // Use existing helper

        const planningPrompt = `Based on the user's request below, break it down into ${MAX_PARALLEL_QUERIES} specific, concise sub-queries that, when answered individually, will provide the necessary information to comprehensively address the original request. Balance critical areas (may require some overlap) and auxiliary areas for breadth. Consider the user's tone/focus guidelines provided for context.

User's Request:
"${originalPromptText}"

User's Tone/Focus Guidelines:
${toneInstructionsForContext}

Output ONLY a valid JSON array of strings, where each string is a sub-query. Example:
["Sub-query 1 about aspect X", "Sub-query 2 comparing Y and Z", "Sub-query 3 asking for details on A"]`;

        try {
            const planningResponse = await _internalLlmCall(planningPrompt, false, true); // No grounding for planning, mark as planning call
            console.log("  Raw Planning Response:", planningResponse);
            // Attempt to parse JSON - be robust
            const cleanedResponse = planningResponse.trim().replace(/^```json\s*|```$/g, ''); // Remove potential markdown fences
            plan = JSON.parse(cleanedResponse);
            if (!Array.isArray(plan) || !plan.every(item => typeof item === 'string')) {
                throw new Error("Planning response was not a valid JSON array of strings.");
            }
            subQueries = plan.slice(0, MAX_PARALLEL_QUERIES); // Limit to max
            console.log("  Planning Successful. Sub-queries:", subQueries);
            if (subQueries.length === 0) throw new Error("Planning resulted in zero sub-queries.");
        } catch (planningError) {
            console.error("  Multi-Step: 1. Planning FAILED.", planningError);
            fallbackNeeded = true; // Mark for fallback
        }

        // --- STEP 2: Parallel Execution (only if planning succeeded) ---
        if (!fallbackNeeded) {
            console.log(`  Multi-Step: 2. Parallel Execution (Timeout: ${PARALLEL_TIMEOUT_MS / 1000}s)...`);
            updateCurrentActionStatus(`Executing ${subQueries.length} parallel research tasks...`, true);

            const parallelPromises = subQueries.map(async (query, index) => {
                const subQueryPrompt = `Answer the following specific query comprehensively: "${query}"\n\n(Context: This is part of a larger request about "${summarizeContent(originalPromptText, 30)}". Provide detailed information relevant *only* to this specific query. Include citations if possible.)`; // Add minimal context
                console.log(`    Starting parallel query ${index + 1}: "${query}"`);

                try {
                    const resultPromise = _internalLlmCall(subQueryPrompt, useGrounding); // Apply original grounding flag here
                    const response = await Promise.race([
                        resultPromise,
                        timeoutPromise(PARALLEL_TIMEOUT_MS, `Query ${index + 1} timed out`)
                    ]);
                    console.log(`    Parallel query ${index + 1} SUCCEEDED.`);
                    return { query: query, response: response }; // Return successful response with original query
                } catch (error) {
                    console.warn(`    Parallel query ${index + 1} FAILED or Timed Out:`, error.message);
                    // Throw the error so allSettled catches it as rejected
                    throw new Error(`Query "${query}" failed: ${error.message}`);
                }
            });

            // Wait for all parallel calls to settle (succeed, fail, or timeout)
            const settledResults = await Promise.allSettled(parallelPromises);
            console.log("  Parallel Execution Settled.");

            settledResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    parallelResults.push(result.value); // Store { query, response }
                } else {
                    // Log rejection reason (already logged above, but good to confirm)
                    console.warn(`  Result for Query ${index + 1} was rejected: ${result.reason?.message || result.reason}`);
                }
            });

            console.log(`  Parallel Execution Complete. ${parallelResults.length} successful results out of ${subQueries.length}.`);

            // Check if we got enough results
            if (parallelResults.length === 0) {
                console.warn("  Multi-Step: 2. Parallel Execution yielded NO successful results.");
                // Decide: Fallback or try synthesis with nothing? Let's try synthesis.
                // fallbackNeeded = true; // Optionally fallback here too
            }
        }

        // --- STEP 3: Synthesis (only if planning succeeded) ---
        if (!fallbackNeeded) {
            console.log("  Multi-Step: 3. Synthesizing Results...");
            updateCurrentActionStatus("Synthesizing results...", true);

            let synthesisContext = "No results gathered from parallel execution.";
            if (parallelResults.length > 0) {
                 synthesisContext = parallelResults.map((res, i) =>
                     `--- Result for Sub-Query ${i + 1}: "${res.query}" ---\n${res.response}\n--- End Result ${i + 1} ---`
                 ).join('\n\n');
            }

            // Re-read tone/focus for synthesis step
            const finalToneInstructions = getToneFocusInstructions();

            const synthesisPrompt = `You are tasked with synthesizing information to answer a user's original request. You previously planned sub-queries, and the results from executing those queries are provided below.

User's Original Request:
"${originalPromptText}"

Results from Parallel Sub-Query Execution:
${synthesisContext}

Your Task:
Synthesize the provided results into a single, coherent, comprehensive response that directly addresses the **User's Original Request**.
- Integrate information smoothly.
- Resolve any minor contradictions logically, noting significant discrepancies if necessary.
- Ensure the final output strictly adheres to the user's original tone and focus guidelines provided below.
- Format the final output in clean Markdown.
- If the provided results are insufficient or empty, state that you couldn't gather enough specific information but attempt to answer the original request based on your general knowledge, while still adhering to the tone/focus guidelines.

User's Tone/Focus Guidelines:
${finalToneInstructions}

Generate ONLY the final synthesized Markdown response for the original request.`;

            try {
                finalSynthesizedResponse = await _internalLlmCall(synthesisPrompt, false); // No grounding for synthesis
                console.log("  Multi-Step: 3. Synthesis Successful.");
            } catch (synthesisError) {
                 console.error("  Multi-Step: 3. Synthesis FAILED.", synthesisError);
                 fallbackNeeded = true; // Fallback if synthesis itself fails
            }
        }

    } catch (outerError) {
         // Catch unexpected errors in the orchestration logic itself
         console.error("  Multi-Step: Outer orchestration error.", outerError);
         fallbackNeeded = true;
    }


    // --- STEP 4: Fallback / Return ---
    if (fallbackNeeded) {
        console.warn("Multi-Step strategy failed or was insufficient. Falling back to direct API call.");
        updateCurrentActionStatus("Falling back to direct request...", true);
        try {
             // Use the internal helper for the direct call as well
            finalSynthesizedResponse = await _internalLlmCall(originalPromptText, useGrounding);
            console.log("  Fallback direct call successful.");
             updateCurrentActionStatus("Direct request complete.", false);
        } catch (fallbackError) {
            console.error("  Fallback direct call FAILED.", fallbackError);
            updateCurrentActionStatus("Fallback direct call failed.", false);
             // Throw the error from the fallback attempt
             throw new Error(`Multi-step strategy failed, and fallback direct call also failed: ${fallbackError.message}`);
        }
    }

    // Log final output length for debugging
    console.log(`callGeminiAPI Multi-Step returning. Final length: ${finalSynthesizedResponse?.length || 0}`);
    updateCurrentActionStatus("Task complete.", false); // Final status update

    // Return the synthesized result OR the fallback result
    return finalSynthesizedResponse ?? ""; // Ensure we return a string

}

// === End of Replacement ===


// --- Gemini API Call (Mostly unchanged, ensure grounding toggle works) ---
async function callGeminiAPI_Single(promptText, useGrounding = false) {
    console.log(`Calling Gemini API (${selectedModel}). Grounding: ${useGrounding}. Prompt length: ${promptText.length}`);
    const endpoint = `${API_ENDPOINT_BASE}${selectedModel}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
             // responseMimeType: "text/markdown" // Might be supported by future API versions? Check docs.
             // maxOutputTokens: 8192, // Increase if needed for large reports
        },
        // Safety settings (optional)
    };

    if (useGrounding) {
        requestBody.tools = [{ googleSearch: {} }];
        console.log("Attempting to use Google Search grounding.");
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorBody = await response.text();
            try { errorBody = JSON.parse(errorBody); } catch (e) { /* Use text */ }
            console.error("API Error Response:", errorBody);
            throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorBody?.error?.message || JSON.stringify(errorBody)}`);
        }

        const data = await response.json();

        // Extract Text Content (check for variations in response structure)
         if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
             if (data.candidates[0].groundingMetadata) {
                 console.log("Grounding metadata found:", data.candidates[0].groundingMetadata);
             }
            return data.candidates[0].content.parts[0].text; // Return the Markdown text
        } else if (data.promptFeedback?.blockReason) {
            console.error("Prompt Feedback:", data.promptFeedback);
            throw new Error(`Request blocked: ${data.promptFeedback.blockReason} - ${data.promptFeedback.blockReasonMessage || ''}`);
        } else {
            console.error("Unexpected API response structure:", data);
            throw new Error("Could not extract text from API response.");
        }

    } catch (error) {
        console.error("Error during API call:", error);
        throw error;
    }
}

// --- UI Update & Utility Functions ---
// Modified: Adds copy button
function renderMarkdown(element, markdownText, rawMarkdownForCopy = null) {
    // Ensure raw text is passed if different from processed text
    const rawText = rawMarkdownForCopy ?? markdownText;

    if (typeof marked === 'undefined') { /* ... error handling ... */ return; }
    if (!element) { /* ... error handling ... */ return; }
    if (typeof markdownText !== 'string') { /* ... error handling ... */ markdownText = "*Invalid content.*"; }

    try {
        // Add Copy button BEFORE setting innerHTML
        // Ensure the parent element has position: relative; (added class 'output-container')
        const copyButton = document.createElement('button');
        copyButton.textContent = "Copy";
        copyButton.classList.add('copy-button');
        // Use an attribute sanitizer if rawText could contain malicious content, but for LLM->clipboard it's usually okay.
        copyButton.dataset.copyContent = rawText;
        element.appendChild(copyButton); // Append button to the markdown container

        // Render Markdown (ensure button isn't overwritten)
        const contentDiv = document.createElement('div'); // Render into a sub-div
        if (markdownText.trim().startsWith("{") && markdownText.trim().endsWith("}")) {
             contentDiv.innerHTML = `<pre>${escapeHtml(markdownText)}</pre>`;
        } else {
            contentDiv.innerHTML = marked.parse(markdownText);
        }
        // Prepend content *after* copy button, or structure differently
        element.appendChild(contentDiv); // Append content div after button

    } catch (e) {
        console.error("Error parsing Markdown or adding copy button:", e);
        element.textContent = `Error rendering content. Please see console.\n\n${markdownText}`; // Fallback
         // Remove copy button if it exists on error?
         const existingButton = element.querySelector('.copy-button');
         if(existingButton) existingButton.remove();
    }
}

function addProcessLog(step, reasoning, details) {
    processLog.push({ step, reasoning, details });
    console.log(`Process Log: ${step} - ${reasoning}`);
}

function displayProcessLog() {
    processDetailsDiv.innerHTML = '<h3>Research Stages & Reasoning</h3>';
    const list = document.createElement('ol');
    processLog.forEach(log => {
        const item = document.createElement('li');
        item.innerHTML = `
            <strong>${log.step}:</strong> ${escapeHtml(log.reasoning)}<br>
            <em>Details: ${escapeHtml(log.details)}</em>
        `;
        list.appendChild(item);
    });
    processDetailsDiv.appendChild(list);
     processSummarySection.style.display = 'block'; // Ensure it's visible when updated
}

function renderError(message, context = null) {
    // Display error prominently, e.g., in the final report area or a dedicated error div
    finalReportContentDiv.innerHTML = `<p style="color: var(--error-color);"><strong>Error Occurred</strong>${context ? ` (Context: ${escapeHtml(context)})` : ''}:<br>${escapeHtml(message)}</p>`;
    resultsSection.style.display = 'block'; // Make sure results section is visible for the error
}

// Modified Reset Function: Ensure top-level custom group is hidden/reset
function resetResearchState(clearInputs = true) {
    researchHistory = [];
    processLog = [];
    completedDeepDives = 0;
    // Don't clear currentTopic here if clearInputs is false
    // fileContents = []; // Don't clear files automatically? Maybe user wants to reuse? Let's keep them.

    // Clear dynamic UI elements
    initialScanContentDiv.innerHTML = '';
    initialScanOutputDiv.style.display = 'none';
    suggestionButtonsDiv.innerHTML = '';
    suggestionsArea.style.display = 'none';
    noSuggestionsMessage.style.display = 'none';
    deepDiveContentContainer.innerHTML = '';
    deepDiveResultsDiv.style.display = 'none';
    finalReportContentDiv.innerHTML = '<p>The synthesized report will appear here once generated.</p>';
    processDetailsDiv.innerHTML = '<p>This section will show the step-by-step approach taken.</p>';
    processSummarySection.style.display = 'none';

    // Reset inputs ONLY if requested (full reset button click)
    if (clearInputs) {
        console.log("Clearing topic and focus inputs.");
        if(researchTopicInput) researchTopicInput.value = '';
        // if(fileInfoDiv) fileInfoDiv.textContent = 'No files selected.'; // Keep file info?
        // if(fileUploadInput) fileUploadInput.value = null; // Keep files selected?
        if(currentTopic) currentTopic = ""; // Clear topic state variable only on full reset


        // Reset Tone Controls to Defaults
        if (toneSelect) toneSelect.value = 'Neutral/Objective'; // Reset dropdown
        if (opposingViewsCheckbox) opposingViewsCheckbox.checked = true; // Reset checkbox
        if (customFocusInput) customFocusInput.value = ''; // Clear custom input

        // Reset tone state variables
        selectedTone = 'Neutral/Objective';
        includeOpposingViews = true;
        customFocus = '';
    }


    // Reset top-level custom input group (always reset this one visually)
    if (topLevelCustomDiveGroup) topLevelCustomDiveGroup.style.display = 'none';
    if (topLevelCustomInput) {
        topLevelCustomInput.value = '';
        topLevelCustomInput.disabled = false;
    }
    if (topLevelCustomButton) topLevelCustomButton.disabled = false;


    if(footerSynthesizeButton){ // Use footer button reference
        footerSynthesizeButton.style.display = 'none';
        footerSynthesizeButton.disabled = true;
    }
    if(loader) loader.style.display = 'none';
    if(synthesisLoader) synthesisLoader.style.display = 'none';
    if(currentActionStatusDiv) updateCurrentActionStatus("Idle", false); // Reset status


    console.log("Research state reset. Inputs cleared:", clearInputs);
}

function summarizeContent(text, maxLength = 100) {
    if (!text) return "[No content]";
    text = text.replace(/(\r\n|\r|\n)+/g, ' ').trim(); // Remove line breaks for summary
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
}

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

// --- Start the app ---
initializeApp();