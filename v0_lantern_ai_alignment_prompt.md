# Lantern AI Alignment Prompt — Internal Chatbot

## Objective
Ensure Lantern AI is implemented as an internal productivity chatbot, leveraging Groq LLM, with the following capabilities:

- Answer questions about any component, feature, or task in the By Red OS solution
- Provide actionable feedback and analysis based on codebase awareness
- Perform web searches and summarize results for user queries
- Integrate with Groq (already wired in v0 frontend)
- Centered on productivity, developer support, and knowledge sharing

## Checklist

1. **Groq Integration**
   - [ ] Confirm Groq API is wired and accessible in the frontend
   - [ ] All required env vars (GROQ_API_KEY) are set in both v0 and local .env
   - [ ] LLM calls route through Groq for all Lantern AI chat/completion features

2. **Chatbot Core**
   - [ ] Lantern AI is accessible from the main UI (e.g., chat widget, command palette)
   - [ ] Can answer questions about any code component, feature, or task
   - [ ] Can analyze and summarize code, logic, and workflows
   - [ ] Can perform web searches and return summarized results
   - [ ] Feedback is actionable, context-aware, and relevant to the current workspace

3. **Cognitive Awareness**
   - [ ] Lantern AI can parse and understand the current codebase
   - [ ] Can reference and explain code, components, and features
   - [ ] Provides suggestions for productivity, debugging, and best practices

4. **User Experience**
   - [ ] Chat interface is intuitive and non-intrusive
   - [ ] Responses are fast, accurate, and relevant
   - [ ] Can escalate or hand off to a human if needed

5. **Testing & Validation**
   - [ ] Manual test: Ask Lantern AI about a component, feature, or task and verify quality of feedback
   - [ ] Test web search and summarization
   - [ ] Confirm Groq completions are used for all LLM responses

6. **Documentation**
   - [ ] Update onboarding docs to include Lantern AI usage and capabilities
   - [ ] Document how to extend or update Lantern AI’s knowledge and skills

---

## Action
- Use this checklist to prompt v0 and ensure Lantern AI is fully aligned as an internal productivity chatbot, leveraging Groq for LLM capabilities.
- Confirm all boxes are checked before marking Lantern AI as complete.
