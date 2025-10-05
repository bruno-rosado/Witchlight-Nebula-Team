# RiverHacks NASA Space Apps Challenge 2025
MIT License
## By Team Witchlight Nebula

Our project allows Mission Planners at NASA and other commercial space companies to create complex schedules easier. 


## Team Members

- Josh Leon
- Luis Quiñones
- Bruno Rosado
- Brittany Sifford
- Valeria Soimaru
- Sahara Tijol

## User Stories

User asks chatbot: "What's the weather generally for a rocket launch on this day and location." 
Chatbot connects with MCP and gets prediction from dataset
  it then compares that prediction to NASA's launch criteria
Output back to user Yes/No with flair and/or details.




Run instructions: 
1. cd to frontend directory.
2. npm install (or shortcut npm i)
3. create .env file and add (with correct keys in place of HIDDEN)
```
MCP_URL=http://localhost:3000/mcp
ANTHROPIC_API_KEY=HIDDEN
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=200
```
4. Open another terminal and cd to mcp-server.
5. npm install
6. create .env file and add 
```
SERPAPI_KEY=HIDDEN
```
7. in both terminals, enter: ```npm run dev```

You can now open localhost:3001 in your browser (double-check the output from terminal-frontend)

To close the servers ```CTRL-C```

Do not overuse the chatbot because Brittany paid for the tokens directly.