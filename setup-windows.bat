@echo off
echo ========================================
echo Cattle Health System - Windows Setup
echo ========================================
echo.

REM Check Python version
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Step 1: Setting up Python virtual environment...
cd backend
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo.
echo Step 2: Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Step 3: Installing Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 4: Running database migrations...
python manage.py migrate
if %errorlevel% neq 0 (
    echo WARNING: Database migrations failed. Make sure PostgreSQL is running.
    echo You can run migrations later with: python manage.py migrate
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the development server:
echo   1. cd backend
echo   2. venv\Scripts\activate
echo   3. python manage.py runserver
echo.
echo Then visit: http://localhost:8000
echo.
pause
