@echo off
echo ========================================
echo Cattle Health System - Quick Setup
echo Using SQLite (No PostgreSQL needed!)
echo ========================================
echo.

REM Check Python version
echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo.
echo Step 1: Creating Python virtual environment...
cd backend
if exist venv (
    echo Virtual environment already exists, skipping...
) else (
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo.
echo Step 2: Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Step 3: Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Step 4: Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 5: Running database migrations...
python manage.py migrate
if %errorlevel% neq 0 (
    echo ERROR: Database migrations failed
    pause
    exit /b 1
)

echo.
echo Step 6: Creating superuser...
echo.
echo Please create an admin account:
python manage.py createsuperuser

echo.
echo ========================================
echo Setup Complete! 
echo ========================================
echo.
echo Your SQLite database is ready at: backend\db.sqlite3
echo.
echo To start the server:
echo   1. cd backend
echo   2. venv\Scripts\activate
echo   3. python manage.py runserver
echo.
echo Then visit:
echo   - API: http://localhost:8000
echo   - Admin: http://localhost:8000/admin
echo.
pause
