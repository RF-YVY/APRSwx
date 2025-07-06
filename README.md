## Note: This has become a bit of a mess for me, pretty sure the lightning conversion from grlevelx placefile to json isn't working, Radar works though!, I haven't tested the TNC fuctions yet. I'm takeing a break, gonna watch some tv or something, get the laptop out of my lap so my dog can sit with me again.  Give it a try, do what you want! Cheers!

# APRSwx - Full-Featured APRS Software Client

A comprehensive APRS (Automatic Packet Reporting System) software client with advanced features including packet send/receive capabilities, interactive mapping, weather radar overlays, and real-time updates.

## 📦 Quick Installation from GitHub Packages

### Option 1: One-Line Install (Recommended)
```bash
curl -sSL https://raw.githubusercontent.com/RF-YVY/APRSwx/main/install.sh | bash
```

### Option 2: Docker from GitHub Container Registry
```bash
# Pull the latest image
docker pull ghcr.io/rf-yvy/aprswx:main

# Run with Docker Compose
curl -O https://raw.githubusercontent.com/RF-YVY/APRSwx/main/docker-compose.yml
docker-compose up -d
```

### Option 3: NPM Package (Frontend Components)
```bash
npm install @rf-yvy/aprswx-frontend
```

## 🚀 What's New in v1.0

## 🎯 Current System Status

### ✅ **COMPLETED - Enhanced UI/UX & Full System Integration**
**Status:** 🟢 **OPERATIONAL** (Enhanced UI deployed)

#### Live System Components:
- **Enhanced Frontend**: ✅ Modern React UI with real-time status indicators
- **Backend API**: ✅ Django REST API serving 29 stations and 100+ packets
- **Live Data Ingestion**: ✅ APRS-IS connection with Denver area filter (200km radius)
- **WebSocket Real-time**: ✅ Live packet streaming with 2+ message types
- **Interactive Map**: ✅ Leaflet map with enhanced controls and emoji markers
- **Database**: ✅ SQLite with live data flow (stations updated continuously)

#### Enhanced UI Features:
- **Modern Header**: Real-time connection status and live statistics
- **Enhanced Map Controls**: Radar toggle, reset view, station counter
- **Improved Station List**: Search, filtering, sorting, and status badges
- **Responsive Design**: Mobile-friendly layout with collapsible panels
- **Status Indicators**: Live connection status with animated indicators
- **Real-time Updates**: Live packet and station counts in header

#### System Integration Test Results:
- ✅ Enhanced Frontend: Accessible and responsive
- ✅ API Integration: 29 stations with complete data structure
- ✅ Real-time Connection: WebSocket receiving live messages
- ✅ Data Quality: All required fields present with proper validation
- ✅ Live Data Flow: Continuous APRS packet ingestion

#### Key Features Enhanced:
1. **Modern UI**: Professional styling with gradients and animations
2. **Real-time Status**: Live connection indicators and statistics
3. **Enhanced Search**: Improved station search and filtering
4. **Better Map Interface**: Professional map controls and information panels
5. **Responsive Layout**: Mobile-optimized design
6. **Status Badges**: Active/inactive station indicators

#### Next Development Phase:
- 🌡️ **Weather Radar Integration**: Implement Py-ART weather overlays
- 📊 **Analytics Dashboard**: Add station statistics and packet analysis
- 🔧 **Production Deployment**: Configure for production environment
- 📱 **Mobile App**: Consider native mobile application

#### Technical Stack Status:
- **Backend**: Django 5.2.4 + Django Channels + GeoDjango ✅
- **Frontend**: React + TypeScript + Leaflet (Enhanced UI) ✅
- **Database**: SQLite (development) with live data ✅
- **WebSocket**: Django Channels with real-time updates ✅
- **APRS**: Live connection to APRS-IS (noam.aprs2.net) ✅
- **UI/UX**: Modern responsive design with animations ✅

The APRSwx system now features a professional, modern interface with enhanced user experience!

## Features

### Core APRS Features
- **Packet Reception**: Receives APRS packets via Direwolf or APRS-IS
- **Packet Transmission**: Send APRS packets and beacons
- **Real-time Updates**: Live packet updates via WebSocket connections
- **Station Tracking**: Track and display APRS stations with position history

### Mapping & Visualization
- **Interactive Maps**: Leaflet-based mapping with zoom, pan, and layer controls
- **Emoji Station Markers**: Custom emoji markers based on station types (mobile, fixed, weather, etc.)
- **Weather Radar Overlays**: Real-time weather radar integration using Py-ART
- **Time-lapse Visualization**: Animated radar loops and station movement
- **Geospatial Analysis**: Advanced location-based queries and filtering

### Weather Integration
- **Radar Data Processing**: NEXRAD radar data processing with Py-ART
- **Weather Station Data**: Display weather station reports and conditions
- **Radar Overlays**: Transparent radar overlays on the map
- **Storm Tracking**: Track severe weather events and alerts

### Technical Architecture
- **Backend**: Django with GeoDjango for geospatial capabilities
- **Frontend**: React with Leaflet for interactive mapping
- **Real-time**: Django Channels for WebSocket connections
- **Database**: PostgreSQL with PostGIS for geospatial data
- **Packet Processing**: Direwolf integration for TNC functionality

## Project Structure

```
APRSwx/
├── backend/              # Django backend application
│   ├── aprs_server/      # Main Django project
│   ├── packets/          # APRS packet processing
│   ├── stations/         # Station management
│   ├── weather/          # Weather data integration
│   └── websockets/       # Real-time WebSocket handlers
├── frontend/             # React frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── maps/         # Map-related components
│   │   ├── websocket/    # WebSocket client
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
├── scripts/              # Utility scripts
└── docs/                 # Documentation
```

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL with PostGIS
- Direwolf (for packet TNC functionality)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Development
The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- WebSocket: ws://localhost:8000/ws/

## Configuration

### APRS Connection
Configure your APRS connection in `backend/aprs_server/settings.py`:
- **Direwolf**: Set up local TNC connection
- **APRS-IS**: Configure internet gateway connection

### Weather Radar
Configure weather radar data sources:
- NEXRAD data feeds
- Py-ART processing parameters
- Radar overlay refresh intervals

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Direwolf**: Excellent TNC software for packet radio
- **APRS-IS**: Internet gateway for APRS data
- **Py-ART**: Python ARM Radar Toolkit for weather radar processing
- **Leaflet**: Interactive mapping library
- **Django**: Web framework with excellent GIS support

## Current Project Status (Updated July 4, 2025)

### ✅ COMPLETED FEATURES

#### Backend (Django)
- ✅ Django project structure with apps: packets, stations, weather, websockets
- ✅ Database models for APRS packets, stations, weather data, and WebSocket management
- ✅ REST API endpoints for all major data types
- ✅ WebSocket consumers for real-time data streaming
- ✅ APRS packet parser with position, weather, and message parsing
- ✅ Database migrations created and applied
- ✅ Development server running on http://127.0.0.1:8000/

#### Frontend (React + TypeScript)
- ✅ React application with TypeScript setup
- ✅ Leaflet map integration with marker clustering
- ✅ Emoji-based station markers for different APRS symbols
- ✅ WebSocket context for real-time data management
- ✅ Component structure: APRSMap, StationList, WeatherPanel, MessagePanel
- ✅ TypeScript types for all APRS data structures
- ✅ Development server starting (React)

### 🚧 IN PROGRESS

#### Current Development Status
- ✅ **Backend Server**: Running successfully at http://127.0.0.1:8000/
- ✅ **Frontend Server**: Running successfully at http://localhost:3000/
- ✅ **API Integration**: REST API endpoints working with live data
- ✅ **Live APRS Data**: Connected to APRS-IS, receiving real packets
- ✅ **Database Population**: 14+ live stations, 32+ live packets
- ✅ **Range Filter**: 200km radius around Denver, CO (active area)
- 🔄 **WebSocket Integration**: Testing real-time communication
- 🔄 **Frontend Live Data**: Integrating live data with React components

### 📋 TODO - NEXT STEPS

#### Immediate Next Steps
1. **✅ COMPLETED: Fix TypeScript Compilation Errors**
   - ✅ Fixed NodeJS.Timeout type issues in WebSocketContext
   - ✅ Removed unused imports and variables
   - ✅ Fixed React Hook dependency warnings
   - ✅ All TypeScript errors resolved, build successful

2. **✅ COMPLETED: Backend API Integration**
   - ✅ Started Django backend server successfully
   - ✅ Fixed API serializer field mapping issues
   - ✅ Created test APRS data (4 stations, 3 packets)
   - ✅ Verified API endpoints return data correctly
   - ✅ Disabled authentication for development testing

3. **✅ COMPLETED: Live APRS Data Integration**
   - ✅ Successfully connected to APRS-IS server (rotate.aprs.net)
   - ✅ Implemented range filter for Denver area (200km radius)
   - ✅ Live APRS packets being received and processed
   - ✅ Database populated with real stations (14 stations, 32+ packets)
   - ✅ Fixed channel layer configuration for WebSocket support
   - ✅ APRS listener running in background processing live data

4. **🔄 CURRENT: WebSocket Real-time Testing**
   - 🔄 Test WebSocket connections between frontend and backend
   - 🔄 Verify real-time packet updates in browser
   - 🔄 Test station position updates on map
   - 🔄 Verify message and weather data streaming

2. **APRS Data Integration**
   - Test APRS packet listener command
   - Connect to APRS-IS for live data
   - Verify packet parsing and storage

3. **Features to Implement**
   - Weather radar overlay integration (Py-ART)
   - Message sending functionality
   - Station filtering and search
   - Map controls and settings
   - User authentication
   - Configuration management

4. **Polish and Testing**
   - Error handling and validation
   - Performance optimization
   - Unit and integration tests
   - Documentation completion

### 🔧 CURRENT ARCHITECTURE

#### Tech Stack
- **Backend**: Django 5.2 + Channels + REST Framework
- **Frontend**: React 19 + TypeScript + Leaflet
- **Database**: SQLite (ready for PostgreSQL/PostGIS upgrade)
- **Real-time**: WebSockets via Django Channels
- **Mapping**: Leaflet with react-leaflet
- **APRS**: Custom parser + APRS-IS connection

#### Key Components
- **Packet Processing**: `packets/management/commands/aprs_listener.py`
- **Real-time Updates**: WebSocket consumers in `websockets/consumers.py`
- **Map Interface**: `frontend/src/components/APRSMap.tsx`
- **Station Management**: `frontend/src/components/StationList.tsx`
- **Weather Display**: `frontend/src/components/WeatherPanel.tsx`
- **Messaging**: `frontend/src/components/MessagePanel.tsx`

### 🌐 DEVELOPMENT SERVERS
- **Backend API**: http://127.0.0.1:8000/
- **Frontend**: http://localhost:3000/ (starting)
- **WebSocket**: ws://127.0.0.1:8000/ws/

The application is now in a testable state with both backend and frontend servers running!
