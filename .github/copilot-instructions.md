<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# APRSwx Copilot Instructions

## Project Overview
This is a full-featured APRS (Automatic Packet Reporting System) software client with Django backend and React frontend. The project includes packet processing, real-time mapping, weather radar integration, and WebSocket communications.

## Architecture Guidelines

### Backend (Django)
- Use Django with GeoDjango for geospatial capabilities
- Implement Django Channels for WebSocket real-time communications
- Use PostgreSQL with PostGIS for geospatial data storage
- Follow Django best practices for models, views, and serializers
- Implement proper error handling and logging
- Use async views where appropriate for better performance

### Frontend (React)
- Use React with hooks and functional components
- Implement Leaflet for interactive mapping
- Use WebSocket connections for real-time updates
- Follow React best practices for component structure
- Implement proper state management (Context API or Redux if needed)
- Use TypeScript for type safety

### APRS Integration
- Implement Direwolf integration for TNC functionality
- Support APRS-IS internet gateway connections
- Parse APRS packets according to APRS specification
- Handle different packet types (position, weather, messages, etc.)
- Implement proper callsign validation and formatting

### Weather Radar
- Use Py-ART (Python ARM Radar Toolkit) for radar data processing
- Implement NEXRAD data fetching and processing
- Create radar overlay layers for the map
- Support time-lapse radar animation
- Handle different radar products (reflectivity, velocity, etc.)

### Mapping Features
- Use emoji markers for different station types
- Implement station clustering for better performance
- Support custom map layers and overlays
- Implement proper zoom level handling
- Add measurement tools and distance calculations

## Code Style Guidelines

### Python
- Follow PEP 8 style guidelines
- Use type hints for function parameters and return values
- Implement proper exception handling
- Use async/await for I/O operations
- Write comprehensive docstrings for functions and classes

### JavaScript/React
- Use ES6+ features and modern JavaScript
- Implement proper error boundaries
- Use meaningful component and variable names
- Follow React hooks best practices
- Implement proper prop validation

### Database
- Use GeoDjango models for geospatial data
- Implement proper database indexing
- Use database migrations for schema changes
- Implement data validation at the model level

## Security Considerations
- Implement proper authentication and authorization
- Validate all user inputs
- Use HTTPS for production deployments
- Implement rate limiting for API endpoints
- Sanitize data before database storage

## Performance Optimization
- Use database query optimization
- Implement proper caching strategies
- Use WebSocket connections efficiently
- Optimize map rendering performance
- Implement lazy loading for large datasets

## Testing
- Write unit tests for all critical functions
- Implement integration tests for API endpoints
- Test WebSocket connections and real-time features
- Test geospatial queries and calculations
- Write end-to-end tests for critical user workflows

## Documentation
- Maintain comprehensive API documentation
- Document configuration options
- Provide clear setup instructions
- Include examples for common use cases
- Document troubleshooting procedures
