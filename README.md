# QA Enterprise Tracker - Real-Time Cloud App with MongoDB

A modern, real-time QA test case and bug tracking application with MongoDB backend and cloud deployment capabilities.

## Features

- **Real-Time Collaboration**: Live updates across all connected users using Socket.IO
- **MongoDB Backend**: Persistent data storage with MongoDB
- **Role-Based Access**: QA, Developer, and Admin roles with appropriate permissions
- **Test Case Management**: Create, edit, import/export test cases with full history tracking
- **Bug Tracking**: Automated bug creation from failed tests, escalation workflow
- **Audit Logging**: Complete audit trail of all system activities
- **Cloud Ready**: Deployable to any cloud platform (Heroku, AWS, Azure, etc.)

## Prerequisites

### MongoDB Setup

You need MongoDB running locally or a cloud MongoDB instance:

#### Option 1: Local MongoDB (Development)
1. **Install MongoDB Community Edition:**
   - Download from: https://www.mongodb.com/try/download/community
   - Follow installation instructions for your OS

2. **Start MongoDB:**
   ```bash
   # Windows (PowerShell as Administrator)
   mongod

   # Or install as service and start:
   net start MongoDB
   ```

3. **Default connection:** `mongodb://localhost:27017/qa_tracker`

#### Option 2: MongoDB Atlas (Cloud - Recommended for Production)
1. Create account at: https://www.mongodb.com/atlas
2. Create a free cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/qa_tracker`
4. Set environment variable: `MONGODB_URI=your_connection_string`

#### Option 3: Docker (Quick Setup)
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Quick Start

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start MongoDB** (if using local)
   ```bash
   mongod
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Open in Browser**
   ```
   http://localhost:3000
   ```

### Production Deployment

#### Environment Variables
Set these environment variables for production:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/qa_tracker
PORT=3000
```

#### Heroku (Recommended for Quick Setup)
1. Create a Heroku account and install Heroku CLI
2. Initialize Git repo if not already done:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. Create Heroku app:
   ```bash
   heroku create your-app-name
   ```
4. Set MongoDB URI:
   ```bash
   heroku config:set MONGODB_URI="your_mongodb_connection_string"
   ```
5. Deploy:
   ```bash
   git push heroku main
   ```
6. Access your app at: `https://your-app-name.herokuapp.com`

#### Other Cloud Platforms

**AWS EC2 + MongoDB Atlas:**
- Deploy EC2 instance
- Install Node.js
- Set MONGODB_URI environment variable
- Run: `npm start`

**Azure App Service:**
- Create Web App in Azure Portal
- Set Application Settings: `MONGODB_URI`
- Deploy via Git or ZIP upload

**Google Cloud Run:**
```bash
gcloud run deploy --source . --platform managed --region us-central1 --allow-unauthenticated --set-env-vars MONGODB_URI="your_connection_string"
```

## Usage

### Login Credentials
- **QA**: QA / QA@123
- **DEV**: DEV / DEV@123
- **ADMIN**: ADMIN / ADMIN@123

### Key Workflows

1. **QA Testing**: Create test cases, mark as Pass/Fail, auto-generate bugs
2. **Bug Fixing**: Dev marks bugs as fixed, QA retests and verifies
3. **Escalation**: Dev can escalate frontend bugs to backend team
4. **Reporting**: Export data as CSV, view audit logs

## Database Schema

### Collections
- **testcases**: Test case data with history
- **bugs**: Bug reports with timeline and notes
- **auditlogs**: System activity logs
- **counters**: Auto-increment counters for IDs

### Sample Data
The application automatically initializes with sample test cases and bugs on first run.

## Architecture

- **Frontend**: Vanilla JavaScript with modern CSS
- **Backend**: Node.js + Express + Socket.IO + MongoDB
- **Database**: MongoDB with Mongoose ODM
- **Real-Time**: WebSocket connections for live updates
- **Deployment**: Single-command cloud deployment

## API Endpoints

- `GET /` - Serve the main application
- WebSocket events for real-time data sync

## Development

### Adding New Features
1. Update MongoDB schemas in `server.js`
2. Add Socket.IO event handlers
3. Update frontend JavaScript
4. Test with multiple browser tabs

### Database Migrations
- Schema changes are handled automatically by Mongoose
- Default data is seeded on first run
- No manual migrations needed

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test locally with MongoDB
5. Submit pull request

## License

MIT License - feel free to use for your QA tracking needs!</content>
<parameter name="filePath">c:\Users\Anmol Shrivastava\Downloads\bugOS\README.md