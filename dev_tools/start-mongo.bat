@echo off
echo 🚀 QA Enterprise Tracker - MongoDB Setup Helper
echo.

echo Checking if MongoDB is running locally...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MongoDB not found locally.
    echo.
    echo 📋 MongoDB Setup Options:
    echo.
    echo 1. Install MongoDB Community Edition:
    echo    Download from: https://www.mongodb.com/try/download/community
    echo.
    echo 2. Use MongoDB Atlas (Cloud - Recommended):
    echo    - Sign up at: https://www.mongodb.com/atlas
    echo    - Create free cluster
    echo    - Get connection string
    echo    - Set environment variable: MONGODB_URI=your_connection_string
    echo.
    echo 3. Use Docker:
    echo    docker run -d -p 27017:27017 --name mongodb mongo:latest
    echo.
    pause
    exit /b 1
)

echo ✅ MongoDB found! Starting MongoDB service...
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting mongod directly...
    start "MongoDB" mongod --dbpath "C:\data\db" --logpath "C:\data\log\mongod.log"
    timeout /t 3 /nobreak >nul
)

echo.
echo ✅ MongoDB should now be running on mongodb://localhost:27017
echo.
echo Next steps:
echo 1. Keep this window open (MongoDB is running)
echo 2. Open new terminal and run: npm start
echo 3. Open browser to: http://localhost:3000
echo.
echo Press any key to exit...
pause >nul