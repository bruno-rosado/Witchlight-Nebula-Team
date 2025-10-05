#  Project Nebula
**"Like the stellar nurseries where stars are born, Project Nebula is NASA's growing ecosystem of intelligence."**


**An MCP-Powered Intelligence Layer for NASA's Mission-Critical Data**

Developed for the NASA Space Apps Challenge

---

## Overview

Project Nebula is a unified intelligence platform built on the Model Context Protocol (MCP) that connects NASA's diverse datasets, APIs, and analytical tools into a single, seamless environment. From real-time natural event tracking to weather forecasting and beyond, Nebula acts as a shared context fabric  enabling mission planners, engineers, and researchers to query, combine, and reason across information sources with unprecedented ease.

## The Vision

NASA's mission-critical data spans dozens of systems: Earth observation satellites, atmospheric sensors, launch telemetry, planetary datasets, and more. Each system is rich with insights but isolated in its own silo. **Project Nebula transforms these scattered knowledge bases into an evolving constellation of interconnected intelligence.**

Like the stellar nurseries where stars are born, Nebula represents NASA's growing ecosystem  a foundation for faster, more informed, and more collaborative decision-making across the entire agency.

---

## Problem Statement

Current challenges in NASA's data ecosystem:

- **Data Silos**: Critical information is scattered across independent systems, APIs, and databases
- **Integration Complexity**: Each new tool or dataset requires custom integration work
- **Context Loss**: Researchers must manually correlate data from multiple sources
- **Knowledge Barriers**: Domain expertise is required to know which systems contain relevant data
- **Decision Latency**: Time-consuming manual data aggregation delays mission-critical decisions

---

##  The Nebula Solution

### Unified Intelligence Layer

Project Nebula implements the Model Context Protocol (MCP) to create a standardized interface across NASA's data ecosystem. This allows:

1. **Natural Language Queries**: Ask questions in plain English across all connected systems
2. **Cross-System Reasoning**: Correlate data from multiple sources automatically
3. **Real-Time Intelligence**: Access live feeds from Earth observation and weather systems
4. **Extensible Architecture**: Add new data sources without rewriting integration code
5. **Mission Context Preservation**: Maintain decision context across analysis sessions

### Current Capabilities

#### 
 EONET Integration (Earth Observatory Natural Event Tracker)
- Access NASA's natural event data including wildfires, storms, volcanoes, and severe weather
- Query historical events and track ongoing phenomena
- Correlate natural events with mission planning constraints

####  Weather Intelligence
- Real-time weather data for any global location
- Launch window analysis and weather constraints
- Environmental condition monitoring for field operations

####  Extensible Tool Framework
- Custom tool development for mission-specific needs
- Standardized interfaces for new data sources
- Plug-and-play architecture for rapid capability expansion

---

##  Architecture



### Key Components

- **MCP Server**: Standards-compliant Model Context Protocol implementation
- **Tool Registry**: Pluggable system for data source integrations
- **Resource Layer**: Structured access to static and dynamic datasets
- **Frontend Interface**: Natural language query interface powered by Claude
- **Express API**: RESTful endpoints for external system integration

---

## Technical Stack

- **MCP SDK**: Model Context Protocol implementation (@modelcontextprotocol/sdk)
- **TypeScript**: Type-safe server implementation
- **Node.js + Express**: High-performance API layer
- **Claude AI**: Advanced natural language understanding and reasoning
- **Next.js**: Modern frontend framework
- **SerpAPI**: Real-time web data integration
- **NASA APIs**: Direct integration with EONET and other NASA systems

---

##  Use Cases for NASA

### 1. Launch Operations
**Scenario**: Mission control needs to assess launch window feasibility

**Before Nebula**:
- Check weather forecast separately
- Review EONET for nearby wildfires or storms
- Manually correlate multiple data sources
- Time to decision: 30-60 minutes

**With Nebula**:
```
Query: "Is it safe to launch from Kennedy Space Center tomorrow?
Check weather and any natural events within 100 miles."

Response: Real-time weather + EONET event correlation + recommendation
Time to decision: < 30 seconds
```

### 2. Mission Planning
**Scenario**: Planning rover operations on Mars with Earth-based weather analogs

**With Nebula**:
- Query Earth locations with similar atmospheric conditions
- Correlate historical weather patterns
- Access relevant research datasets
- Generate mission constraint recommendations

### 3. Disaster Response Support
**Scenario**: NASA assets supporting FEMA during natural disasters

**With Nebula**:
- Real-time tracking of wildfires, floods, hurricanes
- Satellite imagery coordination
- Resource deployment optimization
- Multi-agency data sharing

### 4. Research Acceleration
**Scenario**: Climate scientist studying volcanic activity patterns

**With Nebula**:
- Query 10 years of EONET volcanic events
- Correlate with atmospheric composition data
- Cross-reference with satellite thermal imaging
- Generate insights from multiple data sources simultaneously

---

## Getting Started

### Prerequisites
```bash
Node.js v18+
npm or yarn
Anthropic API key
SerpAPI key (for weather data)
# As each new data source is integrated, additional API keys may be required
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/project-nebula.git
cd project-nebula
```

2. **Install MCP Server dependencies**
```bash
cd mcp-server
npm install
```

3. **Configure environment variables**
```bash
# mcp-server/.env
SERP_API_KEY=your_serp_api_key
PORT=3000
```

4. **Start the MCP Server**
```bash
npm run dev
```

5. **Install Frontend dependencies**
```bash
cd ../frontend
npm install
```

6. **Configure frontend environment**
```bash
# frontend/.env.local
MCP_URL=http://localhost:3000/mcp
ANTHROPIC_API_KEY=your_anthropic_api_key
CLAUDE_MODEL=claude-sonnet-4-20250514
```

7. **Start the Frontend**
```bash
npm run dev
```

8. **Access the application**
```
Open http://localhost:3000 in your browser
```

---

## Current Data Sources

### Integrated
- **NASA EONET**: Natural events tracking (wildfires, storms, volcanoes, etc.)
- **Weather API**: Real-time global weather data via SerpAPI
- **Extensible Tool Framework**: Ready for additional integrations

### Roadmap
- = **NASA Earth Data**: Satellite imagery and atmospheric data
- = **Launch Library**: Historical and upcoming launch data
- = **Planetary Data System**: Mars, Moon, and deep space datasets
- = **ISS Telemetry**: International Space Station real-time data
- = **Hubble/JWST**: Space telescope observation data
- = **NOAA Integration**: Advanced weather and ocean data
- = **Copernicus Program**: European Space Agency Earth observation

---

## Example Queries

```plaintext
"What natural events are currently happening in California?"

"Get the weather forecast for Cape Canaveral for the next 3 days"

"Show me all volcanic eruptions in the past year"

"Are there any severe weather events that could affect our satellite operations?"

"Compare weather conditions in Austin, Texas today with historical averages"

"What wildfire activity is near NASA field centers right now?"
```

---

## NASA Space Apps Challenge

Project Nebula demonstrates the power of unified data access for space exploration and Earth science. By implementing the Model Context Protocol, we've created a foundation that can scale from individual researcher queries to agency-wide intelligence operations.

