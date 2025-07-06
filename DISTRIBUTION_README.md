# APRSwx - Production Distribution Package

## 🚀 APRSwx v1.0 - Complete APRS & Weather System

### 📦 Package Contents
- **Backend**: Django-based APRS server with PostgreSQL support
- **Frontend**: React-based web interface with real-time mapping
- **Features**: APRS packet processing, weather radar, real-time messaging
- **Fixed Issues**: Empty input fields, runtime error fixes

### 🔧 System Requirements
- **Python 3.8+** (Backend)
- **Node.js 16+** (Frontend development)
- **PostgreSQL 12+** (Database)
- **Redis** (WebSocket/Channels support)
- **Git** (Version control)

### ⚡ Quick Start (Production)

#### 1. Clone Repository
```bash
git clone https://github.com/RF-YVY/APRSwx.git
cd APRSwx
```

#### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### 3. Frontend (Pre-built)
The frontend is already compiled in the `frontend/build` directory.
Serve using any static web server:
```bash
cd frontend
npm install -g serve
serve -s build
```

#### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

### 🌟 Latest Updates (v1.0)

#### ✅ Empty Fields Implementation
- **Fixed**: Input fields now show empty with placeholder text
- **No more**: Pre-filled test data (W1AW, TEST, etc.)
- **Result**: Clean, professional user experience

#### ✅ Runtime Error Fix
- **Fixed**: `userLocation.latitude.toFixed is not a function`
- **Cause**: Backend was returning coordinates as strings
- **Solution**: API now returns numbers, frontend has type safety

#### ✅ Core Features
- **APRS Integration**: Connect to APRS-IS for real-time data
- **Interactive Mapping**: Leaflet-based map with station markers
- **Weather Radar**: NEXRAD integration with time-lapse animation
- **Real-time Updates**: WebSocket-based live data streaming
- **Settings Management**: User-friendly configuration interface

### 🔌 Configuration

#### APRS-IS Settings
- **Callsign**: Your amateur radio callsign
- **SSID**: Station ID (0-15)
- **Passcode**: Auto-generated based on callsign
- **Filters**: Distance, station types, weather data

#### TNC/Radio Interface
- **Connection Types**: Serial, USB, Network
- **Audio Configuration**: Input/output devices and levels
- **PTT Methods**: VOX, CAT, RTS/DTR, Rigctl

### 📊 Features Overview

#### Map Interface
- **Real-time Stations**: Live APRS station tracking
- **Weather Overlays**: Radar, lightning, weather alerts
- **Interactive Controls**: Click to select, zoom, pan
- **Station Details**: Comprehensive information panels

#### Data Processing
- **APRS Packets**: Decode and process all APRS message types
- **Weather Data**: Integrate weather station reports
- **Message Handling**: Send/receive APRS messages
- **History Tracking**: Station movement and packet history

#### User Interface
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Live data without page refresh
- **Settings Management**: Easy configuration interface
- **Error Handling**: Graceful error messages and recovery

### 🛠️ Development Setup

#### Backend Development
```bash
cd backend
pip install -r requirements.txt
python manage.py runserver
```

#### Frontend Development
```bash
cd frontend
npm install
npm start
```

### 🔒 Security Notes
- Configure proper authentication for production
- Use environment variables for sensitive settings
- Enable HTTPS for production deployments
- Implement rate limiting for API endpoints

### 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

### 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### 🆘 Support
- **Issues**: Report bugs on GitHub Issues
- **Documentation**: Check the README.md files
- **Community**: Join the amateur radio community forums

### 📈 Version History
- **v1.0**: Initial release with complete APRS and weather integration
- **v1.0.1**: Fixed empty fields and runtime errors
- **v1.0.2**: Enhanced user experience and stability improvements

---

**Built with ❤️ for the amateur radio community**
