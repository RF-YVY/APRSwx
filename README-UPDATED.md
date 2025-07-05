# APRSwx - Full-Featured APRS Client

A comprehensive APRS (Automatic Packet Reporting System) software client featuring a Django backend and React frontend with real-time mapping, weather radar integration, and WebSocket communications.

## 🚀 Features

### Core APRS Functionality
- **Real-time APRS-IS Integration**: Connect to the APRS Internet Service for live packet data
- **Station Tracking**: Interactive map display of APRS stations with detailed information
- **Packet Processing**: Parse and display various APRS packet types (position, weather, messages)
- **Message Handling**: Send and receive APRS messages
- **Callsign Validation**: Built-in APRS callsign and passcode validation

### Weather Integration
- **NEXRAD Radar Overlay**: Real-time weather radar data using NOAA's NEXRAD system
- **Weather Alerts**: National Weather Service alerts with geospatial filtering
- **Lightning Detection**: Real-time lightning strike data from multiple sources
- **Weather Station Data**: Display weather observations from APRS weather stations

### User Interface
- **Interactive Mapping**: Leaflet-based map with station clustering and emoji markers
- **Real-time Updates**: WebSocket-powered live data streaming
- **Dark/Light Theme**: Toggle between light and dark modes
- **Responsive Design**: Works on desktop and mobile devices
- **Sidebar Navigation**: Collapsible sidebar with station list and controls

### Technical Features
- **GeoDjango Backend**: PostgreSQL with PostGIS for geospatial data storage
- **Django Channels**: WebSocket support for real-time communications
- **React Frontend**: Modern React with hooks and TypeScript
- **Persistent Settings**: User preferences saved in localStorage
- **Error Handling**: Comprehensive error handling and user feedback
- **Testing Suite**: Extensive test coverage for backend and frontend

## 🏗️ Architecture

### Backend (Django)
- **Django 5.2+** with GeoDjango for geospatial capabilities
- **Django Channels** for WebSocket real-time communications
- **PostgreSQL + PostGIS** for geospatial data storage
- **Django REST Framework** for API endpoints
- **Async views** for better performance
- **Background services** for APRS-IS connection management

### Frontend (React)
- **React 18+** with hooks and functional components
- **TypeScript** for type safety
- **Leaflet** for interactive mapping
- **WebSocket client** for real-time updates
- **Context API** for state management
- **Modern ES6+** features and best practices

### APRS Integration
- **APRS-IS Protocol**: Direct connection to APRS Internet Service
- **Packet Parsing**: Full APRS packet specification support
- **Filter System**: Advanced filtering for distance, station types, and data types
- **Callsign Validation**: APRS callsign format validation and passcode generation

## 📦 Installation

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 13+ with PostGIS extension (or SQLite for development)
- Git

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/RF-YVY/APRSwx.git
cd APRSwx

# Set up Python virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Set up database
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### Frontend Setup
```bash
# Install Node.js dependencies
cd frontend
npm install

# Start development server
npm start
```

### Database Configuration
For production, create a PostgreSQL database with PostGIS extension:
```sql
CREATE DATABASE aprswx;
CREATE EXTENSION postgis;
```

Update `backend/aprs_server/settings.py` with your database credentials.

## 🔧 Configuration

### APRS-IS Settings
1. **Amateur Radio License**: You need a valid amateur radio license to use APRS-IS
2. **Callsign**: Enter your amateur radio callsign
3. **Passcode**: Generate or enter your APRS-IS passcode
4. **Location**: Set your location for distance-based filtering
5. **Filters**: Configure station types and distance range

### Weather Services
- **NEXRAD Radar**: Automatically configured for US coverage
- **Weather Alerts**: Uses National Weather Service API
- **Lightning Data**: Multiple sources including Saratoga Weather

## 🚀 Usage

### Basic Setup
1. Open the application in your browser (`http://localhost:3000`)
2. Click the Settings button to configure your APRS settings
3. Enter your amateur radio callsign and passcode
4. Set your location (GPS, manual, or map click)
5. Configure your APRS-IS filters
6. Click "Connect to APRS-IS" to start receiving data

### Features Overview
- **Map View**: Interactive map showing APRS stations
- **Station List**: Sidebar with detailed station information
- **Weather Panel**: Current weather conditions and alerts
- **Message Panel**: APRS message handling
- **Radar Overlay**: Toggle weather radar on/off
- **Lightning Overlay**: Real-time lightning strikes

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
cd backend
python test_integration.py
python test_websocket_aprsis.py
```

## 📚 Documentation

### API Documentation
- REST API endpoints documented with Django REST Framework
- WebSocket API for real-time data
- Database schema with GeoDjango models

### Code Documentation
- Comprehensive docstrings for all functions
- TypeScript interfaces for type safety
- Inline comments for complex logic

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use TypeScript for all new frontend code
- Write tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **APRS Community**: For the APRS protocol and network
- **OpenStreetMap**: For map data
- **National Weather Service**: For weather data and alerts
- **Saratoga Weather**: For lightning data services
- **Amateur Radio Community**: For support and feedback

## 📞 Support

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: Check the wiki for detailed documentation
- **Community**: Join the amateur radio community discussions

## 🔄 Recent Updates

- ✅ Fixed WebSocket connection issues
- ✅ Removed all mock data and implemented real data sources
- ✅ Enhanced lightning data integration
- ✅ Improved UI/UX with sidebar controls
- ✅ Added comprehensive error handling
- ✅ Implemented persistent user settings

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Additional weather data sources
- [ ] Enhanced message handling
- [ ] Performance optimizations
- [ ] Advanced filtering options
- [ ] Plugin system for extensions

---

**Note**: This software is designed for licensed amateur radio operators. A valid amateur radio license is required to transmit on APRS frequencies. Always follow your local regulations and band plans.
